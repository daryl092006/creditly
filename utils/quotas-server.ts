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

        // 2. Get active subscriptions
        const { data: activeSubs, error: subError } = await supabase
            .from('user_subscriptions')
            .select('id, plan_id, user_id, plan:abonnements(max_loans_per_month)')
            .eq('status', 'active')
            .gte('end_date', new Date().toISOString());

        if (subError) {
            console.error('Error fetching active subscriptions for quotas:', subError);
            return {};
        }

        // 3. Get all active loans (to verify standing)
        // An active loan means the user IS using the quota
        const { data: activeLoans } = await supabase
            .from('prets')
            .select('user_id, status, amount, amount_paid')
            .in('status', ['pending', 'approved', 'active', 'overdue']);

        // Count loans per user per plan context
        const userActivity: Record<string, { debt: number, loanCount: number }> = {};
        activeLoans?.forEach(loan => {
            if (!userActivity[loan.user_id]) userActivity[loan.user_id] = { debt: 0, loanCount: 0 };

            // Still owes money? (Including pending/approved)
            const owes = Number(loan.amount) - Number(loan.amount_paid);
            if (owes > 0 || loan.status !== 'pending') {
                userActivity[loan.user_id].debt += 1; // Simplify: has at least one active debt/process
            }
            userActivity[loan.user_id].loanCount += 1;
        });

        const counts: Record<string, number> = {};

        (activeSubs as any[] || []).forEach((sub) => {
            const activity = userActivity[sub.user_id] || { debt: 0, loanCount: 0 };
            const maxAllowed = sub.plan?.max_loans_per_month || 0;

            const isUsingQuota =
                activity.debt > 0 ||           // A encore une dette ou un dossier en cours
                activity.loanCount < maxAllowed; // N'a pas encore atteint sa limite de prêts

            if (isUsingQuota) {
                const pid = sub.plan_id;
                counts[pid] = (counts[pid] || 0) + 1;
            }
        });

        const { data: allPlans } = await supabase.from('abonnements').select('id, name, max_loan_amount');
        const plans = (allPlans || []) as unknown as Abonnement[];

        const status: Record<string, { count: number, limit: number, reached: boolean }> = {};

        plans.forEach((p) => {
            const pid = p.id;
            const q = limits.find((ql: any) =>
                (ql.plan_id && ql.plan_id === pid) ||
                (!ql.plan_id && Number(ql.amount) === Number(p.max_loan_amount))
            );

            const limit = q ? parseInt(q.monthly_limit.toString()) : -1;
            const count = counts[pid] || 0;
            const reached = limit >= 0 ? count >= limit : false;

            status[pid] = { count, limit, reached };
        });

        return status;
    } catch (err) {
        console.error('CRITICAL ERROR in checkGlobalQuotasStatus:', err);
        return {};
    }
}
