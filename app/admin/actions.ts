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
    const supabase = await createClient()
    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id

    // 1. Perform Update
    const { error } = await supabase
        .from('kyc_submissions')
        .update({
            status,
            admin_notes: notes,
            admin_id: adminId,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    // 2. Fetch User for Notification (Safe Mode)
    const { data: submission } = await supabase.from('kyc_submissions').select('user_id').eq('id', submissionId).single()
    if (submission?.user_id) {
        const { data: userData } = await supabase.from('users').select('email, prenom, nom').eq('id', submission.user_id).single()

        if (userData?.email) {
            const userName = `${userData.prenom} ${userData.nom}`;
            if (status === 'rejected') {
                await safeSendUserEmail('KYC_REJECTED', { email: userData.email, name: userName, details: notes })
            }
        }
    }

    revalidatePath('/admin/kyc')
    return { success: true }
}

export async function activateUserAccount(userId: string) {
    const role = await getCurrentUserRole()
    if (!role || !['admin_kyc', 'superadmin'].includes(role)) {
        return { error: "Accès refusé : Vous n'avez pas les droits d'activation." }
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
        .from('users')
        .update({ is_account_active: true })
        .eq('id', userId)
        .select()

    if (error) return { error: getUserFriendlyErrorMessage(error) }

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

export async function updateLoanStatus(loanId: string, status: 'approved' | 'rejected' | 'active' | 'paid', reason?: string) {
    const supabase = await createClient()

    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id || null

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

            const days = loan.snapshot.repayment_delay_days || 7
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + days)
            updates.due_date = dueDate.toISOString()
            updates.status = 'active'
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
    return { success: true }
}

export async function updateRepaymentStatus(repaymentId: string, status: 'verified' | 'rejected') {
    const supabase = await createClient()

    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id

    // 1. Update Repayment
    const { error: repError } = await supabase
        .from('remboursements')
        .update({
            status,
            validated_at: new Date().toISOString(),
            admin_id: adminId
        })
        .eq('id', repaymentId)

    if (repError) return { error: getUserFriendlyErrorMessage(repError) }

    // 2. Fetch details for Logic & Notification
    const { data: repayment } = await supabase.from('remboursements').select('*').eq('id', repaymentId).single()
    if (!repayment) return { success: true } // Should not happen, but safe

    // 3. Update Loan Balance if Verified
    if (status === 'verified') {
        const amountVerified = repayment.amount_declared
        const { data: loan } = await supabase.from('prets').select('amount, amount_paid').eq('id', repayment.loan_id).single()

        if (loan) {
            const currentPaid = Number(loan.amount_paid) || 0
            const newTotalPaid = currentPaid + amountVerified
            const isFullyPaid = newTotalPaid >= Number(loan.amount)

            await supabase
                .from('prets')
                .update({
                    amount_paid: newTotalPaid,
                    status: isFullyPaid ? 'paid' : undefined
                })
                .eq('id', repayment.loan_id)
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
    return { success: true }
}

export async function activateSubscription(subId: string) {
    const supabase = await createClient()

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + 30)

    const { data: currentSub } = await supabase.from('user_subscriptions').select('user_id').eq('id', subId).single()
    if (currentSub) {
        // Expire all other active subscriptions for this user
        await supabase
            .from('user_subscriptions')
            .update({ status: 'expired', is_active: false })
            .eq('user_id', currentSub.user_id)
            .eq('status', 'active')
            .neq('id', subId)
    }

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            is_active: true,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            rejection_reason: null
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
    return { success: true }
}

export async function rejectSubscription(subId: string, reason: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            status: 'rejected',
            is_active: false,
            rejection_reason: reason
        })
        .eq('id', subId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }
    revalidatePath('/admin/super/subscriptions')
    revalidatePath('/client/dashboard')
    return { success: true }
}
