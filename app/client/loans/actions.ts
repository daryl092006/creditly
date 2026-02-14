'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendAdminNotification } from '@/utils/email-service'

export async function requestLoan(amount: number, payoutPhone: string, payoutName: string, payoutNetwork: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 0. Input Validation
    const { LoanRequestSchema } = await import('@/utils/validation-schemas'); // Dynamic import to avoid build cycle if any
    const validationResult = LoanRequestSchema.safeParse({
        amount,
        payoutPhone,
        payoutName,
        payoutNetwork
    });

    if (!validationResult.success) {
        return { error: validationResult.error.issues[0].message };
    }

    // 1. Atomic Transaction (Race Condition Fix)
    const { data: rpcData, error: rpcError } = await supabase.rpc('request_loan_transaction', {
        p_amount: amount,
        p_payout_phone: payoutPhone,
        p_payout_name: payoutName,
        p_payout_network: payoutNetwork
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

    // 2. Notify Admin (Async)
    // We fetch user details again or use what we have. 
    // The RPC insert worked, so we proceed.
    const { data: profile } = await supabase.from('users').select('nom, prenom').eq('id', user.id).single()
    sendAdminNotification('LOAN_REQUEST', {
        userEmail: user.email!,
        userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
        amount: amount,
        payoutNetwork: payoutNetwork,
        payoutPhone: payoutPhone
    }).catch(err => console.error('Notification Error:', err))

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

    // 0. Server-side validation of remaining balance
    const { data: loan, error: loanError } = await supabase
        .from('prets')
        .select('amount, amount_paid')
        .eq('id', loanId)
        .single()

    if (loanError || !loan) return { error: 'Prêt introuvable' }

    const remaining = Number(loan.amount) - (Number(loan.amount_paid) || 0)
    if (numAmount > remaining) {
        return { error: `Le montant (${numAmount.toLocaleString()} F) dépasse votre solde restant (${remaining.toLocaleString()} F).` }
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
        sendAdminNotification('REPAYMENT', {
            userEmail: user.email!,
            userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
            amount: numAmount
        }).catch(err => console.error('Notification Error:', err))

        revalidatePath('/client/loans')
        revalidatePath(`/client/loans/${loanId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Erreur lors de l'envoi de la preuve." }
    }
}
