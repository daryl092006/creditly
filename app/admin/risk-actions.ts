'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getCurrentUserRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit-logger'
import type { RiskClass } from '@/utils/risk-engine'
import { calculateLoanDebt } from '@/utils/loan-utils'

/**
 * Calcule le vrai score de risque d'un utilisateur à partir de ses données réelles.
 * Utilise le client admin pour contourner le RLS et lire toutes les données.
 */
async function computeRealScore(userId: string, supabaseAdmin: any): Promise<{
    score: number
    riskClass: RiskClass
    currentDebt: number
    debtRatio: number
}> {
    const now = new Date()

    const [{ data: user }, { data: loans }, { data: kyc }, { data: sub }] = await Promise.all([
        supabaseAdmin.from('users').select('*').eq('id', userId).single(),
        supabaseAdmin.from('prets').select('*').eq('user_id', userId),
        supabaseAdmin.from('kyc_submissions').select('status').eq('user_id', userId).single(),
        supabaseAdmin.from('user_subscriptions').select('plan:abonnements(max_loan_amount)').eq('user_id', userId).eq('status', 'active').single()
    ])

    if (!user) throw new Error(`User ${userId} not found`)

    let score = 0

    // Check if user is staff
    const roles = user.roles || []
    const isAdmin = roles.some((r: string) => r.startsWith('admin_') || r === 'owner' || r === 'superadmin')

    // Active loans used to calculate current debt before returning
    const activeLoans = loans?.filter((l: any) => ['active', 'overdue', 'pending'].includes(l.status)) || []
    const currentDebt = activeLoans.reduce((acc: number, l: any) => acc + calculateLoanDebt(l as any).totalDebt, 0)

    if (isAdmin) {
        // Staff are exempted from risk analysis and implicitly ranked as ELITE for metrics
        return { score: 100, riskClass: 'ELITE', currentDebt, debtRatio: 0 }
    }

    // KYC (20 pts)
    score += kyc?.status === 'verified' ? 20 : kyc?.status === 'rejected' ? 0 : 10

    // Remboursement (30 pts)
    const totalLoans = loans?.length || 0
    const paidOnTime = loans?.filter((l: any) => l.status === 'paid' && !l.is_extended).length || 0
    const finishedLoansCount = loans?.filter((l: any) => ['paid', 'overdue'].includes(l.status)).length || 0
    const repaymentRate = finishedLoansCount > 0 ? paidOnTime / finishedLoansCount : 1
    score += Math.round(repaymentRate * 30)

    // Ancienneté (15 pts)
    const seniorityMonths = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    score += Math.min(seniorityMonths * 2, 15)

    // Fidélité — prêts remboursés (15 pts)
    score += Math.min((loans?.filter((l: any) => l.status === 'paid').length || 0) * 3, 15)

    // Abonnement actif (10 pts)
    if (sub) score += 10

    // Cohérence données (10 pts bonus)
    if (user.whatsapp && user.nom && user.prenom) score += 10

    // Pénalités
    const recentLates = loans?.filter((l: any) => l.status === 'overdue' || (l.status === 'paid' && l.late_penalties > 0)).length || 0
    score -= recentLates * 5

    const extensionCount = loans?.reduce((acc: number, l: any) => acc + (l.extension_count || 0), 0) || 0
    score -= extensionCount * 3

    let fraudLevel = 0
    if (typeof user.fraud_suspicion_level === 'string') {
        if (user.fraud_suspicion_level.toUpperCase() !== 'NONE') fraudLevel = 2 // Penalty arbitrary for "LOW" / "HIGH" 
    } else if (user.fraud_suspicion_level > 0) {
        fraudLevel = user.fraud_suspicion_level
    }
    score -= fraudLevel * 10

    score = Math.max(0, Math.min(100, score))

    // Classe de risque
    let riskClass: any = 'STANDARD'
    if (score >= 90) riskClass = 'ELITE'
    else if (score >= 75) riskClass = 'FIABLE'
    else if (score >= 60) riskClass = 'STANDARD'
    else if (score >= 40) riskClass = 'A SURVEILLER'
    else riskClass = 'RISQUE'

    // Dette courante
    // Dette courante calculée au début

    const baseLimit = (sub?.plan as any)?.max_loan_amount || 10000
    const scoreCoef = score >= 90 ? 1.0 : score >= 75 ? 0.8 : score >= 60 ? 0.6 : score >= 40 ? 0.3 : 0
    const historyCoef = totalLoans === 0 ? 0.3 : totalLoans === 1 ? 0.5 : totalLoans === 2 ? 0.7 : 1.0
    const maxLoanAllowed = Math.floor(baseLimit * scoreCoef * historyCoef)
    const debtRatio = maxLoanAllowed > 0 ? (currentDebt / maxLoanAllowed) * 100 : 100

    return { score, riskClass, currentDebt, debtRatio }
}

/**
 * Recalcule les VRAIS scores de risque pour tous les utilisateurs de la plateforme.
 * Basé sur : KYC, historique de remboursement, ancienneté, fidélité, abonnement, pénalités.
 * Réservé aux superadmin et owners.
 */
export async function batchRecalculateRiskScores() {
    const role = await getCurrentUserRole()
    if (!role || !['superadmin', 'owner'].includes(role)) {
        return { error: 'Permission refusée.' }
    }

    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id')

    if (error || !users) return { error: 'Impossible de récupérer les utilisateurs.' }

    let updated = 0
    let errors = 0
    const results: Record<string, { score: number, riskClass: string }> = {}

    // Process par lots de 5 pour rester dans les limites de concurrence
    const chunkSize = 5
    for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize)
        await Promise.allSettled(
            chunk.map(async (u: { id: string }) => {
                try {
                    const { score, riskClass, currentDebt, debtRatio } = await computeRealScore(u.id, supabaseAdmin)

                    await supabaseAdmin.from('users').update({
                        current_score: score,
                        risk_class: riskClass,
                        active_debt_amount: currentDebt,
                        current_debt_ratio: debtRatio,
                        last_risk_review_at: new Date().toISOString()
                    }).eq('id', u.id)

                    results[u.id] = { score, riskClass }
                    updated++
                } catch (e: any) {
                    console.error(`[RiskBatch] Erreur pour ${u.id}:`, e?.message)
                    errors++
                }
            })
        )
    }

    const { data: { user } } = await supabase.auth.getUser()
    await logAuditAction({
        actorId: user?.id || null,
        actorRole: role,
        action: 'ROLE_UPDATE',
        targetTable: 'users',
        // Use a nil UUID as a sentinel for system-batch operations
        targetId: '00000000-0000-0000-0000-000000000000',
        oldValue: {},
        newValue: { action: 'batch_risk_recalculation', updated, errors }
    })

    revalidatePath('/admin/super')
    return { success: true, updated, errors }
}
