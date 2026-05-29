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

    // Detect if this is an Admin/Staff Loan (Service fee 0 is the primary indicator)
    const isStaffLoan = Number(loan.service_fee) === 0 || (loan.payout_name && loan.payout_name.toLowerCase().includes('staff'));

    if ((loan.status === 'overdue' || loan.status === 'paid') && loan.due_date && !isStaffLoan) {
        const dueDate = new Date(loan.due_date);
        const endDate = loan.status === 'paid'
            ? new Date((loan as any).closed_at || (loan as any).updated_at || (loan as any).admin_decision_date || new Date())
            : new Date();

        if (endDate > dueDate) {
            const diffTime = endDate.getTime() - dueDate.getTime();
            daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

            // Correction demandée : Commencer à compter à partir du lendemain
            if (daysLate > 0) daysLate -= 1;

            if (daysLate > 0 && new Date(loan.created_at) >= new Date('2026-04-02')) {
                // Pour les prêts payés, on ne peut pas se baser sur baseDebt (qui est à 0)
                // On utilise le capital original pour estimer les pénalités dues lors du retard
                const referenceAmount = loan.status === 'paid' ? principle : baseDebt;
                latePenalties = Math.max(0, referenceAmount * penaltyRatePerDay * daysLate);
            }
        }
    }

    // Sécurité : Si le prêt est marqué comme 'paid', la dette totale DOIT être de 0
    // Sauf si on fait un calcul d'audit de ce qui était dû.
    const totalDebt = loan.status === 'paid' ? 0 : Math.max(0, Math.round(baseDebt + latePenalties));

    return {
        principle,
        fee,
        extensionFee,
        paid,
        baseDebt,
        latePenalties: Math.round(latePenalties),
        totalDebt,
        daysLate
    };
}

