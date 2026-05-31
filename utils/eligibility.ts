/**
 * getUserLoanEligibility — Fonction centrale d'éligibilité Creditly
 * 
 * Calcule la limite réelle d'un utilisateur et détermine quels plans
 * d'abonnement sont disponibles ou verrouillés pour lui.
 */

import { createClient } from './supabase/server'

export interface PlanEligibility {
    planId: string
    planName: string
    planMaxAmount: number
    planPrice: number
    available: boolean
    lockReason: string | null
    lockDetail: string | null
}

export interface UserEligibility {
    userId: string
    kycStatus: 'verified' | 'pending' | 'rejected' | null
    riskClass: string
    riskScore: number
    currentDebt: number
    realMaxLoanAmount: number // La vraie limite actuelle
    hasActiveDebt: boolean
    hasOverdueDebt: boolean
    hasFraudSuspicion: boolean
    restrictionActive: boolean
    plans: PlanEligibility[]
    blockingReasons: string[]
    recommendedActions: string[]
}

export async function getUserLoanEligibility(userId: string): Promise<UserEligibility> {
    const supabase = await createClient()

    const [
        { data: user },
        { data: kyc },
        { data: loans },
        { data: plans }
    ] = await Promise.all([
        supabase.from('users').select('risk_class, current_score, fraud_suspicion_level, active_subscription_id').eq('id', userId).single(),
        supabase.from('kyc_submissions').select('status').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('prets').select('amount, amount_paid, status').eq('user_id', userId),
        supabase.from('abonnements').select('id, name, max_loan_amount, price').order('max_loan_amount', { ascending: true })
    ])

    const kycStatus = (kyc?.status as UserEligibility['kycStatus']) || null
    const riskClass = user?.risk_class || 'STANDARD'
    const riskScore = user?.current_score || 0
    const hasFraudSuspicion = user?.fraud_suspicion_level
        && user.fraud_suspicion_level !== 'NONE'
        && user.fraud_suspicion_level !== 0
        && user.fraud_suspicion_level !== '0'
    const restrictionActive = false // Pas de colonne account_restricted en DB — géré via fraud_suspicion_level

    const activeLoans = loans?.filter(l => ['active', 'overdue', 'approved', 'pending'].includes(l.status)) || []
    const overdueLoans = loans?.filter(l => l.status === 'overdue') || []
    const paidLoans = loans?.filter(l => l.status === 'paid') || []

    const currentDebt = activeLoans.reduce((acc, l) => acc + Math.max(0, Number(l.amount) - Number(l.amount_paid)), 0)
    const hasActiveDebt = activeLoans.length > 0
    const hasOverdueDebt = overdueLoans.length > 0

    // --- Calcul de la VRAIE limite autorisée selon le profil ---
    // Base : limites par classe de risque
    const classLimits: Record<string, number> = {
        'ELITE': 200000,
        'FIABLE': 100000,
        'STANDARD': 50000,
        'A SURVEILLER': 25000,
        'RISQUE': 10000
    }

    const riskNormalized = riskClass?.toUpperCase().trim() || 'STANDARD'
    let baseLimit = classLimits[riskNormalized] ?? 25000

    // Bonus ancienneté (plus de prêts payés = plus de confiance)
    const bonusFromHistory = Math.min(paidLoans.length * 5000, 25000)
    baseLimit += bonusFromHistory

    // KYC non validé → réduit la limite de 50%
    if (kycStatus !== 'verified') baseLimit = Math.floor(baseLimit * 0.5)

    // INFO : La restriction par suspicion de fraude est supprimée selon la demande utilisateur.

    // Restriction active → bloque tout
    if (restrictionActive) baseLimit = 0

    const realMaxLoanAmount = Math.max(0, baseLimit)

    // --- Raisons de blocage et actions recommandées ---
    const blockingReasons: string[] = []
    const recommendedActions: string[] = []

    if (kycStatus !== 'verified') {
        blockingReasons.push('Votre vérification d\'identité (KYC) n\'est pas encore validée.')
        recommendedActions.push('Finaliser ma vérification KYC')
    }
    if (hasOverdueDebt) {
        blockingReasons.push('Vous avez un prêt en retard de paiement.')
        recommendedActions.push('Rembourser mon prêt en cours')
    }
    if (restrictionActive) {
        blockingReasons.push('Votre compte est temporairement restreint.')
        recommendedActions.push('Contacter le support')
    }
    if (!recommendedActions.includes('Compléter mon profil')) {
        recommendedActions.push('Compléter mon profil')
    }
    if (!recommendedActions.includes('Demander une réévaluation')) {
        recommendedActions.push('Demander une réévaluation')
    }

    // --- Calcul de la disponibilité de chaque plan ---
    const planEligibilities: PlanEligibility[] = (plans || []).map(plan => {
        const planMaxAmount = Number(plan.max_loan_amount)
        let available = planMaxAmount <= realMaxLoanAmount
        let lockReason: string | null = null
        let lockDetail: string | null = null

        if (!available) {
            lockReason = 'Plan non disponible pour votre profil actuel.'
            lockDetail = `Votre limite actuelle est de ${realMaxLoanAmount.toLocaleString('fr-FR')} FCFA. Ce plan donne accès à une capacité allant jusqu'à ${planMaxAmount.toLocaleString('fr-FR')} FCFA. Pour éviter que vous payiez un abonnement dont vous ne pouvez pas bénéficier, ce plan est temporairement indisponible.`
        }

        // Restrictions spécifiques prioritaires
        if (restrictionActive) {
            available = false
            lockReason = 'Votre compte est temporairement restreint.'
            lockDetail = 'Contactez le support pour débloquer votre accès.'
        }

        return {
            planId: plan.id,
            planName: plan.name,
            planMaxAmount,
            planPrice: Number(plan.price),
            available,
            lockReason,
            lockDetail
        }
    })

    return {
        userId,
        kycStatus,
        riskClass: riskNormalized,
        riskScore,
        currentDebt,
        realMaxLoanAmount,
        hasActiveDebt,
        hasOverdueDebt,
        hasFraudSuspicion: !!hasFraudSuspicion,
        restrictionActive,
        plans: planEligibilities,
        blockingReasons,
        recommendedActions
    }
}
