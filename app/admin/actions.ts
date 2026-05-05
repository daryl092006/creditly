'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getCurrentUserRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendUserEmail } from '@/utils/email-service'

export async function getSignedProofUrl(path: string, bucket: string) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600) // 1 hour validity

    if (error || !data) {
        return { error: 'Impossible de générer le lien sécurisé.' }
    }
    return { url: data.signedUrl }
}

async function safeSendUserEmail(type: any, data: any) {
    try {
        await sendUserEmail(type, data)
    } catch (e) {
        console.error("Failed to send user email:", e)
        // Don't throw, so we don't block the main action
    }
}

export async function updateKycStatus(submissionId: string, status: 'approved' | 'rejected', notes?: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_kyc', 'superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé." }
    }

    const supabase = await createAdminClient()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    const adminId = user?.id

    if (!adminId) {
        console.warn("KYC Update: adminId is null. Actions might be recorded as 'System'.")
    }

    // 1. Pre-Fetch for Deletion (if rejected)
    const { data: currentData } = await supabase.from('kyc_submissions').select('*').eq('id', submissionId).single()

    const updateData: any = {
        status,
        admin_notes: notes,
        admin_id: adminId,
        reviewed_at: new Date().toISOString()
    }

    if (status === 'rejected' && currentData) {
        const adminSupabase = await createAdminClient()
        const filesToDelete = []

        // Ensure we only try to delete if we have valid paths
        if (currentData.id_card_url && typeof currentData.id_card_url === 'string') filesToDelete.push(currentData.id_card_url)
        if (currentData.selfie_url && typeof currentData.selfie_url === 'string') filesToDelete.push(currentData.selfie_url)
        if (currentData.proof_of_residence_url && typeof currentData.proof_of_residence_url === 'string') filesToDelete.push(currentData.proof_of_residence_url)

        if (filesToDelete.length > 0) {
            try {
                const { error: deleteError } = await adminSupabase.storage.from('kyc-documents').remove(filesToDelete)
                if (deleteError) {
                    console.error("Erreur lors de la suppression des fichiers (non bloquant):", deleteError)
                }
            } catch (e) {
                console.error("Exception lors de la suppression des fichiers (non bloquant):", e)
            }
        }

        // Clear references - REMOVED to avoid NOT NULL constraint violation
        // We keep the old URLs in DB even if files are deleted. 
        // Identify them as deleted? No, just leave them. The status 'rejected' is enough.
    }

    // 2. Perform Update
    const { error } = await supabase
        .from('kyc_submissions')
        .update(updateData)
        .eq('id', submissionId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    // 3. Auto-Activation du compte
    if (status === 'approved' && currentData?.user_id) {
        await supabase.from('users').update({ is_account_active: true }).eq('id', currentData.user_id)
    } else if (status === 'rejected' && currentData?.user_id) {
        await supabase.from('users').update({ is_account_active: false }).eq('id', currentData.user_id)
    }

    // 4. Fetch User for Notification (Safe Mode)
    if (currentData?.user_id) {
        const { data: userData } = await supabase.from('users').select('email, prenom, nom').eq('id', currentData.user_id).single()

        if (userData?.email) {
            const userName = `${userData.prenom} ${userData.nom}`;
            if (status === 'rejected') {
                await safeSendUserEmail('KYC_REJECTED', { email: userData.email, name: userName, details: notes })
            } else if (status === 'approved') {
                await safeSendUserEmail('KYC_APPROVED', { email: userData.email, name: userName })
            }
        }
    }

    revalidatePath('/admin/kyc')
    return { success: true }
}

export async function activateUserAccount(userId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_kyc', 'superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé : Vous n'avez pas les droits d'activation." }
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
        .from('users')
        .update({ is_account_active: true })
        .eq('id', userId)
        .select()

    if (error) return { error: `Erreur d'activation : ${error.message}` }

    if (!data || data.length === 0) {
        return { error: "Erreur : Impossible d'activer le compte. Utilisateur introuvable ou mise à jour échouée." }
    }

    // Notify User
    const userData = data[0]
    if (userData.email) {
        await safeSendUserEmail('KYC_APPROVED', {
            email: userData.email,
            name: `${userData.prenom} ${userData.nom}`
        })
    }

    revalidatePath('/admin/kyc')
    return { success: true }
}

export async function deactivateUserAccount(userId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_kyc', 'superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé : Vous n'avez pas les droits de modification." }
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('users')
        .update({ is_account_active: false })
        .eq('id', userId)

    if (error) return { error: `Erreur de désactivation : ${error.message}` }

    revalidatePath('/admin/kyc')
    return { success: true }
}

export async function updateLoanStatus(loanId: string, status: 'approved' | 'rejected' | 'active' | 'paid', reason?: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_loan', 'superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé. Réservé aux administrateurs autorisés." }
    }

    const supabase = await createAdminClient()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    const adminId = user?.id || null

    // Initial fetch for validation checks (capacity, logic)
    const { data: loan, error: fetchError } = await supabase.from('prets').select('*, snapshot:subscription_snapshot_id(*)').eq('id', loanId).single()

    if (fetchError || !loan) return { error: 'Prêt introuvable' }

    const updates: Record<string, string | number | boolean | null> = {
        status,
        admin_decision_date: new Date().toISOString(),
        admin_id: adminId
    }

    if (status === 'approved' || status === 'active') {
        if (loan.snapshot) {
            const { data: activeLoans } = await supabase
                .from('prets')
                .select('amount')
                .eq('user_id', loan.user_id)
                .in('status', ['active', 'overdue'])
                .neq('id', loanId)

            const currentDebt = activeLoans?.reduce((sum, l) => sum + Number(l.amount), 0) || 0
            const maxAmount = loan.snapshot.max_loan_amount

            if (currentDebt + Number(loan.amount) > maxAmount) {
                const available = Math.max(0, maxAmount - currentDebt)
                return { error: `Impossible d'approuver : Cela dépasserait le plafond (${maxAmount} F). Disponible : ${available} F.` }
            }

            // 2. Decouple due_date from subscription (New Rule: Approved Date + Repayment Delay)
            const { data: activeSub } = await supabase
                .from('user_subscriptions')
                .select('id')
                .eq('user_id', loan.user_id)
                .eq('status', 'active')
                .gt('end_date', new Date().toISOString())
                .maybeSingle()

            if (!activeSub) {
                return { error: "L'utilisateur n'a pas d'abonnement actif pour valider ce prêt." }
            }

            const delayDays = loan.snapshot?.repayment_delay_days || 7;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + delayDays);

            updates.due_date = dueDate.toISOString();
            updates.status = 'active'

            // CORRECTIF : Écrire service_fee dans la DB à l'approbation
            // Sans ça, service_fee reste null en DB et l'UI affiche un montant incorrect
            // alors que le backend calcule en ajoutant 500 via fallback → incohérence
            const fee = Number(loan.service_fee) || (new Date(loan.created_at!) >= new Date('2026-03-09') ? 500 : 0)
            if (!loan.service_fee && fee > 0) {
                updates.service_fee = fee
            }

            // --- COMMISSION SHARING LOGIC ---
            // 1. Get KYC Admin for this user
            const { data: kyc } = await supabase
                .from('kyc_submissions')
                .select('admin_id')
                .eq('user_id', loan.user_id)
                .single()

            const kycAdminId = kyc?.admin_id
            const loanAdminId = adminId

            if (fee > 0 && (kycAdminId || loanAdminId)) {
                // Commission = 20% du service_fee par action admin
                // KYC admin = 20%, Loan admin = 20%, Repayment admin = 20%
                // La plateforme conserve les 40% restants
                const kycShare = Math.round(fee * 0.2)   // 20% du frais
                const loanShare = Math.round(fee * 0.2)  // 20% du frais
                const commissions = []

                if (kycAdminId && loanAdminId && kycAdminId === loanAdminId) {
                    // Une seule personne a fait KYC + Prêt → elle touche 40%
                    commissions.push({
                        loan_id: loanId,
                        admin_id: kycAdminId,
                        amount: kycShare + loanShare,
                        type: 'kyc_and_loan_reward'
                    })
                } else {
                    if (kycAdminId) {
                        commissions.push({
                            loan_id: loanId,
                            admin_id: kycAdminId,
                            amount: kycShare,
                            type: 'kyc_reward'
                        })
                    }
                    if (loanAdminId) {
                        commissions.push({
                            loan_id: loanId,
                            admin_id: loanAdminId,
                            amount: loanShare,
                            type: 'loan_reward'
                        })
                    }
                }

                if (commissions.length > 0) {
                    await supabase.from('admin_commissions').insert(commissions)
                }
            }
            // --- END COMMISSION SHARING ---
        }
    }

    if (reason) updates.rejection_reason = reason

    const { error: updateError } = await supabase
        .from('prets')
        .update(updates)
        .eq('id', loanId)

    if (updateError) return { error: getUserFriendlyErrorMessage(updateError) }

    // Notify User safely
    const { data: userData } = await supabase.from('users').select('email, prenom, nom').eq('id', loan.user_id).single()
    if (userData?.email) {
        const userName = `${userData.prenom} ${userData.nom}`
        if (status === 'rejected') {
            await safeSendUserEmail('LOAN_REJECTED', { email: userData.email, name: userName, details: reason })
        } else if (status === 'active' || status === 'approved') {
            await safeSendUserEmail('LOAN_ACTIVE', { email: userData.email, name: userName, amount: Number(loan.amount) })
        }
    }

    revalidatePath('/admin/loans')
    revalidatePath('/client/dashboard')
    revalidatePath('/client/loans')
    revalidatePath('/client/loans/request')
    return { success: true }
}

export async function updateRepaymentStatus(repaymentId: string, status: 'verified' | 'rejected') {
    const role = await getCurrentUserRole()
    if (!role || !['admin_repayment', 'superadmin', 'admin_comptable', 'owner'].includes(role)) {
        return { error: "Accès refusé." }
    }

    const supabase = await createAdminClient()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    const adminId = user?.id

    // 1. Fetch details FIRST to check current status
    const { data: repayment, error: fetchError } = await supabase.from('remboursements').select('*').eq('id', repaymentId).single()

    if (fetchError || !repayment) return { error: 'Remboursement introuvable' }

    // SÉCURITÉ : Ne pas traiter un remboursement déjà validé ou rejeté
    if (repayment.status !== 'pending') {
        return { error: "Ce remboursement a déjà été traité (validé ou rejeté)." }
    }

    // 2. Perform DB Update
    const { error: repError } = await supabase
        .from('remboursements')
        .update({
            status,
            validated_at: new Date().toISOString(),
            admin_id: adminId
        })
        .eq('id', repaymentId)

    if (repError) return { error: getUserFriendlyErrorMessage(repError) }

    // 3. Update Loan Balance if Verified
    if (status === 'verified') {
        const amountVerified = Number(repayment.amount_declared) || 0
        const isExtensionRequest = repayment.proof_url?.includes('extension_')
        
        const { data: loan } = await supabase.from('prets').select('id, amount, amount_paid, service_fee, extension_fee, is_extended, created_at, status, due_date').eq('id', repayment.loan_id).single()

        if (loan) {
            const { calculateLoanDebt } = await import('@/utils/loan-utils')
            const { totalDebt, fee } = calculateLoanDebt(loan as any)
            const currentPaid = Number(loan.amount_paid) || 0

            // SÉCURITÉ : Pour un remboursement classique, on vérifie qu'il ne dépasse pas la dette
            if (!isExtensionRequest && amountVerified > totalDebt + 1) {
                return { error: `Validation refusée : Le reçu (${amountVerified.toLocaleString('fr-FR')} F) dépasse la dette totale actuelle (${totalDebt.toLocaleString('fr-FR')} F). Rejeter le reçu.` }
            }

            const newTotalPaid = currentPaid + amountVerified
            const isFullyPaid = !isExtensionRequest && (amountVerified >= totalDebt)

            // Préparation des mises à jour du prêt
            const loanUpdates: any = {
                amount_paid: newTotalPaid,
                ...(isFullyPaid ? { status: 'paid' } : {})
            }

            // LOGIQUE SPÉCIFIQUE EXTENSION
            if (isExtensionRequest) {
                const currentDueDate = new Date(loan.due_date || new Date())
                const newDueDate = new Date(currentDueDate)
                newDueDate.setDate(newDueDate.getDate() + 5)
                
                loanUpdates.due_date = newDueDate.toISOString()
                loanUpdates.is_extended = true
                loanUpdates.extension_fee = (Number(loan.extension_fee) || 0) + amountVerified
                loanUpdates.extension_date = new Date().toISOString()
            }

            // Mettre à jour le prêt ET le remboursement
            await Promise.all([
                supabase
                    .from('prets')
                    .update(loanUpdates)
                    .eq('id', repayment.loan_id),
                supabase
                    .from('remboursements')
                    .update({ surplus_amount: isExtensionRequest ? 0 : Math.max(0, amountVerified - totalDebt) })
                    .eq('id', repaymentId)
            ])

            // --- REPAYMENT COMMISSION (Only if normal repayment and fee was charged) ---
            if (!isExtensionRequest && fee > 0) { 
                const repaymentShare = Math.round(fee * 0.2)
                const { count } = await supabase
                    .from('admin_commissions')
                    .select('*', { count: 'exact', head: true })
                    .eq('loan_id', loan.id)
                    .eq('type', 'repayment_reward')

                if ((count || 0) === 0 && adminId) {
                    await supabase.from('admin_commissions').insert({
                        loan_id: loan.id,
                        admin_id: adminId,
                        amount: repaymentShare,
                        type: 'repayment_reward',
                        created_at: new Date().toISOString()
                    })
                }
            }
        }
    }

    // 4. Notify User safely
    const { data: userData } = await supabase.from('users').select('email, prenom, nom').eq('id', repayment.user_id).single()
    if (userData?.email) {
        const userName = `${userData.prenom} ${userData.nom}`;
        if (status === 'verified') {
            await safeSendUserEmail('REPAYMENT_VALIDATED', { email: userData.email, name: userName, amount: repayment.amount_declared })
        } else if (status === 'rejected') {
            await safeSendUserEmail('REPAYMENT_REJECTED', { email: userData.email, name: userName })
        }
    }

    revalidatePath('/admin/repayments')
    revalidatePath('/admin/loans')
    revalidatePath('/client/dashboard')
    revalidatePath('/client/loans')
    revalidatePath('/client/loans/repayment')
    revalidatePath('/client/subscriptions')
    return { success: true }
}

export async function deleteRepayment(repaymentId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_repayment', 'superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé. Seuls les admins remboursement, superadmin et owner peuvent supprimer un remboursement." }
    }

    const supabase = await createAdminClient()

    // 1. Fetch the repayment + loan info before any deletion
    const { data: repayment, error: fetchError } = await supabase
        .from('remboursements')
        .select('*')
        .eq('id', repaymentId)
        .single()

    if (fetchError || !repayment) {
        return { error: "Remboursement introuvable." }
    }

    // 2. If the repayment was verified, reverse its impact on the loan
    if (repayment.status === 'verified') {
        const { data: loan } = await supabase
            .from('prets')
            .select('amount, amount_paid, service_fee, status')
            .eq('id', repayment.loan_id)
            .single()

        if (loan) {
            const amountApplied = repayment.amount_declared
            const reversedPaid = Math.max(0, Number(loan.amount_paid) - amountApplied)
            const totalLoanAmount = Number(loan.amount) + (Number(loan.service_fee) || 0)

            // Revert loan status from 'paid' back to 'active' if necessary
            const loanWasPaid = loan.status === 'paid'
            const revertedStatus = loanWasPaid ? 'active' : undefined

            await supabase
                .from('prets')
                .update({
                    amount_paid: reversedPaid,
                    ...(revertedStatus ? { status: revertedStatus } : {})
                })
                .eq('id', repayment.loan_id)

            // 3. Remove the repayment_reward commission related to this repayment (if exists)
            // We remove the commission only if it can be tied back to this repayment's loan and type
            // (commission is per-loan, not per-repayment, so only delete if this was the only verified repayment)
            const { count: otherVerifiedCount } = await supabase
                .from('remboursements')
                .select('*', { count: 'exact', head: true })
                .eq('loan_id', repayment.loan_id)
                .eq('status', 'verified')
                .neq('id', repaymentId)

            if ((otherVerifiedCount || 0) === 0) {
                // This was the only verified repayment → remove the commission
                await supabase
                    .from('admin_commissions')
                    .delete()
                    .eq('loan_id', repayment.loan_id)
                    .eq('type', 'repayment_reward')
            }
        }
    }

    // 4. Delete the proof file from storage (non-blocking)
    if (repayment.proof_url && !repayment.proof_url.includes('system/')) {
        try {
            await supabase.storage.from('repayment-proofs').remove([repayment.proof_url])
        } catch (e) {
            console.error('Storage delete error (non-blocking):', e)
        }
    }

    // 5. Delete the repayment row
    const { error: deleteError } = await supabase
        .from('remboursements')
        .delete()
        .eq('id', repaymentId)

    if (deleteError) return { error: `Erreur lors de la suppression : ${deleteError.message}` }

    revalidatePath('/admin/repayments')
    revalidatePath('/admin/loans')
    revalidatePath('/client/dashboard')
    revalidatePath('/client/loans')
    return { success: true }
}

export async function activateSubscription(subId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'owner'].includes(role)) {
        return { error: `Accès refusé. Seul le Super Admin ou le Propriétaire peut activer des abonnements.` }
    }

    const supabase = await createAdminClient()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    const adminId = user?.id

    const { data: currentSub } = await supabase.from('user_subscriptions').select('user_id, snapshot_duration_days').eq('id', subId).single()

    if (currentSub) {
        // Expire all other active subscriptions for this user
        await supabase
            .from('user_subscriptions')
            .update({ status: 'expired', is_active: false })
            .eq('user_id', currentSub.user_id)
            .eq('status', 'active')
            .neq('id', subId)
    }

    const duration = currentSub?.snapshot_duration_days || 30
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + duration)

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            is_active: true,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            rejection_reason: null,
            admin_id: adminId,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', subId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    // Safe Notification
    const { data: sub } = await supabase.from('user_subscriptions').select('user_id, plan:abonnements(name)').eq('id', subId).single()
    if (sub?.user_id) {
        const { data: userData } = await supabase.from('users').select('email, prenom, nom').eq('id', sub.user_id).single()
        if (userData?.email) {
            // Check if we have a template for this? Yes SUBSCRIPTION.
            await safeSendUserEmail('SUBSCRIPTION', {
                email: userData.email,
                name: `${userData.prenom} ${userData.nom}`,
                planName: (sub.plan as any)?.name || 'Abonnement'
            })
        }
    }

    revalidatePath('/admin/super')
    revalidatePath('/admin/super/subscriptions')
    revalidatePath('/client/dashboard')
    revalidatePath('/client/subscriptions')
    revalidatePath('/client/loans/request')
    return { success: true }
}

export async function rejectSubscription(subId: string, reason: string) {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé." }
    }

    const supabase = await createAdminClient()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    const adminId = user?.id

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            status: 'rejected',
            is_active: false,
            rejection_reason: reason,
            admin_id: adminId,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', subId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    // NOTIFY USER OF REJECTION
    const { sendUserEmail } = await import('@/utils/email-service')
    const { data: sub } = await supabase.from('user_subscriptions').select('user_id').eq('id', subId).single()
    if (sub) {
        const { data: userData } = await supabase.from('users').select('email, prenom, nom').eq('id', sub.user_id).single()
        if (userData?.email) {
            await sendUserEmail('SUBSCRIPTION_REJECTED', {
                email: userData.email,
                name: `${userData.prenom} ${userData.nom}`,
                details: reason
            })
        }
    }

    revalidatePath('/admin/super/subscriptions')
    revalidatePath('/client/dashboard')
    revalidatePath('/client/subscriptions')
    revalidatePath('/client/loans/request')
    return { success: true }
}

export async function deleteUserSecurely(userId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'owner'].includes(role)) {
        return { error: "Accès refusé. Action réservée à la haute direction." }
    }

    const { createAdminClient } = await import('@/utils/supabase/server')
    const supabase = await createAdminClient()

    try {
        // 1. Fetch KYC to clean storage & files
        const { data: kyc } = await supabase.from('kyc_submissions').select('id_card_url, selfie_url, proof_of_residence_url').eq('user_id', userId).single()

        if (kyc) {
            const filesToDelete = [kyc.id_card_url, kyc.selfie_url, kyc.proof_of_residence_url].filter(url => url && typeof url === 'string') as string[]
            if (filesToDelete.length > 0) {
                const { error: storageError } = await supabase.storage.from('kyc-documents').remove(filesToDelete)
                if (storageError) console.error('Storage Delete Error', storageError)
            }
            // Delete KYC Row
            await supabase.from('kyc_submissions').delete().eq('user_id', userId)
        }

        // 2. Anonymize Public Profile first
        const timestamp = Date.now()
        const anonymizedEmail = `deleted_${userId.slice(0, 8)}_${timestamp}@creditly.anonymized`

        const { error: publicError } = await supabase
            .from('users')
            .update({
                email: anonymizedEmail,
                nom: 'Utilisateur',
                prenom: 'Supprimé',
                whatsapp: '00000000',
                is_account_active: false
            })
            .eq('id', userId)

        if (publicError) throw new Error(`Public update failed: ${publicError.message}`)

        // 3. Scramble Auth User (Prevent Login)
        // We assume createAdminClient has service_role key to manage auth users
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
            email: anonymizedEmail,
            email_confirm: true,
            password: crypto.randomUUID(),
            user_metadata: { nom: 'Utilisateur', prenom: 'Supprimé' },
            ban_duration: '876000h'
        })

        if (authError) throw new Error(`Auth update failed: ${authError.message}`)

        revalidatePath('/admin/super')
        return { success: true }

    } catch (e: any) {
        console.error("Delete User Error:", e)
        return { error: e.message || "Erreur lors de la suppression sécurisée." }
    }
}

export async function searchUsersWithNameOrEmail(query: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable', 'owner'].includes(role)) {
        return []
    }

    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: users } = await supabase
        .from('users')
        .select('id, nom, prenom, email')
        .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

    return users || []
}

export async function getActiveLoansForUser(userId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_repayment', 'superadmin', 'admin_comptable', 'owner'].includes(role)) {
        return []
    }

    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: loans } = await supabase
        .from('prets')
        .select('*, plan:subscription_snapshot_id(name)')
        .eq('user_id', userId)
        .in('status', ['active', 'overdue'])

    return loans || []
}

export async function createDirectRepayment(formData: FormData) {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'admin_comptable', 'owner', 'admin_loan', 'admin_repayment'].includes(role)) {
        return { error: "Accès refusé. Action réservée aux administrateurs autorisés." }
    }

    const { createAdminClient, createClient: createClientAuth } = await import('@/utils/supabase/server')
    const supabase = await createAdminClient()
    const supabaseUser = await createClientAuth()
    const { data: { user: adminUser } } = await supabaseUser.auth.getUser()
    const uId = adminUser?.id

    const loanId = formData.get('loanId') as string
    const userId = formData.get('userId') as string
    const numAmount = Number(formData.get('amount'))
    const proofFile = formData.get('proof') as File | null

    if (!loanId || !userId || !numAmount) {
        return { error: "Informations manquantes." }
    }

    // 1. Upload Proof if exists
    let proofPath = "system/admin-direct-payment.png"
    if (proofFile && proofFile.size > 0) {
        const fileExt = proofFile.name.split('.').pop()
        const fileName = `${userId}/admin_direct_${loanId}_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
            .from('repayment-proofs')
            .upload(fileName, proofFile)

        if (uploadError) return { error: "Erreur lors de l'upload de la preuve." }
        proofPath = fileName
    }

    // 2. Calculate Surplus before creating repayment
    const { data: loan } = await supabase.from('prets').select('amount, amount_paid, service_fee, created_at').eq('id', loanId).single()
    if (!loan) return { error: "Prêt introuvable." }

    // Validation du montant (Calcul incluant pénalités)
    const { calculateLoanDebt } = await import('@/utils/loan-utils')
    const { totalDebt, fee } = calculateLoanDebt(loan as any)

    if (numAmount > totalDebt + 1) {
        return { error: `Le montant saisi (${numAmount.toLocaleString('fr-FR')} F) dépasse le solde restant (Base + Pénalités: ${totalDebt.toLocaleString('fr-FR')} F).` }
    }

    const currentPaid = Number(loan.amount_paid) || 0
    let surplusGenerated = Math.max(0, numAmount - totalDebt)

    const { data: repayment, error: repError } = await supabase
        .from('remboursements')
        .insert({
            loan_id: loanId,
            user_id: userId,
            amount_declared: numAmount,
            proof_url: 'direct_admin_repayment',
            status: 'verified',
            admin_id: uId,
            validated_at: new Date().toISOString(),
            surplus_amount: surplusGenerated
        })
        .select()
        .single()

    if (repError) return { error: getUserFriendlyErrorMessage(repError) }

    // 3. Update Balance
    const newTotalPaid = currentPaid + numAmount
    const isFullyPaid = numAmount >= totalDebt

    await supabase
        .from('prets')
        .update({
            amount_paid: newTotalPaid,
            ...(isFullyPaid ? { status: 'paid' } : {})
        })
        .eq('id', loanId)

    // Note: On ne crédite plus le solde surplus de l'utilisateur ici non plus (considéré comme pénalité).

    // --- REPAYMENT COMMISSION (Direct) (Only if fee was charged) ---
    // L'admin remboursement touche 20% du service_fee du prêt
    const directRepaymentShare = Math.round(fee * 0.2)
    if (fee > 0) {
        const { count } = await supabase
            .from('admin_commissions')
            .select('*', { count: 'exact', head: true })
            .eq('loan_id', loanId)
            .eq('type', 'repayment_reward')

        if ((count || 0) === 0 && uId) {
            await supabase.from('admin_commissions').insert({
                loan_id: loanId,
                admin_id: uId,
                amount: directRepaymentShare,
                type: 'repayment_reward',
                created_at: new Date().toISOString()
            })
        }
    }
    // --- END REPAYMENT COMMISSION ---

    revalidatePath('/admin/repayments')
    revalidatePath('/admin/loans')
    revalidatePath('/client/dashboard')
    revalidatePath('/client/loans')

    return { success: true }
}

// --- ADMIN WITHDRAWALS ACTIONS ---

export async function requestWithdrawal(amount: number, method: string, details: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminId = user?.id

    if (!adminId) return { error: "Non authentifié." }

    // Check Balance - REALIZED Gains ONLY (from Paid Loans)
    const { data: commissions } = await supabase
        .from('admin_commissions')
        .select('amount, loan:loan_id(status)')
        .eq('admin_id', adminId)

    const realizedComms = commissions?.filter((c: any) =>
        c.loan?.status === 'paid' || c.type === 'repayment_reward' // Repayment reward is earned instantly as the money just came in
    ).reduce((acc, c) => acc + Number(c.amount), 0) || 0

    const { data: pendingWithdrawals } = await supabase
        .from('admin_withdrawals')
        .select('amount')
        .eq('admin_id', adminId)
        .in('status', ['pending', 'approved'])

    const totalWithdrawn = pendingWithdrawals?.reduce((acc, w) => acc + Number(w.amount), 0) || 0
    const balance = realizedComms - totalWithdrawn

    if (amount > balance) {
        return { error: `Solde retirable insuffisant. Seuls les dossiers ENTIÈREMENT REMBOURSÉS génèrent des gains retirables. Disponible : ${balance.toLocaleString('fr-FR')} F.` }
    }

    const { error } = await supabase
        .from('admin_withdrawals')
        .insert({
            admin_id: adminId,
            amount,
            method,
            payment_details: details,
            status: 'pending'
        })

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    revalidatePath('/admin/profile')
    revalidatePath('/admin/super')
    return { success: true }
}

export async function updateWithdrawalStatus(withdrawalId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'admin_comptable', 'owner'].includes(role)) {
        return { error: "Accès refusé." }
    }

    const supabaseAdmin = await createAdminClient()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    const adminId = user?.id

    const { error } = await supabaseAdmin
        .from('admin_withdrawals')
        .update({
            status,
            processed_at: new Date().toISOString(),
            processed_by: adminId,
            rejection_reason: rejectionReason
        })
        .eq('id', withdrawalId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    revalidatePath('/admin/profile')
    revalidatePath('/admin/super')
    return { success: true }
}

export async function sendEmailToClient(userId: string, subject: string, message: string) {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'owner', 'admin_loan', 'admin_repayment', 'admin_kyc'].includes(role)) {
        return { error: "Accès refusé." }
    }

    if (!subject || !message) {
        return { error: "L'objet et le message sont requis." }
    }

    const supabase = await createAdminClient()
    const { data: userData } = await supabase.from('users').select('email, nom, prenom').eq('id', userId).single()

    if (!userData || !userData.email) {
        return { error: "Impossible de trouver l'adresse email de ce client." }
    }

    const { sendDirectClientEmail } = await import('@/utils/email-service')
    const res = await sendDirectClientEmail(userData.email, `${userData.prenom} ${userData.nom}`, subject, message)

    if (res?.error) {
        return { error: res.error }
    }

    return { success: true }
}
