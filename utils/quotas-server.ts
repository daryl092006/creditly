import { createClient } from './supabase/server';

export const GLOBAL_MONTHLY_QUOTAS: Record<number, number> = {
    5000: 4,
    10000: 5,
    25000: 10,
    50000: 4,
    100000: 1
};

export async function checkGlobalQuotasStatus(month?: number, year?: number) {
    const supabase = await createClient();

    // Determine target period
    const targetDate = new Date();
    const mm = month !== undefined ? month - 1 : targetDate.getMonth();
    const yyyy = year !== undefined ? year : targetDate.getFullYear();

    const startOfPeriod = new Date(yyyy, mm, 1, 0, 0, 0);
    const endOfPeriod = new Date(yyyy, mm + 1, 0, 23, 59, 59);

    const { data: loans, error } = await supabase
        .from('prets')
        .select('amount')
        .neq('status', 'rejected')
        .gte('created_at', startOfPeriod.toISOString())
        .lte('created_at', endOfPeriod.toISOString());

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
