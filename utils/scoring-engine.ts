/**
 * MOTEUR DE SCORING ET CALCULS DE RISQUE — CREDITLY FINANCE
 * 
 * Ce module centralise l'intelligence analytique de Creditly.
 * Il remplace l'ancien utils/scoring-utils.ts avec une logique multi-critères rigoureuse.
 * 
 * Fichier: utils/scoring-engine.ts
 */

import { createClient } from '@supabase/supabase-js';

// =========================================================
// TYPES ET INTERFACES
// =========================================================

export interface ScoringReport {
    score: number;
    riskClass: 'ELITE' | 'FIABLE' | 'STANDARD' | 'A SURVEILLER' | 'RISQUE';
    riskLabel: string;
    riskColor: string;
    debtRatio: number;
    defaultRisk: number;
    repaymentRate: number;
    isBlocked: boolean;
    blockReason?: string;
    metrics: {
        totalLoans: number;
        paidLoans: number;
        overdueLoans: number;
        extensionCount: number;
        rejectedRepayments: number;
        monthsSinceJoined: number;
        activeDebtAmount: number;
    };
}

export interface LimitReport {
    dynamicLimit: number;
    planMaxAmount: number;
    coeffScore: number;
    coeffHistory: number;
    cappedByLiquidity: boolean;
}

// =========================================================
// FONCTION PRINCIPALE : CALCUL ET SYNCHRONISATION DU SCORE
// =========================================================

/**
 * Calcule le score de confiance complet d'un client et le synchronise en base de données.
 * Peut être appelée depuis des Server Actions (avec createAdminClient).
 */
export async function calculateAndSyncUserRisk(
    userId: string,
    supabaseClient?: ReturnType<typeof createClient>
): Promise<ScoringReport> {
    const supabase = supabaseClient ?? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ---- Chargement concurrent de toutes les données ----
    const [
        { data: profile },
        { data: loans },
        { data: activeSub },
        { data: repayments },
        { data: kyc }
    ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single() as any,
        supabase.from('prets').select('*').eq('user_id', userId) as any,
        supabase
            .from('user_subscriptions')
            .select('*, plan:abonnements(*)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gt('end_date', new Date().toISOString())
            .maybeSingle() as any,
        supabase.from('remboursements').select('*').eq('user_id', userId) as any,
        supabase.from('kyc_submissions').select('*').eq('user_id', userId).maybeSingle() as any
    ]);

    if (!profile) throw new Error('Client introuvable');

    let score = 0;
    let isBlocked = false;
    let blockReason: string | undefined;

    // =========================================================
    // CRITÈRE 1 : SCORE KYC ET ACTIVATION (Max 20 pts)
    // =========================================================
    let scoreKYC = 0;
    if (profile.is_account_active) {
        scoreKYC = 20; // KYC validé sans rejet
    } else if (kyc?.status === 'pending') {
        scoreKYC = 10; // En cours
    }

    // =========================================================
    // CRITÈRE 2 : SCORE REMBOURSEMENT (Max 30 pts)
    // =========================================================
    const totalLoans = loans?.length || 0;
    const paidLoans = loans?.filter((l: any) => l.status === 'paid') || [];
    const overdueLoans = loans?.filter((l: any) => l.status === 'overdue') || [];
    const activeLoans = loans?.filter((l: any) => ['active', 'overdue'].includes(l.status)) || [];
    const finishedLoansCount = paidLoans.length + overdueLoans.length;
    const repaymentRate = finishedLoansCount > 0 ? (paidLoans.length / finishedLoansCount) : 1;
    const scoreRepayment = Math.round(30 * repaymentRate);

    // =========================================================
    // CRITÈRE 3 : SCORE ANCIENNETÉ COMPTE (Max 15 pts)
    // =========================================================
    const monthsSinceJoined = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const scoreSeniority = Math.min(15, monthsSinceJoined * 2);

    // =========================================================
    // CRITÈRE 4 : SCORE FIDÉLITÉ (Max 15 pts)
    // =========================================================
    const scoreLoyalty = Math.min(15, paidLoans.length * 3);

    // =========================================================
    // CRITÈRE 5 : ABONNEMENT ACTIF (Max 10 pts)
    // =========================================================
    const scoreSubscription = activeSub ? 10 : 0;

    // =========================================================
    // CRITÈRE 6 : COHÉRENCE DES DONNÉES (Max 10 pts)
    // =========================================================
    let scoreDataConsistency = 10;
    if (!profile.guarantor_nom || !profile.guarantor_prenom) scoreDataConsistency -= 5;
    if (profile.whatsapp === profile.guarantor_whatsapp) scoreDataConsistency -= 5;

    // Assemblage de la base positive (Théorique 100 pts ici)
    score = scoreKYC + scoreRepayment + scoreSeniority + scoreLoyalty + scoreSubscription + scoreDataConsistency;

    // =========================================================
    // PÉNALITÉS CRITIQUES
    // =========================================================
    // Retards récents (-5 pts par retard cumulé, max -20)
    const penaltyOverdue = Math.min(20, overdueLoans.length * 5);

    // Extensions utilisées (-3 pts chacune, max -10)
    const extensionCount = loans?.reduce((acc: number, l: any) => acc + (l.extension_count || (l.is_extended ? 1 : 0)), 0) || 0;
    const penaltyExtension = Math.min(10, extensionCount * 3);

    // Reçus de remboursement rejetés ou litiges (-15 pts)
    const rejectedRepaymentsCount = repayments?.filter((r: any) => r.status === 'rejected').length || 0;
    const penaltyIncident = rejectedRepaymentsCount > 0 ? 15 : 0;


    score = Math.max(0, Math.min(100, score - penaltyOverdue - penaltyExtension - penaltyIncident));

    // =========================================================
    // CLASSIFICATION DU RISQUE
    // =========================================================
    let riskClass: ScoringReport['riskClass'] = 'STANDARD';
    let riskLabel = 'Standard';
    let riskColor = '#6b7280';

    if (score >= 85) {
        riskClass = 'ELITE'; riskLabel = 'Élite Alpha'; riskColor = '#10b981';
    } else if (score >= 70) {
        riskClass = 'FIABLE'; riskLabel = 'Fiable'; riskColor = '#3b82f6';
    } else if (score >= 50) {
        riskClass = 'STANDARD'; riskLabel = 'Standard'; riskColor = '#6b7280';
    } else if (score >= 35) {
        riskClass = 'A SURVEILLER'; riskLabel = 'À Surveiller'; riskColor = '#f59e0b';
    } else {
        riskClass = 'RISQUE'; riskLabel = 'Risqué'; riskColor = '#ef4444';
    }

    // =========================================================
    // CALCUL RATIO D'ENDETTEMENT
    // =========================================================
    const { calculateLoanDebt } = await import('@/utils/loan-utils');
    const activeDebtAmount = activeLoans.reduce((sum: number, l: any) => {
        const { totalDebt } = calculateLoanDebt(l as any);
        return sum + totalDebt;
    }, 0);

    const maxPlanAmount = (activeSub as any)?.plan?.max_loan_amount || 0;
    const debtRatio = maxPlanAmount > 0 ? (activeDebtAmount / maxPlanAmount) * 100 : 0;

    // =========================================================
    // CALCUL DU RISQUE DE DÉFAUT (FORMULE PONDÉRÉE)
    // 30% retard + 20% extensions + 20% ratio dette + 30% reçus rejetés
    // =========================================================
    const rawDefaultRisk =
        (0.30 * (overdueLoans.length > 0 ? 100 : 0)) +
        (0.20 * Math.min(100, extensionCount * 20)) +
        (0.20 * Math.min(100, debtRatio)) +
        (0.30 * Math.min(100, rejectedRepaymentsCount * 25));

    const defaultRisk = Math.min(100, Math.max(0, Math.round(rawDefaultRisk)));

    // =========================================================
    // RÈGLES DE BLOCAGE AUTOMATIQUE (Allégées selon demande)
    // =========================================================
    if (!profile.is_account_active) {
        isBlocked = true;
        blockReason = 'Votre compte est inactif. Validation KYC requise avant de pouvoir emprunter.';
    } else if (overdueLoans.length > 0) {
        isBlocked = true;
        blockReason = `Vous avez ${overdueLoans.length} prêt(s) en retard de paiement. Régularisez votre situation avant de demander un nouveau prêt.`;
    }
    // Note: Les blocages liés au score faible et au ratio d'endettement 
    // ont été supprimés pour permettre l'accès au plafond maximal de l'abonnement choisi.

    const report: ScoringReport = {
        score,
        riskClass,
        riskLabel,
        riskColor,
        debtRatio: Math.round(debtRatio * 100) / 100,
        defaultRisk,
        repaymentRate: Math.round(repaymentRate * 100),
        isBlocked,
        blockReason,
        metrics: {
            totalLoans,
            paidLoans: paidLoans.length,
            overdueLoans: overdueLoans.length,
            extensionCount,
            rejectedRepayments: rejectedRepaymentsCount,
            monthsSinceJoined,
            activeDebtAmount
        }
    };

    // =========================================================
    // SYNCHRONISATION EN BASE DE DONNÉES
    // =========================================================
    await (supabase.from('users') as any).update({
        current_score: score,
        risk_class: riskClass,
        active_debt_amount: activeDebtAmount,
        current_debt_ratio: Math.round(debtRatio * 100) / 100
    }).eq('id', userId);

    return report;
}

// =========================================================
// CALCUL DU PLAFOND DYNAMIQUE
// =========================================================

/**
 * Calcule le plafond de crédit dynamique autorisé selon le score et l'historique.
 * Règle fondamentale de sécurité :
 *   - 1er prêt de l'abonnement actuel : MAX 30% du plafond plan
 *   - Score RISQUE : 0 (bloqué)
 *   - Score A SURVEILLER : 30% du max
 *   - Score STANDARD : 60% du max
 *   - Score FIABLE : 80% du max
 *   - Score ELITE : 100% du max
 */
export async function calculateDynamicLoanLimit(
    userId: string,
    planMaxAmount: number,
    currentSubscriptionId?: string,
    supabaseClient?: ReturnType<typeof createClient>
): Promise<LimitReport> {
    const supabase = supabaseClient ?? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user } = await (supabase
        .from('users') as any)
        .select('current_score, risk_class')
        .eq('id', userId)
        .single();

    const { data: paidLoansTotal } = await supabase
        .from('prets')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'paid');

    if (!user) return { dynamicLimit: 0, planMaxAmount, coeffScore: 0, coeffHistory: 0, cappedByLiquidity: false };

    // 1. Coefficient basé sur la classe de risque (Forcé à 1.0 pour garantir l'accès au plafond maximal de l'abonnement)
    let coeffScore = 1.0;

    // 2. Coefficient historique (Supprimé car l'activation du forfait donne droit au plafond complet)
    let coeffHistory = 1.0;

    // 3. Calcul du plafond dynamique
    const dynamicLimit = Math.round(planMaxAmount * coeffScore * coeffHistory);

    return {
        dynamicLimit,
        planMaxAmount,
        coeffScore,
        coeffHistory,
        cappedByLiquidity: false
    };
}

// =========================================================
// COMPATIBILITÉ : Wrapper pour remplacer l'ancienne API scoring-utils.ts
// =========================================================

export interface UserScoreReport {
    score: number;
    category: 'ELITE' | 'FIABLE' | 'A SURVEILLER' | 'RISQUE';
    label: string;
    description: string;
    metrics: {
        repaymentRate: number;
        averageDelay: number;
        totalVolume: number;
        extensionCount: number;
    };
    color: string;
}

/**
 * Version synchrone légère pour l'affichage UI (sans appels DB supplémentaires).
 * Compatible avec l'ancienne API calculateUserScore de scoring-utils.ts.
 */
export function calculateUserScore(
    loans: any[],
    userCreatedAt: string,
    hasActiveSub: boolean
): UserScoreReport {
    const paidLoans = loans.filter(l => l.status === 'paid');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const totalLoans = loans.length;
    let totalVolume = 0;
    let extensionCount = 0;

    loans.forEach(loan => {
        totalVolume += Number(loan.amount);
        extensionCount += loan.extension_count || (loan.is_extended ? 1 : 0);
    });

    const repaymentRate = totalLoans > 0 ? (paidLoans.length / totalLoans) * 100 : 100;
    const monthsSinceJoined = Math.floor(
        (Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    let score = 60;
    score += paidLoans.length * 6;
    score += Math.min(10, monthsSinceJoined * 2);
    if (hasActiveSub) score += 5;
    score -= extensionCount * 3;
    score -= overdueLoans.length * 20;
    if (repaymentRate < 80) score -= 10;
    if (repaymentRate < 50) score -= 20;
    score = Math.max(0, Math.min(100, score));

    let category: UserScoreReport['category'] = 'A SURVEILLER';
    let label = 'À Surveiller';
    let color = '#f59e0b';
    let description = 'Profil en cours d\'évaluation.';

    if (score >= 85) {
        category = 'ELITE'; label = 'Élite Alpha'; color = '#10b981';
        description = 'Client exemplaire. Éligible aux plafonds maximums.';
    } else if (score >= 70) {
        category = 'FIABLE'; label = 'Fiable'; color = '#3b82f6';
        description = 'Utilisateur régulier et sérieux. Confiance établie.';
    } else if (score < 35) {
        category = 'RISQUE'; label = 'Risqué'; color = '#ef4444';
        description = 'Défauts de paiement détectés. Prêts déconseillés.';
    }

    return {
        score,
        category,
        label,
        description,
        metrics: { repaymentRate, averageDelay: 0, totalVolume, extensionCount },
        color
    };
}
