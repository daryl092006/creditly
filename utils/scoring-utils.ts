import { LoanData, calculateLoanDebt } from './loan-utils';

export interface UserScoreReport {
    score: number;
    category: 'ELITE' | 'RELIABLE' | 'WATCH' | 'RISKY';
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
    hasActiveSub: boolean
): UserScoreReport {
    let score = 60; // Base score for a neutral/new account
    
    const paidLoans = loans.filter(l => l.status === 'paid');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const activeLoans = loans.filter(l => l.status === 'active');
    
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
    
    // Penalize if high volume but low repayment
    const repaymentRate = totalLoans > 0 ? (totalPaidOnTime / totalLoans) * 100 : 100;
    if (repaymentRate < 80) score -= 15;
    if (repaymentRate < 50) score -= 30;

    // Constrain score
    score = Math.max(0, Math.min(100, score));

    // Determine category
    let category: UserScoreReport['category'] = 'WATCH';
    let label = 'À Surveiller';
    let color = '#f59e0b'; // Amber
    let description = 'Profil en cours d&apos;évaluation ou présentant des irrégularités mineures.';

    if (score >= 90) {
        category = 'ELITE';
        label = 'Élite Alpha';
        color = '#10b981'; // Emerald
        description = 'Client exemplaire. Historique parfait, éligible aux plafonds maximums.';
    } else if (score >= 70) {
        category = 'RELIABLE';
        label = 'Fiable';
        color = '#3b82f6'; // Blue
        description = 'Utilisateur régulier et sérieux. Confiance établie.';
    } else if (score < 40) {
        category = 'RISKY';
        label = 'Risqué';
        color = '#ef4444'; // Red
        description = 'Défauts de paiement ou retards critiques. Prêts déconseillés.';
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
