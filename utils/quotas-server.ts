import { createAdminClient } from './supabase/server';

export async function checkGlobalQuotasStatus(month?: number, year?: number) {
    try {
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

        if (!quotaLimits) return {};

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
        (subs || []).forEach((sub: any) => {
            const pid = sub.plan_id;
            if (pid) {
                counts[pid] = (counts[pid] || 0) + 1;
            }
        });

        const { data: allPlans } = await supabase.from('abonnements').select('id, max_loan_amount');
        const plans = (allPlans || []) as { id: string, max_loan_amount: number }[];

        const status: Record<string, { count: number, limit: number, reached: boolean }> = {};

        plans.forEach((p) => {
            const pid = p.id;
            const q = (quotaLimits || []).find((ql: any) => ql.plan_id === pid);

            // DEFAULT TO 0 (BLOCKED) if not in the quotas table
            const limit = q ? parseInt(q.monthly_limit) : 0;
            const count = counts[pid] || 0;
            const reached = limit > 0 ? count >= limit : true; // If limit is 0, it's always reached (blocked)

            const quotaObj = {
                count,
                limit,
                reached
            };

            status[pid] = quotaObj;

            // Also index by amount for the UI (Dashboard & Request Form)
            if (p.max_loan_amount) {
                const amtKey = p.max_loan_amount.toString();
                // If multiple plans have the same amount, we prioritize the one with a limit set
                if (!status[amtKey] || (limit > 0 && status[amtKey].limit === 0)) {
                    status[amtKey] = quotaObj;
                }
            }
        });

        return status;
    } catch (err) {
        console.error('CRITICAL ERROR in checkGlobalQuotasStatus:', err);
        return {};
    }
}
