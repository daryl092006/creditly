import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { sendWeeklyReport } from '@/utils/email-service';
import { getPlatformCapital } from '@/utils/finance-utils';

export async function GET(request: Request) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    try {
        // 1. Weekly Subscriptions
        const { data: weeklySubs } = await supabase
            .from('user_subscriptions')
            .select('amount_paid')
            .gte('start_date', oneWeekAgo.toISOString())
            .eq('status', 'active');

        // 2. Weekly Repayments
        const { data: weeklyRepayments } = await supabase
            .from('remboursements')
            .select('amount_declared')
            .gte('created_at', oneWeekAgo.toISOString())
            .eq('status', 'verified');

        // 3. Monthly Totals
        const { data: monthlySubs } = await supabase
            .from('user_subscriptions')
            .select('amount_paid')
            .gte('start_date', startOfMonth.toISOString())
            .eq('status', 'active');

        const { data: monthlyRepayments } = await supabase
            .from('remboursements')
            .select('amount_declared')
            .gte('created_at', startOfMonth.toISOString())
            .eq('status', 'verified');

        // Calculations
        const sumParams = (arr: any[], key: string) => arr?.reduce((acc, curr) => acc + (curr[key] || 0), 0) || 0;

        const subRevenue = sumParams(weeklySubs || [], 'amount_paid');
        const repaymentRevenue = sumParams(weeklyRepayments || [], 'amount_declared');
        const totalRevenue = subRevenue;

        const monthlySubRevenue = sumParams(monthlySubs || [], 'amount_paid');
        const monthlyRepaymentRevenue = sumParams(monthlyRepayments || [], 'amount_declared');
        const monthToDateRevenue = monthlySubRevenue;

        // ── SNAPSHOT DE LIQUIDITÉ PLATEFORME ────────────────────────────────
        try {
            const { data: activeLoans } = await supabaseAdmin
                .from('prets')
                .select('amount, amount_paid')
                .in('status', ['active', 'overdue', 'approved']);

            const totalActiveLoans = activeLoans?.reduce(
                (acc, l) => acc + Math.max(0, Number(l.amount) - Number(l.amount_paid || 0)), 0
            ) || 0;

            const totalFunds = await getPlatformCapital(supabaseAdmin);
            const exposureRate = totalFunds > 0 ? (totalActiveLoans / totalFunds) * 100 : 0;

            let decisionStatus: 'NORMAL' | 'CAUTION' | 'RESTRICTED' | 'PAUSED' = 'NORMAL';
            if (exposureRate > 95) decisionStatus = 'PAUSED';
            else if (exposureRate > 85) decisionStatus = 'RESTRICTED';
            else if (exposureRate > 70) decisionStatus = 'CAUTION';

            await supabaseAdmin.from('platform_liquidity_snapshots').insert({
                total_funds: totalFunds,
                total_active_loans: totalActiveLoans,
                exposure_rate: Math.round(exposureRate * 100) / 100,
                decision_status: decisionStatus,
                snapshot_date: today.toISOString()
            });
        } catch (liquidityError) {
            console.error('[LiquiditySnapshot] Erreur non-bloquante:', liquidityError);
        }
        // ── FIN SNAPSHOT LIQUIDITÉ ───────────────────────────────────────────

        await sendWeeklyReport({
            startDate: oneWeekAgo.toLocaleDateString('fr-FR'),
            endDate: today.toLocaleDateString('fr-FR'),
            totalRevenue,
            subscriptionsRevenue: subRevenue,
            repaymentsRevenue: repaymentRevenue,
            newSubscriptionsCount: weeklySubs?.length || 0,
            repaymentsCount: weeklyRepayments?.length || 0,
            monthToDateRevenue
        });

        return NextResponse.json({ success: true, revenue: totalRevenue });

    } catch (error: any) {
        console.error('Weekly Report Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

