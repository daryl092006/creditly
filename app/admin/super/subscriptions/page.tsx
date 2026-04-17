import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import SubscriptionTable from './SubscriptionTable'
import { requireAdminRole } from '@/utils/admin-security'

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: any }) {
    const params = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams || {}))
    const initialPlan = params.plan || 'all';

    await requireAdminRole(['superadmin', 'admin_comptable'])
    const supabase = await createClient()
    const { data: allSubs } = await supabase
        .from('user_subscriptions')
        .select(`
            *,
            plan:abonnements(*),
            user:user_id(*),
            reviewer:admin_id(nom, prenom, roles)
        `)
        .order('status', { ascending: false })
        .order('created_at', { ascending: false })

    const rows = (allSubs || []).map((sub: any) => ({
        ...sub,
        plan: {
            ...sub.plan,
            name: sub.snapshot_name ?? sub.plan?.name,
            price: sub.snapshot_price ?? sub.plan?.price,
            max_loan_amount: sub.snapshot_max_loan_amount ?? sub.plan?.max_loan_amount,
            max_loans_per_month: sub.snapshot_max_loans_per_month ?? sub.plan?.max_loans_per_month,
            repayment_delay_days: sub.snapshot_repayment_delay_days ?? sub.plan?.repayment_delay_days,
            service_fee: sub.snapshot_service_fee ?? sub.plan?.service_fee
        }
    }))

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="admin-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/super" className="text-slate-500 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 mb-4 group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Retour au Centre de Contrôle
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Validation Abonnements</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Vérifiez les preuves de paiement et activez les comptes</p>
                    </div>
                </div>

                <div className="glass-panel overflow-hidden bg-slate-900/50 border-slate-800">
                    <SubscriptionTable rows={rows} initialPlan={initialPlan} />
                </div>
            </div>
        </div>
    )
}
