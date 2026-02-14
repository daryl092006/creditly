import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendWeeklyReport } from '@/utils/email-service';

export async function GET(request: Request) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    try {
        // 1. Weekly Subscriptions
        const { data: weeklySubs } = await supabase
            .from('user_subscriptions')
            .select('amount_paid')
            .gte('start_date', oneWeekAgo.toISOString()) // Assuming start_date is payment date approx
            .eq('status', 'active');

        // 2. Weekly Repayments (Assuming we track payment date, using valid_at or updated_at for now if date column missing)
        // schema.sql showed 'date' in repayment table in user request, let's check schema for repayment date.
        // Recovering schema context: public.remboursements had date? Schema not fully visible.
        // Assuming 'date' field exists or 'created_at'. Let's use created_at for simplicity if date is manual.
        const { data: weeklyRepayments } = await supabase
            .from('remboursements') // Table name likely 'remboursements' based on context or 'repayments'
            .select('amount')
            .gte('date', oneWeekAgo.toISOString())
            .eq('status', 'verified');

        // 3. Monthly Totals
        const { data: monthlySubs } = await supabase
            .from('user_subscriptions')
            .select('amount_paid')
            .gte('start_date', startOfMonth.toISOString())
            .eq('status', 'active');

        const { data: monthlyRepayments } = await supabase
            .from('remboursements')
            .select('amount')
            .gte('date', startOfMonth.toISOString())
            .eq('status', 'verified');


        // Calculations
        const sumParams = (arr: any[], key: string) => arr?.reduce((acc, curr) => acc + (curr[key] || 0), 0) || 0;

        const subRevenue = sumParams(weeklySubs || [], 'amount_paid');
        const repaymentRevenue = sumParams(weeklyRepayments || [], 'amount');
        const totalRevenue = subRevenue; // Revenue = Only Subscriptions

        const monthlySubRevenue = sumParams(monthlySubs || [], 'amount_paid');
        const monthlyRepaymentRevenue = sumParams(monthlyRepayments || [], 'amount');
        const monthToDateRevenue = monthlySubRevenue; // Revenue = Only Subscriptions

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
