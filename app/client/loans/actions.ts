'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

export async function requestLoan(amount: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Check Active Subscription
    const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*, plan:abonnements(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString())
        .single()

    if (!sub) {
        return { error: 'Aucun abonnement actif. Veuillez souscrire à une formule.' }
    }

    // 2. Check Active Loans (Capacity & Cumulative Amount)
    const { data: activeLoans, count: activeLoansCount } = await supabase
        .from('prets')
        .select('amount', { count: 'exact' })
        .eq('user_id', user.id)
        .in('status', ['approved', 'active', 'overdue'])

    const currentActiveCount = activeLoansCount || 0
    const currentCumulativeDebt = activeLoans?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0

    // Check 1: Max Simultanous Loans (using stored plan limit, interpreted as capacity)
    if (currentActiveCount >= sub.plan.max_loans_per_month) {
        return { error: `Vous avez atteint votre limite de ${sub.plan.max_loans_per_month} prêts simultanés.` }
    }

    // Check 2: Max Cumulative Amount
    if (currentCumulativeDebt + amount > sub.plan.max_loan_amount) {
        const remaining = sub.plan.max_loan_amount - currentCumulativeDebt
        return { error: `Montant refusé. Votre plafond cumulé est de ${sub.plan.max_loan_amount} FCFA. Disponible: ${remaining > 0 ? remaining : 0} FCFA.` }
    }

    // 3. (Optional) Check Monthly limit if enforced separately? 
    // User verified: "c'est le cumulé on va dire". 
    // We will assume the integer limit is simultaneous capacity as implemented above, 
    // removing strictly monthly quota if it conflicts, but keeping it if it's meant to be frequency.
    // Given "c'est le cumulé", the amount limit is vital. 
    // The integer limit (1, 2, 3, 5) usually implies capacity in such systems.
    // I will remove the monthly frequency check to strictly follow "cumulative capacity" interpretation unless explicitly needed.
    // However, the column is named 'max_loans_per_month'. 
    // I'll Stick to the capacity check I just added as the primary "User Rule" enforcer.

    // 4. Automatic Rejection Logic (Redundant with above, but keeping structure if needed or removing)
    // The above returns directly, so we can skip valid insertion logic below.



    // 5. Create Valid Loan Request (Pending)
    const { error: insertError } = await supabase
        .from('prets')
        .insert({
            user_id: user.id,
            amount: amount,
            subscription_snapshot_id: sub.plan.id,
            status: 'pending'
        })

    if (insertError) {
        return { error: getUserFriendlyErrorMessage(insertError) }
    }

    revalidatePath('/client/dashboard')
    return { success: 'PretEngage' }
}

export async function submitRepayment(formData: FormData) {
    const { createClient, createAdminClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié' }

    const loanId = formData.get('loanId') as string
    const amount = formData.get('amount') as string
    const file = formData.get('proof') as File

    if (!loanId || !amount || !file || file.size === 0) {
        return { error: 'Données incomplètes' }
    }

    const numAmount = Number(amount)

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
                amount_declared: Number(amount),
                proof_url: uploadData.path,
                status: 'pending'
            })

        if (dbError) {
            return { error: getUserFriendlyErrorMessage(dbError) }
        }

        revalidatePath('/client/loans')
        revalidatePath(`/client/loans/${loanId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Erreur lors de l'envoi de la preuve." }
    }
}
