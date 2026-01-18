'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getCurrentUserRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

export async function updateKycStatus(submissionId: string, status: 'approved' | 'rejected', notes?: string) {
    const supabase = await createClient()

    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id

    const { error } = await supabase
        .from('kyc_submissions')
        .update({
            status,
            admin_notes: notes,
            admin_id: adminId,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

    if (error) {
        throw new Error(getUserFriendlyErrorMessage(error))
    }

    revalidatePath('/admin/kyc')
}

export async function activateUserAccount(userId: string) {
    // Security: Verify user has permission to activate accounts
    console.log(`[activateUserAccount] Attempting to activate user ${userId}`)

    const role = await getCurrentUserRole()
    if (!role || !['admin_kyc', 'superadmin'].includes(role)) {
        console.error(`[activateUserAccount] Permission denied for role: ${role}`)
        throw new Error("Accès refusé : Vous n'avez pas les droits d'activation.")
    }

    // Use Admin Client to bypass RLS restrictions on 'users' table
    const supabase = await createAdminClient()

    const { data, error } = await supabase
        .from('users')
        .update({ is_account_active: true })
        .eq('id', userId)
        .select() // IMPORTANT: Return the updated row to verify it worked

    if (error) {
        console.error(`[activateUserAccount] Database error: ${error.message}`)
        throw new Error(getUserFriendlyErrorMessage(error))
    }

    if (!data || data.length === 0) {
        console.error(`[activateUserAccount] No user found with ID ${userId} or update failed silently.`)
        throw new Error("Erreur : Impossible d'activer le compte. Utilisateur introuvable ou mise à jour échouée.")
    }

    console.log(`[activateUserAccount] Success! User ${userId} active status set to true.`)
    revalidatePath('/admin/kyc')
}

export async function updateLoanStatus(loanId: string, status: 'approved' | 'rejected' | 'active' | 'paid', reason?: string) {
    const supabase = await createClient()

    // If approving, set due_date based on subscription terms
    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id || null
    const updates: Record<string, string | number | boolean | null> = {
        status,
        admin_decision_date: new Date().toISOString(),
        admin_id: adminId
    }

    if (status === 'approved' || status === 'active') { // Assuming 'active' is the approved state for loans
        // Fetch loan to get subscription details and amount
        const { data: loan, error: fetchError } = await supabase.from('prets').select('*, snapshot:subscription_snapshot_id(*)').eq('id', loanId).single()

        if (fetchError || !loan) throw new Error('Loan not found')

        // SAFETY CHECK: Verify Cumulative Debt Limit
        if (loan.snapshot) {
            // Calculate CURRENT active debt (excluding this loan if it was already active/pending)
            const { data: activeLoans } = await supabase
                .from('prets')
                .select('amount')
                .eq('user_id', loan.user_id)
                .in('status', ['active', 'overdue']) // Only count currently operational debt
                .neq('id', loanId) // Exclude self

            const currentDebt = activeLoans?.reduce((sum, l) => sum + Number(l.amount), 0) || 0
            const maxAmount = loan.snapshot.max_loan_amount

            if (currentDebt + Number(loan.amount) > maxAmount) {
                const available = Math.max(0, maxAmount - currentDebt)
                throw new Error(`Impossible d'approuver : Cela dépasserait le plafond de l'utilisateur (${maxAmount} FCFA). Disponible : ${available} FCFA.`)
            }

            // Also Check Capacity if needed (User didn't strictly ask, but good practice. Sticking to Amount for now as requested)

            const days = loan.snapshot.repayment_delay_days || 7
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + days)
            updates.due_date = dueDate.toISOString()
            updates.status = 'active'
        }
    }

    if (reason) {
        updates.rejection_reason = reason
    }

    const { error } = await supabase
        .from('prets')
        .update(updates)
        .eq('id', loanId)

    if (error) throw new Error(getUserFriendlyErrorMessage(error))
    revalidatePath('/admin/loans')
}

export async function updateRepaymentStatus(repaymentId: string, status: 'verified' | 'rejected') {
    const supabase = await createClient()

    // Update repayment status
    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id

    const { data: repayment, error: repError } = await supabase
        .from('remboursements')
        .update({
            status,
            validated_at: new Date().toISOString(),
            admin_id: adminId
        })
        .eq('id', repaymentId)
        .select()
        .single()

    if (repError) throw new Error(getUserFriendlyErrorMessage(repError))

    // If verified, update loan status to 'paid' (?) 
    // Logic: check if total repayments >= loan amount. 
    // For MVP, if one repayment covers it, or just mark loan as paid manually?
    // The spec says "Statut du prêt mis à jour".
    // I will assume for this MVP that one repayment closes the loan or the admin manually closes the loan.
    // Let's automate it: If verified, set loan status to 'paid'.

    if (status === 'verified') {
        const amountVerified = repayment.amount_declared

        // 1. Fetch current loan state
        const { data: loan, error: fetchLoanError } = await supabase
            .from('prets')
            .select('amount, amount_paid')
            .eq('id', repayment.loan_id)
            .single()

        if (fetchLoanError || !loan) throw new Error('Loan not found')

        const currentPaid = Number(loan.amount_paid) || 0
        const newTotalPaid = currentPaid + amountVerified
        const isFullyPaid = newTotalPaid >= Number(loan.amount)

        // 2. Update Loan (Increment paid amount & Check if closed)
        const { error: loanError } = await supabase
            .from('prets')
            .update({
                amount_paid: newTotalPaid,
                status: isFullyPaid ? 'paid' : undefined // Only change status if fully paid
            })
            .eq('id', repayment.loan_id)

        if (loanError) throw new Error(getUserFriendlyErrorMessage(loanError))
    }

    revalidatePath('/admin/repayments')
}
export async function activateSubscription(subId: string) {
    const supabase = await createClient()

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + 30)

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            is_active: true,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        })
        .eq('id', subId)

    if (error) throw new Error(getUserFriendlyErrorMessage(error))
    revalidatePath('/admin/super')
    revalidatePath('/admin/super/subscriptions')
}
