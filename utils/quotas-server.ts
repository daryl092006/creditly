import { createAdminClient } from './supabase/server';

interface SubPreview {
    plan_id: string;
}

interface QuotaLimit {
    amount: number;
    monthly_limit: number;
}

interface Abonnement {
    id: string;
    max_loan_amount: number;
}

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

        const limits = (quotaLimits || []) as unknown as QuotaLimit[];

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
        (subs as unknown as SubPreview[] || []).forEach((sub) => {
            const pid = sub.plan_id;
            if (pid) {
                counts[pid] = (counts[pid] || 0) + 1;
            }
        });

        const { data: allPlans } = await supabase.from('abonnements').select('id, max_loan_amount');
        const plans = (allPlans || []) as unknown as Abonnement[];

        const status: Record<string, { count: number, limit: number, reached: boolean }> = {};

        plans.forEach((p) => {
            const pid = p.id;
            // The table global_quotas is indexed by AMOUNT, not PLAN_ID
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const q = limits.find((ql) => Number(ql.amount) === Number(p.max_loan_amount));

            // DEFAULT TO -1 (UNLIMITED) if not in the quotas table
            const limit = q ? parseInt(q.monthly_limit.toString()) : -1;
            const count = counts[pid] || 0;
            const reached = limit >= 0 ? count >= limit : false; // If limit is negative, it's unlimited

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
