import { createClient } from './supabase/server';

export const GLOBAL_MONTHLY_QUOTAS: Record<number, number> = {
    5000: 4,
    10000: 5,
    25000: 10,
    50000: 4,
    100000: 1
};

export async function checkGlobalQuotasStatus() {
    const supabase = await createClient();

    // Get counts for the current month for all amounts in our quotas
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: loans, error } = await supabase
        .from('prets')
        .select('amount')
        .neq('status', 'rejected')
        .gte('created_at', startOfMonth.toISOString());

    if (error) {
        console.error('Error fetching global quotas:', error);
        return {};
    }

    const counts: Record<number, number> = {};
    loans.forEach(loan => {
        const amt = Number(loan.amount);
        counts[amt] = (counts[amt] || 0) + 1;
    });

    const status: Record<number, { count: number, limit: number, reached: boolean }> = {};

    Object.entries(GLOBAL_MONTHLY_QUOTAS).forEach(([amtStr, limit]) => {
        const amt = Number(amtStr);
        const count = counts[amt] || 0;
        status[amt] = {
            count,
            limit,
            reached: count >= limit
        };
    });

    return status;
}
