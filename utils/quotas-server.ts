import { createAdminClient } from './supabase/server';

export async function checkGlobalQuotasStatus(month?: number, year?: number) {
    const supabase = await createAdminClient();

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
        .select('plan_id')
        .neq('status', 'rejected')
        .gte('created_at', startOfPeriod.toISOString())
        .lte('created_at', endOfPeriod.toISOString());

    if (subError) {
        console.error('Error fetching subscriptions for quotas:', subError);
        return {};
    }

    const counts: Record<string, number> = {};
    subs.forEach((sub: any) => {
        const pid = sub.plan_id;
        if (pid) {
            counts[pid] = (counts[pid] || 0) + 1;
        }
    });

    const status: Record<string, { count: number, limit: number, reached: boolean }> = {};

    quotaLimits.forEach((q: any) => {
        const pid = q.plan_id;
        if (!pid) return;
        const limit = Number(q.monthly_limit);
        const count = counts[pid] || 0;
        status[pid] = {
            count,
            limit,
            reached: limit > 0 && count >= limit
        };
    });

    return status;
}
