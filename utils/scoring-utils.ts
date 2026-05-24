import { LoanData, calculateLoanDebt } from './loan-utils';

export interface UserScoreReport {
    score: number;
    category: 'ELITE' | 'FIABLE' | 'STANDARD' | 'A SURVEILLER' | 'RISQUE';
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

export function calculateUserScore(
    loans: any[],
    userCreatedAt: string,
    hasActiveSub: boolean,
    isAdmin: boolean = false
): UserScoreReport {
    if (isAdmin) {
        return {
            score: 100,
            category: 'ELITE',
            label: 'Staff Interne',
            color: '#10b981',
            description: 'Membre de l\'administration exempté de l\'analyse des risques automatiques.',
            metrics: { repaymentRate: 100, averageDelay: 0, totalVolume: 0, extensionCount: 0 }
        };
    }

    let score = 60; // Base score for a neutral/new account

    const paidLoans = loans.filter(l => l.status === 'paid');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const activeLoans = loans.filter(l => l.status === 'active');
    const finishedLoansCount = paidLoans.length + overdueLoans.length;

    const totalLoans = loans.length;
    let totalVolume = 0;
    let extensionCount = 0;
    let totalPaidOnTime = 0;

    loans.forEach(loan => {
        totalVolume += Number(loan.amount);
        if (loan.is_extended) extensionCount++;

        // Simple heuristic for "on-time": if paid and no extension, or if paid before due_date
        if (loan.status === 'paid') {
            // Note: In a real DB we'd check paid_at vs due_date
            // For now, if it's paid it's good, but extensions reduce score slightly
            totalPaidOnTime++;
        }
    });

    // 1. Positive impacts
    score += (totalPaidOnTime * 8); // +8 per successful loan
    if (hasActiveSub) score += 5; // +5 for being a subscriber

    // Longevity bonus
    const monthsSinceJoined = Math.floor((new Date().getTime() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    score += Math.min(10, monthsSinceJoined * 2);

    // 2. Negative impacts
    score -= (extensionCount * 5); // -5 per extension used (fragility indicator)
    score -= (overdueLoans.length * 35); // -35 per currently overdue loan (Critical)

    // Penalize if high volume but low repayment (only finished loans)
    const repaymentRate = finishedLoansCount > 0 ? (totalPaidOnTime / finishedLoansCount) * 100 : 100;
    if (repaymentRate < 80) score -= 15;
    if (repaymentRate < 50) score -= 30;

    // Constrain score
    score = Math.max(0, Math.min(100, score));

    // Determine category
    let category: UserScoreReport['category'] | 'STANDARD' = 'STANDARD';
    let label = 'Standard';
    let color = '#6b7280'; // Gray
    let description = 'Profil standard aux capacités d&apos;emprunt classiques.';

    if (score >= 90) {
        category = 'ELITE';
        label = 'Élite Alpha';
        color = '#10b981'; // Emerald
        description = 'Client exemplaire. Historique parfait, éligible aux plafonds maximums.';
    } else if (score >= 70) {
        category = 'FIABLE';
        label = 'Fiable';
        color = '#3b82f6'; // Blue
        description = 'Utilisateur régulier et sérieux. Confiance établie.';
    } else if (score < 40) {
        category = 'RISQUE';
        label = 'Risqué';
        color = '#ef4444'; // Red
        description = 'Défauts de paiement ou retards critiques. Prêts déconseillés.';
    } else if (score < 60) {
        // Technically mapped to A SURVEILLER
        category = 'A SURVEILLER';
        label = 'À Surveiller';
        color = '#f59e0b'; // Amber
        description = 'Profil en baisse ou présentant des incidents mineurs.';
    }

    return {
        score,
        category,
        label,
        description,
        metrics: {
            repaymentRate,
            averageDelay: 0, // Would need more data
            totalVolume,
            extensionCount
        },
        color
    };
}
