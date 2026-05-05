'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendAdminNotification, sendUserEmail } from '@/utils/email-service'
import { getSettingValue } from '../../admin/settings/actions'

export async function requestLoan(
    amount: number,
    payoutPhone: string,
    payoutName: string,
    payoutNetwork: string,
    personalData: {
        birthDate: string;
        address: string;
        idDetails: string;
        city: string;
        profession: string;
    }
) {
    try {
        const { createClient, createAdminClient } = await import('@/utils/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        // 0. Input Validation
        const { LoanRequestSchema } = await import('@/utils/validation-schemas');
        const validationResult = LoanRequestSchema.safeParse({
            amount,
            payoutPhone,
            payoutName,
            payoutNetwork,
            ...personalData
        });

        if (!validationResult.success) {
            return { error: validationResult.error.issues[0].message };
        }

        // Fetch basic profile only for robustness
        const { data: profile, error: profileError } = await supabase.from('users').select('*').eq('id', user.id).single()

        if (profileError || !profile) {
            console.error('Profile Load Error:', profileError);
            return { error: "Erreur de chargement du profil utilisateur. Veuillez rafraîchir la page." };
        }

        // Fetch the active sub specifically
        const { data: currentSub } = await supabase.from('user_subscriptions').select('*, plan:abonnements(service_fee)').eq('user_id', user.id).eq('status', 'active').single();
        const plannedFee = currentSub?.plan?.service_fee ?? 0;

        // Vérifier les champs qui ne sont pas collectés pendant la demande de prêt (Garant)
        if (!profile.guarantor_nom || !profile.guarantor_prenom || !profile.guarantor_whatsapp) {
            return { error: "⚠️ Profil Incomplet. Veuillez renseigner les informations de votre personne de référence dans l'onglet 'Mes Informations' de votre Dashboard avant de faire un prêt." }
        }

        // 1. Atomic Transaction (Race Condition Fix)
        const { data: rpcData, error: rpcError } = await supabase.rpc('request_loan_transaction', {
            p_amount: amount,
            p_payout_phone: payoutPhone,
            p_payout_name: payoutName,
            p_payout_network: payoutNetwork,
            p_birth_date: personalData.birthDate,
            p_address: personalData.address,
            p_city: personalData.city || 'Inconnu',
            p_id_details: personalData.idDetails,
            p_profession: personalData.profession
        });

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            return { error: getUserFriendlyErrorMessage(rpcError) };
        }

        // RPC returns { success: boolean, loan_id: uuid, error: string }
        const result = rpcData as any;
        if (result.error) {
            return { error: result.error };
        }

        // Expert Fix: Override the hardcoded 500 fee from RPC if necessary
        if (result.loan_id && plannedFee !== 500) {
            await supabase.from('prets').update({ service_fee: plannedFee }).eq('id', result.loan_id);
        }

        // 2. Notify Admin & User (Awaited but safe)
        try {
            await Promise.allSettled([
                sendAdminNotification('LOAN_REQUEST', {
                    userEmail: user.email!,
                    userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
                    amount: amount,
                    payoutNetwork: payoutNetwork,
                    payoutPhone: payoutPhone
                }),
                sendUserEmail('LOAN_REQUEST_RECEIVED', {
                    email: user.email!,
                    name: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
                    amount: amount
                })
            ]);
        } catch (e) {
            console.error('Notification System Error (ignored):', e);
        }

        try {
            revalidatePath('/client/dashboard')
            return { success: 'PretEngage' }
        } catch (e: any) {
            console.error('Action Revalidate Panic:', e)
            return { success: 'PretEngage' }
        }
    } catch (e: any) {
        console.error('GLOBAL ACTION CRASH:', e)
        return { error: `Côté Serveur: ${e.message || 'Inconnu'}` }
    }
}

export async function submitRepayment(formData: FormData) {
    const { createClient, createAdminClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié' }

    // 0. Input Validation
    const { RepaymentSchema } = await import('@/utils/validation-schemas');

    // FormData parsing
    const rawData = {
        loanId: formData.get('loanId'),
        amount: formData.get('amount'),
        proof: formData.get('proof')
    };

    const validationResult = RepaymentSchema.safeParse(rawData);

    if (!validationResult.success) {
        return { error: validationResult.error.issues[0].message };
    }

    const { loanId, amount: numAmount, proof: file } = validationResult.data;

    // FETCH LOAN WITH FULL DETAILS
    const { data: loan, error: loanError } = await supabase
        .from('prets')
        .select('amount, amount_paid, service_fee, created_at, status, due_date')
        .eq('id', loanId)
        .single()

    if (loanError || !loan) return { error: 'Prêt introuvable' }

    // Use centralized calc
    const { calculateLoanDebt } = await import('@/utils/loan-utils')
    const { totalDebt } = calculateLoanDebt(loan as any)

    // STRICT VALIDATION: Server-side check for any surplus
    if (numAmount > totalDebt + 1) {
        return { error: `Le montant saisi (${numAmount.toLocaleString('fr-FR')} F) dépasse votre solde restant actuel (${totalDebt.toLocaleString('fr-FR')} F, incluant pénalités éventuelles). Veuillez recalculer.` }
    }

    const adminSupabase = await createAdminClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/repayment_${loanId}_${Date.now()}.${fileExt}`

    try {
        // 1. Upload to Storage (repayment-proofs)
        const { data: uploadData, error: uploadError } = await adminSupabase.storage
            .from('repayment-proofs')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            return { error: getUserFriendlyErrorMessage(uploadError) }
        }

        // 2. Insert record
        const { error: dbError } = await adminSupabase
            .from('remboursements')
            .insert({
                loan_id: loanId,
                user_id: user.id,
                amount_declared: numAmount,
                proof_url: uploadData.path,
                status: 'pending'
            })

        if (dbError) {
            return { error: getUserFriendlyErrorMessage(dbError) }
        }

        // 3. Notify Admin (Async)
        const { data: profile } = await adminSupabase.from('users').select('nom, prenom').eq('id', user.id).single()
        try {
            await sendAdminNotification('REPAYMENT', {
                userEmail: user.email!,
                userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
                amount: numAmount
            })

            await sendUserEmail('REPAYMENT_RECEIVED', {
                email: user.email!,
                name: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
                amount: numAmount
            })
        } catch (err) {
            console.error('Notification Error:', err)
        }

        revalidatePath('/client/dashboard')
        revalidatePath('/client/loans')
        revalidatePath(`/client/loans/${loanId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Erreur lors de l'envoi de la preuve." }
    }
}

export async function extendLoan(loanId: string) {
    try {
        const { createClient, createAdminClient } = await import('@/utils/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Non authentifié' }

        // 1. Fetch profile and loan
        const [
            { data: profile },
            { data: loan },
            { data: overdueLoans }
        ] = await Promise.all([
            supabase.from('users').select('*').eq('id', user.id).single(),
            supabase.from('prets').select('*').eq('id', loanId).single(),
            supabase.from('prets').select('id').eq('user_id', user.id).eq('status', 'overdue')
        ]);

        if (!profile || !loan) return { error: 'Dossier introuvable' }

        // 2. Strict Eligibility Checks
        if (!profile.is_account_active) {
            return { error: "Votre compte n'est pas encore actif. Vous ne pouvez pas demander de prolongation." }
        }

        if (overdueLoans && overdueLoans.length > 0) {
            return { error: "Vous avez des dossiers en retard. Votre compte n'est pas en règle." }
        }

        if (loan.is_extended) {
            return { error: "Un prêt ne peut être prolongé qu'une seule fois." }
        }

        if (loan.status !== 'active' && loan.status !== 'approved') {
            return { error: "Seuls les prêts actifs peuvent être prolongés." }
        }

        if (!loan.due_date) {
            return { error: "Ce prêt n'a pas de date d'échéance définie." }
        }

        // 3. Calculate New Due Date (+5 days)
        const currentDueDate = new Date(loan.due_date)
        const newDueDate = new Date(currentDueDate)
        newDueDate.setDate(newDueDate.getDate() + 5)

        // 4. Update the Loan
        const extensionFeeStr = await getSettingValue('loan_extension_fee', '500')
        const extensionFee = parseInt(extensionFeeStr)

        const adminSupabase = await createAdminClient()
        const { error: updateError } = await adminSupabase
            .from('prets')
            .update({
                due_date: newDueDate.toISOString(),
                is_extended: true,
                extension_fee: extensionFee,
                extension_date: new Date().toISOString()
            })
            .eq('id', loanId)

        if (updateError) {
            console.error('Extension Update Error:', updateError)
            return { error: "Erreur lors de la mise à jour du prêt." }
        }

        // 5. Notifications
        try {
            await Promise.allSettled([
                sendAdminNotification('LOAN_EXTENSION', {
                    userEmail: user.email!,
                    userName: `${profile.prenom} ${profile.nom}`,
                    loanId: loanId,
                    newDueDate: newDueDate.toLocaleDateString('fr-FR')
                }),
                sendUserEmail('LOAN_EXTENSION_CONFIRMED', {
                    email: user.email!,
                    name: `${profile.prenom} ${profile.nom}`,
                    newDueDate: newDueDate.toLocaleDateString('fr-FR'),
                    fee: extensionFee
                })
            ]);
        } catch (e) {
            console.error('Notification Error (ignored):', e)
        }

        revalidatePath('/client/dashboard')
        revalidatePath('/client/loans')
        revalidatePath(`/client/loans/${loanId}`)

        return { success: true }
    } catch (e: any) {
        console.error('Extension Action Crash:', e)
        return { error: e.message || "Erreur interne" }
    }
}

