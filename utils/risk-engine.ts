import { createClient } from './supabase/server'

export type RiskClass = 'ELITE' | 'FIABLE' | 'STANDARD' | 'A SURVEILLER' | 'RISQUE'

export interface RiskAnalysis {
    score: number
    riskClass: RiskClass
    defaultRisk: number
    debtRatio: number
    maxLoanAllowed: number
    eligible: boolean
    reasons: string[]
}

/**
 * Moteur de Risque Core de Creditly Finance
 * Calcule le score, le plafond dynamique et le risque de défaut d'un utilisateur.
 */
export async function evaluateUserRisk(userId: string, requestedAmount?: number): Promise<RiskAnalysis> {
    const supabase = await createClient()
    const now = new Date()

    // 1. Fetch Data
    const [{ data: user }, { data: loans }, { data: kyc }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('prets').select('*').eq('user_id', userId),
        supabase.from('kyc_submissions').select('*').eq('user_id', userId).single()
    ])

    if (!user) throw new Error("Utilisateur introuvable")

    const reasons: string[] = []
    let eligible = true

    // --- CALCUL DU SCORE DE CONFIANCE (BASE 100) ---
    let score = 0

    // Component: KYC (20 pts)
    const kycScore = kyc?.status === 'verified' ? 20 : kyc?.status === 'rejected' ? 0 : 10
    score += kycScore

    // Component: Repayment (30 pts)
    const totalLoans = loans?.length || 0
    const finishedLoansCount = loans?.filter(l => ['paid', 'overdue'].includes(l.status)).length || 0
    const paidOnTime = loans?.filter(l => l.status === 'paid' && !l.is_extended).length || 0
    const repaymentRate = finishedLoansCount > 0 ? paidOnTime / finishedLoansCount : 1
    score += Math.round(repaymentRate * 30)

    // Component: Ancienneté (15 pts)
    const seniorityMonths = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    score += Math.min(seniorityMonths * 2, 15)

    // Component: Fidélité (15 pts)
    score += Math.min((loans?.filter(l => l.status === 'paid').length || 0) * 3, 15)

    // Component: Cohérence des données (10 pts bonus)
    if (user.whatsapp && user.nom && user.prenom) score += 10

    // Component: Subscription (10 pts)
    const { data: activeSub } = await supabase.from('user_subscriptions').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle()
    if (activeSub) score += 10

    // Penalties
    const recentLates = loans?.filter(l => l.status === 'overdue' || (l.status === 'paid' && l.late_penalties > 0)).length || 0
    score -= (recentLates * 5)

    const extensionCount = loans?.reduce((acc, l) => acc + (l.extension_count || 0), 0) || 0
    score -= (extensionCount * 3)

    let fraudLevel = 0
    if (typeof user.fraud_suspicion_level === 'string') {
        if (user.fraud_suspicion_level.toUpperCase() !== 'NONE') fraudLevel = 2
    } else if (user.fraud_suspicion_level > 0) {
        fraudLevel = user.fraud_suspicion_level
    }
    score -= fraudLevel * 10

    score = Math.max(0, Math.min(100, score))

    // --- CLASSES DE RISQUE ---
    let riskClass: RiskClass = 'STANDARD'
    if (score >= 90) riskClass = 'ELITE'
    else if (score >= 75) riskClass = 'FIABLE'
    else if (score >= 60) riskClass = 'STANDARD'
    else if (score >= 40) riskClass = 'A SURVEILLER'
    else riskClass = 'RISQUE'

    // --- CALCUL DU RISQUE DE DÉFAUT (%) ---
    const lateRepaymentRate = totalLoans > 0 ? (loans?.filter(l => l.status === 'overdue').length || 0) / totalLoans : 0
    const extensionRate = totalLoans > 0 ? (loans?.filter(l => l.extension_count > 0).length || 0) / totalLoans : 0

    let defaultRisk = (lateRepaymentRate * 30) + (extensionRate * 20) + (fraudLevel * 15)
    defaultRisk = Math.min(100, defaultRisk)

    // --- CAPACITÉ D'ENDETTEMENT ---
    const { calculateLoanDebt } = await import('./loan-utils')
    const activeLoans = loans?.filter(l => ['active', 'overdue', 'pending'].includes(l.status)) || []
    const currentDebt = activeLoans.reduce((acc, l) => acc + calculateLoanDebt(l as any).totalDebt, 0)

    // Plafond dynamique
    let baseLimit = 10000
    if (activeSub) {
        const { data: sub } = await supabase.from('user_subscriptions').select('plan:abonnements(max_loan_amount)').eq('user_id', userId).eq('status', 'active').maybeSingle()
        if (sub) baseLimit = Number((sub.plan as any).max_loan_amount)
    }

    // Bonus de 5000F si 3 prêts ou plus remboursés à temps (sans extension)
    const paidOnTimeCount = loans?.filter(l => l.status === 'paid' && !l.is_extended).length || 0
    if (paidOnTimeCount >= 3) {
        baseLimit += 5000
    }

    const scoreCoef = score >= 90 ? 1.0 : score >= 75 ? 0.8 : score >= 60 ? 0.6 : score >= 40 ? 0.3 : 0
    const historyCoef = totalLoans === 0 ? 0.3 : totalLoans === 1 ? 0.5 : totalLoans === 2 ? 0.7 : 1.0

    const maxLoanAllowed = baseLimit
    const debtRatio = maxLoanAllowed > 0 ? (currentDebt / maxLoanAllowed) * 100 : 100

    // --- RÈGLES DE BLOCAGE ---
    const sortedLoans = loans ? [...loans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
    const finishedLoans = sortedLoans.filter(l => ['paid', 'overdue'].includes(l.status))
    let hasThreeConsecutiveLates = false
    if (finishedLoans.length >= 3) {
        const lastThree = finishedLoans.slice(0, 3)
        hasThreeConsecutiveLates = lastThree.every(l => l.status === 'overdue' || (l.status === 'paid' && Number(l.late_penalties || 0) > 0))
    }

    if (hasThreeConsecutiveLates) {
        eligible = false
        reasons.push("Compte bloqué définitivement (3 retards consécutifs).")
        // Update user to inactive and blocked status in database
        supabase.from('users').update({
            is_account_active: false,
            fraud_suspicion_level: 'BLOCKED'
        }).eq('id', userId).then(({ error }) => {
            if (error) console.error('[RiskEngine] Auto-block failed:', error.message)
        })
        // Sync with email blacklist table
        if (user.email) {
            supabase.from('email_blacklist').insert({ email: user.email }).then(() => {})
        }
    }

    if (kyc?.status !== 'verified') { eligible = false; reasons.push("KYC non validé"); }
    if (!user.active_subscription_id) { eligible = false; reasons.push("Abonnement inactif"); }
    if (score < 40) { eligible = false; reasons.push(`Score trop faible (${score})`); }
    if (loans?.some(l => l.status === 'overdue')) { eligible = false; reasons.push("Prêt en retard"); }
    if (debtRatio > 90) { eligible = false; reasons.push("Capacité d'endettement saturée"); }
    if (requestedAmount && requestedAmount > (maxLoanAllowed - currentDebt)) {
        eligible = false
        reasons.push(`Limite dépassée. Disponible: ${(maxLoanAllowed - currentDebt).toLocaleString()} F`);
    }

    const result: RiskAnalysis = { score, riskClass, defaultRisk, debtRatio, maxLoanAllowed, eligible, reasons }

    // --- PERSISTANCE EN BDD (Mise à jour des colonnes de risque de l'utilisateur) ---
    // Fire-and-forget : on ne bloque pas le retour sur une erreur d'écriture
    supabase.from('users').update({
        current_score: score,
        risk_class: riskClass,
        active_debt_amount: currentDebt,
        current_debt_ratio: debtRatio,
        last_risk_review_at: new Date().toISOString()
    }).eq('id', userId).then(({ error }) => {
        if (error) console.error('[RiskEngine] Échec mise à jour score utilisateur:', error.message)
    })

    return result
}

/**
 * Évalue la liquidité de la plateforme.
 */
export async function checkPlatformLiquidity() {
    const supabase = await createClient()
    const { data: latestSnapshot } = await supabase.from('platform_liquidity_snapshots').select('*').order('created_at', { ascending: false }).limit(1).single()
    const totalFunds = latestSnapshot?.total_funds || 5000000
    const { data: activeLoans } = await supabase.from('prets').select('amount, amount_paid').in('status', ['active', 'overdue', 'approved'])
    const totalActiveAmount = activeLoans?.reduce((acc, l) => acc + (Number(l.amount) - Number(l.amount_paid)), 0) || 0
    const exposureRate = (totalActiveAmount / totalFunds) * 100
    let decisionStatus: 'NORMAL' | 'CAUTION' | 'RESTRICTED' | 'PAUSED' = 'NORMAL'
    if (exposureRate > 95) decisionStatus = 'PAUSED'
    else if (exposureRate > 85) decisionStatus = 'RESTRICTED'
    else if (exposureRate > 70) decisionStatus = 'CAUTION'
    return { totalFunds, totalActiveAmount, exposureRate, decisionStatus }
}

export async function evaluateLoanEligibility(userId: string, requestedAmount: number): Promise<RiskAnalysis & { liquidityStatus: string }> {
    const risk = await evaluateUserRisk(userId, requestedAmount)
    const liquidity = await checkPlatformLiquidity()
    let updatedEligible = risk.eligible
    if (liquidity.decisionStatus === 'PAUSED' && risk.riskClass !== 'ELITE') {
        updatedEligible = false
        risk.reasons.push("Liquidité plateforme limitée.")
    }
    if (liquidity.decisionStatus === 'RESTRICTED') {
        risk.maxLoanAllowed = Math.floor(risk.maxLoanAllowed * 0.7)
        if (requestedAmount > risk.maxLoanAllowed) {
            updatedEligible = false
            risk.reasons.push("Plafonds réduits (forte demande).")
        }
    }
    return { ...risk, eligible: updatedEligible, liquidityStatus: liquidity.decisionStatus }
}

export function calculateProvision(activeAmount: number, riskClass: RiskClass): number {
    const rates: Record<RiskClass, number> = { 'ELITE': 0.02, 'FIABLE': 0.05, 'STANDARD': 0.10, 'A SURVEILLER': 0.25, 'RISQUE': 1.00 }
    return activeAmount * (rates[riskClass] ?? 0.10)
}
