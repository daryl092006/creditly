'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'

export async function recordInvestorTransaction(name: string, type: 'withdrawal' | 'investment', amount: number, repayDebt: boolean = false) {
    await requireAdminRole(['owner', 'superadmin'])
    const { createAdminClient, createClient: createClientAuth } = await import('@/utils/supabase/server')
    const supabase = await createClientAuth()
    const supabaseAdmin = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { getShareholdersConfig, getShareholderByEmail } = await import('@/utils/finance-utils')
    const shareholders = await getShareholdersConfig(supabaseAdmin)
    
    // VERIFICATION: L'utilisateur ne peut agir que sur son PROPRE compte
    const { data: dbUser } = await supabaseAdmin.from('users').select('id, email, roles').eq('id', user?.id).single()
    const userEmail = dbUser?.email || user?.email || ''
    const match = getShareholderByEmail(userEmail, dbUser?.roles || [], shareholders)

    if (!match || match.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
        return { error: "Action interdite : Vous ne pouvez enregistrer des flux que pour votre propre compte associé." }
    }

    // Enregistrement dans la table avec statut PENDING pour les retraits (même dette)
    const { error } = await supabaseAdmin
        .from('investor_transactions')
        .insert({
            shareholder_name: name,
            shareholder_email: userEmail,
            type,
            amount: type === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount),
            date: new Date().toISOString(),
            status: type === 'withdrawal' ? 'pending' : 'approved',
            description: repayDebt 
                ? '[REPAY_DEBT] Retrait dividendes pour remboursement dette personnelle'
                : (type === 'withdrawal' ? 'Demande de retrait dividendes' : 'Remise en caisse / Réinvestissement')
        })

    if (error) {
        console.error("Erreur Base de Données:", error)
        return { error: "Erreur lors de l'enregistrement." }
    }
    
    revalidatePath('/admin/super')
    revalidatePath('/admin/finance')
    return { success: true }
}

export async function updateInvestorTransactionStatus(id: string, status: 'approved' | 'rejected') {
    await requireAdminRole(['owner', 'superadmin'])
    const { createAdminClient } = await import('@/utils/supabase/server')
    const supabaseAdmin = await createAdminClient()

    // 1. Récupérer la transaction pour voir si c'est un remboursement de dette
    const { data: tx } = await supabaseAdmin.from('investor_transactions').select('*').eq('id', id).single()
    if (!tx) return { error: "Transaction introuvable" }

    if (status === 'approved' && tx.description?.startsWith('[REPAY_DEBT]')) {
        // --- LOGIQUE DE REMBOURSEMENT AU MOMENT DE L'APPROBATION ---
        // Trouver l'utilisateur par son email
        const { data: shareholderUser } = await supabaseAdmin.from('users').select('id').eq('email', tx.shareholder_email).single()
        
        if (shareholderUser) {
            const { data: oldestLoan } = await supabaseAdmin
                .from('prets')
                .select('*')
                .eq('user_id', shareholderUser.id)
                .in('status', ['active', 'overdue'])
                .order('created_at', { ascending: true })
                .limit(1)
                .single()

            if (oldestLoan) {
                const { calculateLoanDebt } = await import('@/utils/loan-utils')
                const { totalDebt } = calculateLoanDebt(oldestLoan)
                
                const amountToApply = Math.min(Math.abs(tx.amount), totalDebt)

                // Enregistrer le remboursement
                await supabaseAdmin.from('remboursements').insert({
                    loan_id: oldestLoan.id,
                    user_id: shareholderUser.id,
                    amount_declared: amountToApply,
                    proof_url: 'investor_payout_repayment',
                    status: 'verified',
                    admin_id: (await supabaseAdmin.auth.getUser()).data.user?.id, // Admin qui approuve
                    validated_at: new Date().toISOString(),
                    description: `Remboursement validé via dividendes (${tx.shareholder_name})`
                })

                // Mettre à jour le prêt
                const isFullyPaid = (Number(oldestLoan.amount_paid || 0) + amountToApply) >= totalDebt
                await supabaseAdmin.from('prets').update({
                    amount_paid: Number(oldestLoan.amount_paid || 0) + amountToApply,
                    status: isFullyPaid ? 'paid' : oldestLoan.status
                }).eq('id', oldestLoan.id)
            }
        }
    }

    const { error } = await supabaseAdmin
        .from('investor_transactions')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error("Error updating transaction status:", error)
        return { error: "Erreur lors de la mise à jour." }
    }

    revalidatePath('/admin/super')
    revalidatePath('/admin/finance')
    revalidatePath('/admin/loans')
    revalidatePath('/admin/repayments')
    return { success: true }
}
