'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendAdminNotification, sendUserEmail } from '@/utils/email-service'

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

    const { data: profile } = await supabase.from('users').select('*, subscription:user_subscriptions(plan:abonnements(service_fee))').eq('id', user.id).single()

    // Extract plan fee (fallback to 500 if not found)
    const activeSub = (profile.subscription as any[])?.find((s: any) => s.status === 'active' || true); // Simplification, ideally filter by date
    // Actually, it's safer to fetch the active sub specifically
    const { data: currentSub } = await supabase.from('user_subscriptions').select('*, plan:abonnements(service_fee)').eq('user_id', user.id).eq('status', 'active').single();
    const plannedFee = currentSub?.plan?.service_fee ?? 500;

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
    // But typed as 'any' usually. Let's cast or check.
    const result = rpcData as any;

    if (result.error) {
        return { error: result.error };
    }

    // Expert Fix: Override the hardcoded 500 fee from RPC if necessary
    if (result.loan_id && plannedFee !== 500) {
        await supabase.from('prets').update({ service_fee: plannedFee }).eq('id', result.loan_id);
    }

    // 2. Notify Admin & User (Async / Fire and Forget for speed)
    sendAdminNotification('LOAN_REQUEST', {
        userEmail: user.email!,
        userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
        amount: amount,
        payoutNetwork: payoutNetwork,
        payoutPhone: payoutPhone
    }).catch(e => console.error('Admin Notif Error:', e));

    sendUserEmail('LOAN_REQUEST_RECEIVED', {
        email: user.email!,
        name: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
        amount: amount
    }).catch(e => console.error('User Notif Error:', e));

    revalidatePath('/client/dashboard')
    return { success: 'PretEngage' }
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
