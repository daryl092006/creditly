import { createClient } from './supabase/server';

export async function checkGlobalQuotasStatus(month?: number, year?: number) {
    const supabase = await createClient();

    // Determine target period
    const targetDate = new Date();
    const mm = month !== undefined ? month - 1 : targetDate.getMonth();
    const yyyy = year !== undefined ? year : targetDate.getFullYear();

    const startOfPeriod = new Date(yyyy, mm, 1, 0, 0, 0);
    const endOfPeriod = new Date(yyyy, mm + 1, 0, 23, 59, 59);

    // 1. Get Quota Limits from DB
    const { data: quotaLimits, error: quotaError } = await supabase
        .from('global_quotas')
        .select('*');

    if (quotaError) {
        console.error('Error fetching quota limits:', quotaError);
        return {};
    }

    // 2. Get Subscriptions for period
    const { data: subs, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, plan:abonnements(max_loan_amount)')
        .neq('status', 'rejected')
        .gte('created_at', startOfPeriod.toISOString())
        .lte('created_at', endOfPeriod.toISOString());

    if (subError) {
        console.error('Error fetching subscriptions for quotas:', subError);
        return {};
    }

    const counts: Record<number, number> = {};
    subs.forEach((sub: any) => {
        const amt = Number(sub.plan?.max_loan_amount);
        if (amt) {
            counts[amt] = (counts[amt] || 0) + 1;
        }
    });

    const status: Record<number, { count: number, limit: number, reached: boolean }> = {};

    quotaLimits.forEach((q: any) => {
        const amt = Number(q.amount);
        const limit = Number(q.monthly_limit);
        const count = counts[amt] || 0;
        status[amt] = {
            count,
            limit,
            reached: limit > 0 && count >= limit
        };
    });

    return status;
}
