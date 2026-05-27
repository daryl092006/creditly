/**
 * Centralize all loan calculation logic to avoid discrepancies between pages.
 */

export interface LoanData {
    id?: string;
    amount: number;
    amount_paid: number;
    service_fee?: number | null;
    is_extended?: boolean;
    extension_fee?: number;
    created_at: string;
    due_date?: string | null;
    status: string;
    payout_name?: string | null;
}

export function calculateLoanDebt(loan: LoanData, penaltyRatePerDay: number = 0.01) {
    const principle = Number(loan.amount) || 0;
    const paid = Number(loan.amount_paid) || 0;

    // 1. Service Fee Calculation (standard fallback for older records)
    const fee = (loan.service_fee !== null && loan.service_fee !== undefined)
        ? Number(loan.service_fee)
        : (new Date(loan.created_at) >= new Date('2026-03-09') ? 500 : 0);

    // 2. Extension Fee
    const extensionFee = Number(loan.extension_fee) || 0;

    const baseDebt = principle + fee + extensionFee - paid;

    // 3. Late Penalties Calculation
    let latePenalties = 0;
    let daysLate = 0;

    // Detect if this is an Admin/Staff Loan
    // Admin loans are explicitly created with service_fee = 0 and/or payout_name containing "staff"
    const isStaffLoan = loan.service_fee === 0 || (loan.payout_name && loan.payout_name.toLowerCase().includes('staff'));

    if (loan.status === 'overdue' && loan.due_date && !isStaffLoan) {
        const dueDate = new Date(loan.due_date);
        const today = new Date();

        if (today > dueDate) {
            const diffTime = today.getTime() - dueDate.getTime();
            daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

            // Correction demandée : Commencer à compter à partir du lendemain (soit -1 jour de retard facturé)
            if (daysLate > 0) daysLate -= 1;

            if (daysLate > 0 && new Date(loan.created_at) >= new Date('2026-04-02')) {
                // Calculation: 1% of the remaining base debt per day (Rule for dossiers since April 2nd, 2026)
                latePenalties = Math.max(0, baseDebt * penaltyRatePerDay * daysLate);
            }
        }
    }

    return {
        principle,
        fee,
        extensionFee,
        paid,
        baseDebt,
        latePenalties: Math.round(latePenalties),
        totalDebt: Math.max(0, Math.round(baseDebt + latePenalties)),
        daysLate
    };
}

