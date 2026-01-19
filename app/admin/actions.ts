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

export async function updateKycStatus(submissionId: string, status: 'approved' | 'rejected', notes?: string) {
    const supabase = await createClient()

    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id

    // Fetch user details for notification first
    const { data: submission } = await supabase.from('kyc_submissions').select('user_id, users(email, prenom, nom)').eq('id', submissionId).single()
    const userData = submission?.users as any
    const userName = userData ? `${userData.prenom} ${userData.nom}` : 'Utilisateur'
    const userEmail = userData?.email

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

    // Notify User
    if (userEmail) {
        if (status === 'rejected') {
            await sendUserEmail('KYC_REJECTED', { email: userEmail, name: userName, details: notes })
        }
        // Approval email is sent in activateUserAccount if done together, or here?
        // Usually approval happens with activation. But let's send it here if just status update.
        // Actually, logic below handles activation separately. So we might delay approval email to activation?
        // But let's keep it safe. If specific status update to rejected, we sent it.
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

    // Notify User of Approval & Activation
    const user = data[0]
    await sendUserEmail('KYC_APPROVED', {
        email: user.email,
        name: `${user.prenom} ${user.nom}`
    })

    revalidatePath('/admin/kyc')
    return { success: true }
}

export async function updateLoanStatus(loanId: string, status: 'approved' | 'rejected' | 'active' | 'paid', reason?: string) {
    const supabase = await createClient()

    const user = await supabase.auth.getUser()
    const adminId = user.data.user?.id || null
    const updates: Record<string, string | number | boolean | null> = {
        status,
        admin_decision_date: new Date().toISOString(),
        admin_id: adminId
    }

    // Fetch loan & user details for notification
    const { data: loan, error: fetchError } = await supabase.from('prets').select('*, snapshot:subscription_snapshot_id(*), users(email, prenom, nom)').eq('id', loanId).single()
    if (fetchError || !loan) return { error: 'Prêt introuvable' }

    const userData = loan.users as any
    const userEmail = userData?.email
    const userName = userData ? `${userData.prenom} ${userData.nom}` : 'Utilisateur'

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
                return { error: `Impossible d'approuver : Cela dépasserait le plafond de l'utilisateur (${maxAmount} FCFA). Disponible : ${available} FCFA.` }
            }

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

    if (error) return { error: getUserFriendlyErrorMessage(error) }

    // Notify User
    if (userEmail) {
        if (status === 'rejected') {
            await sendUserEmail('LOAN_REJECTED', { email: userEmail, name: userName, details: reason })
        } else if (status === 'active' || status === 'approved') {
            await sendUserEmail('LOAN_ACTIVE', { email: userEmail, name: userName, amount: Number(loan.amount) })
        }
    }

    revalidatePath('/admin/loans')
    return { success: true }
}

export async function updateRepaymentStatus(repaymentId: string, status: 'verified' | 'rejected') {
    const supabase = await createClient()

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
        .select('*, users(email, prenom, nom)') // Fetch user info
        .single()

    if (repError) return { error: getUserFriendlyErrorMessage(repError) }

    // Notify User
    const userData = repayment.users as any
    const userEmail = userData?.email
    const userName = userData ? `${userData.prenom} ${userData.nom}` : 'Utilisateur'

    if (userEmail) {
        if (status === 'verified') {
            await sendUserEmail('REPAYMENT_VALIDATED', { email: userEmail, name: userName, amount: repayment.amount_declared })
        } else if (status === 'rejected') {
            await sendUserEmail('REPAYMENT_REJECTED', { email: userEmail, name: userName })
        }
    }

    if (status === 'verified') {
        const amountVerified = repayment.amount_declared

        const { data: loan, error: fetchLoanError } = await supabase
            .from('prets')
            .select('amount, amount_paid')
            .eq('id', repayment.loan_id)
            .single()

        if (fetchLoanError || !loan) return { error: 'Prêt introuvable' }

        const currentPaid = Number(loan.amount_paid) || 0
        const newTotalPaid = currentPaid + amountVerified
        const isFullyPaid = newTotalPaid >= Number(loan.amount)

        const { error: loanError } = await supabase
            .from('prets')
            .update({
                amount_paid: newTotalPaid,
                status: isFullyPaid ? 'paid' : undefined
            })
            .eq('id', repayment.loan_id)

        if (loanError) return { error: getUserFriendlyErrorMessage(loanError) }
    }

    revalidatePath('/admin/repayments')
    return { success: true }
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
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            rejection_reason: null
        })
        .eq('id', subId)

    if (error) return { error: getUserFriendlyErrorMessage(error) }
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
