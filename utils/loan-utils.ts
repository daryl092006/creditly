/**
 * Centralize all loan calculation logic to avoid discrepancies between pages.
 */

export interface LoanData {
    amount: number;
    amount_paid: number;
    service_fee?: number | null;
    created_at: string;
    due_date?: string | null;
    status: string;
}

export function calculateLoanDebt(loan: LoanData, penaltyRatePerDay: number = 0.01) {
    const principle = Number(loan.amount) || 0;
    const paid = Number(loan.amount_paid) || 0;

    // 1. Service Fee Calculation (standard fallback for older records)
    const fee = Number(loan.service_fee) !== null && loan.service_fee !== undefined
        ? Number(loan.service_fee)
        : (new Date(loan.created_at) >= new Date('2026-03-09') ? 500 : 0);

    const baseDebt = principle + fee - paid;

    // 2. Late Penalties Calculation
    let latePenalties = 0;
    let daysLate = 0;

    if (loan.status === 'overdue' && loan.due_date) {
        // Late penalties apply based on the loan's due date
        const dueDate = new Date(loan.due_date);
        const today = new Date();

        if (today > dueDate) {
            const diffTime = today.getTime() - dueDate.getTime();
            daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (daysLate > 0) {
                // Calculation: 1% of the remaining base debt per day
                latePenalties = Math.max(0, baseDebt * penaltyRatePerDay * daysLate);
            }
        }
    }

    return {
        principle,
        fee,
        paid,
        baseDebt,
        latePenalties: Math.round(latePenalties),
        totalDebt: Math.max(0, Math.round(baseDebt + latePenalties)),
        daysLate
    };
}
