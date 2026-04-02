/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import Link from 'next/link'
import { Currency, Document, ChevronRight, Filter, Time, Wallet, UserMultiple, Identification, RequestQuote, Receipt } from '@carbon/icons-react'
import { checkGlobalQuotasStatus } from '@/utils/quotas-server'
import { AdminWithdrawalsManagement } from './WithdrawalManagement'
import { DashboardFilters } from './DashboardFilters'

export default async function SuperAdminPage({
    searchParams
}: {
    searchParams: any
}) {
    // 1. Security & Time Context
    await requireAdminRole(['superadmin', 'admin_comptable', 'owner'])

    // Safety check for searchParams (handling both Sync/Async for Next v14/15)
    const params = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams || {}))

    const now = new Date()
    const period = params.period || 'month'
    const month = params.month ? parseInt(params.month) : now.getMonth() + 1
    const year = params.year ? parseInt(params.year) : now.getFullYear()

    let startDate: string;
    let endDate: string = new Date(year, month, 0, 23, 59, 59).toISOString();

    if (period === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        startDate = lastWeek.toISOString();
        endDate = new Date().toISOString();
    } else {
        startDate = new Date(year, month - 1, 1).toISOString();
    }

    const supabase = await createClient()

    const { calculateLoanDebt } = await import('@/utils/loan-utils')

    // 2. Data Fetching - High-Speed Concurrent Execution
    const [
        { data: monthlySubs },
        { data: allRemboursements },
        { data: allActiveLoans },
        { data: allPaidLoans },
        { count: pendingKyc },
        { count: pendingLoans },
        { count: pendingSubs },
        { count: pendingRepayments },
        globalQuotas,
        { data: allOffersNames },
        { data: admins },
        { data: kycData },
        { data: loanData },
        { data: repaymentData },
        { data: totalCommissions, error: errComm },
        { data: pendingWithdrawals, error: errWith }
    ] = await Promise.all([
        supabase.from('user_subscriptions').select('*, plan:abonnements(price)').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('remboursements').select('*, loan:prets(amount, amount_paid, service_fee, created_at, status, due_date)').eq('status', 'verified').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('prets').select('amount, amount_paid, service_fee, created_at, status, due_date').in('status', ['active', 'overdue']),
        supabase.from('prets').select('amount, amount_paid, admin_id, created_at, status, service_fee').eq('status', 'paid'),
        supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('prets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('remboursements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        checkGlobalQuotasStatus(month, year),
        supabase.from('abonnements').select('id, name, max_loan_amount'),
        supabase.from('users').select('id, nom, prenom, roles').overlaps('roles', ['admin_kyc', 'admin_loan', 'admin_repayment', 'admin_comptable', 'superadmin', 'owner']),
        supabase.from('kyc_submissions').select('admin_id, status').gte('reviewed_at', startDate).lte('reviewed_at', endDate).not('admin_id', 'is', null),
        supabase.from('prets').select('admin_id, status, created_at').gte('admin_decision_date', startDate).lte('admin_decision_date', endDate).not('admin_id', 'is', null),
        supabase.from('remboursements').select('admin_id, status').gte('validated_at', startDate).lte('validated_at', endDate).not('admin_id', 'is', null),
        supabase.from('admin_commissions').select('admin_id, amount, loan:loan_id(status), type'),
        supabase.from('admin_withdrawals').select('*, admin:admin_id(nom, prenom, email, roles)').eq('status', 'pending').order('created_at', { ascending: false })
    ]);

    const monthlyRevenue = monthlySubs?.reduce((acc, sub: any) => acc + (Number(sub.plan?.price) || 0), 0) || 0
    const totalPenaltiesCollected = allPaidLoans?.reduce((acc, l) => {
        const { fee } = calculateLoanDebt(l as any)
        const penalty = Math.max(0, Number(l.amount_paid) - (Number(l.amount) + fee))
        return acc + penalty
    }, 0) || 0
    const activeStats = (allActiveLoans || []).reduce((acc, loan) => acc + calculateLoanDebt(loan as any).totalDebt, 0)
    const totalRemainingToRecover = activeStats

    const totalFeesCollected = allPaidLoans?.reduce((acc, l) => acc + (Number(l.service_fee || 0) * 0.4), 0) || 0
    const monthlyFeesRevenue = allPaidLoans?.filter(l =>
        new Date(l.created_at) >= new Date(startDate) &&
        new Date(l.created_at) <= new Date(endDate)
    ).reduce((acc, l) => acc + Number(l.service_fee || 0), 0) || 0

    const offersMap: Record<string, string> = {}
    allOffersNames?.forEach(o => {
        offersMap[o.id] = o.name
        offersMap[o.max_loan_amount.toString()] = o.name
    })

    const quotasArray = Object.entries(globalQuotas || {}).map(([key, val]: any) => {
        const name = offersMap[key] || (key.length > 5 ? 'Offre Inconnue' : `${key} F`)
        return {
            label: name,
            value: val.count,
            limit: val.limit,
            remaining: Math.max(0, val.limit - val.count),
            percent: val.limit > 0 ? (val.count / val.limit) * 100 : val.limit === 0 ? 100 : 0,
            status: val.reached ? 'danger' : (val.limit > 0 && val.count / val.limit > 0.8) ? 'warning' : 'success'
        }
    }).filter(q => q.limit >= 0)


    if (errComm || errWith) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-2xl font-black text-red-500 mb-4 tracking-tighter uppercase italic">ERREUR DE CHARGEMENT</h1>
                <p className="text-slate-500 italic max-w-lg mx-auto mb-8">Certaines tables système sont inaccessibles.</p>
                <div className="p-6 bg-slate-900 border border-red-500/20 rounded-2xl inline-block text-left font-mono text-xs text-red-400">
                    {errComm?.message || errWith?.message}
                </div>
            </div>
        )
    }

    const adminPerformance = (admins || []).map((admin: any) => {
        const kycCount = kycData?.filter(a => a.admin_id === admin.id).length || 0
        const loanCountRaw = loanData?.filter(a => a.admin_id === admin.id) || []
        const loanCountTotal = loanCountRaw.length
        const loanApprovedCount = loanCountRaw.filter(l => ['approved', 'active', 'paid', 'overdue'].includes(l.status)).length
        const totalRealizedGains = totalCommissions?.filter((c: any) => c.admin_id === admin.id && (c.loan?.status === 'paid' || c.type === 'repayment_reward')).reduce((acc, c) => acc + Number(c.amount), 0) || 0
        const repaymentCount = repaymentData?.filter(a => a.admin_id === admin.id).length || 0

        return {
            ...admin,
            totalActions: kycCount + loanCountTotal + repaymentCount,
            totalEarnings: totalRealizedGains,
            details: { kycCount, loanCount: loanCountTotal, loanApprovedCount, repaymentCount }
        }
    }).sort((a: any, b: any) => b.totalActions - a.totalActions)

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Currency size={24} />
                            </span>
                            <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Control Center</h1>
                        </div>
                        <p className="text-slate-500 font-bold italic leading-relaxed">Intelligence financière et monitoring opérationnel</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/admin/finance" className="px-5 py-2.5 rounded-2xl bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all italic">
                            Audit Comptable
                        </Link>
                        <DashboardFilters currentMonth={month} currentYear={year} currentPeriod={period} />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                    {[
                        { label: 'Revenue Période', value: monthlyRevenue + monthlyFeesRevenue, color: 'text-emerald-400', sub: `Subs + ${monthlyFeesRevenue.toLocaleString('fr-FR')} F frais`, icon: <Currency size={20} /> },
                        { label: 'Admin Gain (Total)', value: totalFeesCollected, color: 'text-blue-400', sub: 'Sur dossiers remboursés', icon: <Time size={20} /> },
                        { label: 'Volume Pénalités', value: totalPenaltiesCollected, color: 'text-blue-400', sub: 'Surplus perçus périodiquement', icon: <Wallet size={20} /> },
                        { label: 'Dette Totale', value: totalRemainingToRecover, color: 'text-red-400', sub: 'À récupérer sur prêts actifs', icon: <Document size={20} /> }
                    ].map((kpi, i) => (
                        <div key={i} className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex flex-col justify-between group hover:border-blue-500/30 transition-all shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-slate-500 group-hover:text-blue-500 transition-colors">{kpi.icon}</div>
                                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">{kpi.label}</h2>
                                <p className={`text-2xl font-black tracking-tighter italic ${kpi.color}`}>
                                    {kpi.value.toLocaleString('fr-FR')} <span className="text-[10px] uppercase ml-1 not-italic">F</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-12">
                        <section>
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center text-xs font-black shadow-inner">!</span>
                                Urgences Systèmes
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { label: 'KYC à valider', count: pendingKyc, href: '/admin/kyc', color: 'bg-amber-500' },
                                    { label: 'Prêts en attente', count: pendingLoans, href: '/admin/loans', color: 'bg-blue-600' },
                                    { label: 'Paiements Subscriptions', count: pendingSubs, href: '/admin/super/subscriptions', color: 'bg-emerald-600' },
                                    { label: 'Remboursements', count: pendingRepayments, href: '/admin/repayments', color: 'bg-purple-600' }
                                ].map((item, i) => (
                                    <Link key={i} href={item.href} className="glass-panel p-6 flex items-center justify-between group bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all">
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-white italic uppercase tracking-tight">{item.label}</p>
                                        </div>
                                        <div className={`w-12 h-12 ${(item.count || 0) > 0 ? item.color + '/10 text-' + item.color.split('-')[1] + '-500 border border-' + item.color.split('-')[1] + '-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]' : 'bg-slate-950 border border-white/5 text-slate-700'} rounded-2xl flex items-center justify-center font-black transition-transform group-hover:scale-110`}>
                                            {item.count}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section>
                            <AdminWithdrawalsManagement initialWithdrawals={pendingWithdrawals || []} />
                        </section>

                        <section>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-xs font-black shadow-inner">Q</span>
                                    Santé des Quotas
                                </h3>
                                <Link href="/admin/super/offers" className="px-4 py-2 rounded-xl bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-white/5 hover:bg-slate-700 hover:text-white transition-all italic">
                                    Modifier les Offres & Quotas
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {quotasArray.map((quota, i) => (
                                    <div key={i} className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{quota.label}</p>
                                                <p className="text-lg font-black text-white italic tracking-tighter uppercase">{quota.value} / {quota.limit}</p>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${quota.status === 'danger' ? 'text-red-500' : 'text-slate-500'}`}>
                                                    {quota.remaining <= 0 ? 'COMPLET' : `Encore ${quota.remaining} libre(s)`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xl font-black italic ${quota.status === 'danger' ? 'text-red-500' : quota.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {Math.round(quota.percent || 0)}%
                                                </p>
                                                <Link href={`/admin/super/subscriptions?plan=${quota.label}`} className="text-[7px] font-black text-blue-500 hover:text-white uppercase tracking-[0.2em] transition-all underline decoration-blue-500/30">
                                                    Voir Liste
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                            <div className={`h-full transition-all duration-1000 ${quota.status === 'danger' ? 'bg-red-500' : quota.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${quota.percent}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xs font-black shadow-inner">P</span>
                                Activité des Admins
                            </h3>
                            <div className="space-y-3">
                                {adminPerformance.map((admin: any, i: number) => (
                                    <div key={i} className="glass-panel p-4 bg-slate-900/50 border-slate-800 group hover:border-white/10 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-xs font-black text-blue-500 shadow-inner">
                                                    {(admin.prenom || '')[0]}{(admin.nom || '')[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white italic uppercase tracking-tight">{admin.prenom} {admin.nom}</p>
                                                    <p className="text-[9px] font-black text-slate-700 tracking-widest italic">{admin.roles?.[0]?.replace('admin_', '')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black italic tracking-tighter leading-none text-white">{admin.totalActions}</p>
                                                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic">Actions Période</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-white italic">{admin.details.kycCount}</p>
                                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">KYC</p>
                                            </div>
                                            <div className="text-center border-x border-white/5">
                                                <p className="text-xs font-black text-white italic">{admin.details.loanApprovedCount}</p>
                                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Prêts</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-white italic">{admin.details.repaymentCount}</p>
                                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Remb.</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
