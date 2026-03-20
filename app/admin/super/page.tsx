/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import Link from 'next/link'
import { Currency, Document, ChevronRight, Filter, CheckmarkFilled, Time, Wallet, Checkmark } from '@carbon/icons-react'
import { checkGlobalQuotasStatus } from '@/utils/quotas-server'
import { AdminWithdrawalsManagement } from './WithdrawalManagement'

export default async function SuperAdminPage({
    searchParams
}: {
    searchParams: any
}) {
    // 1. Security & Time Context
    await requireAdminRole(['superadmin', 'admin_comptable', 'owner'])

    // Safety check for searchParams (handling both Sync/Async for Next v14/15)
    let params = searchParams || {}
    if (params instanceof Promise) {
        params = await params
    }

    const now = new Date()
    const month = (params as any).month ? parseInt((params as any).month) : now.getMonth() + 1
    const year = (params as any).year ? parseInt((params as any).year) : now.getFullYear()

    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

    const supabase = await createClient()

    // 2. Data Fetching - Robust against failures
    const { data: monthlySubs } = await supabase.from('user_subscriptions').select('*, plan:abonnements(price)').eq('status', 'active').gte('created_at', startDate).lte('created_at', endDate)
    const monthlyRevenue = monthlySubs?.reduce((acc, sub: any) => acc + (Number(sub.plan?.price) || 0), 0) || 0

    const { data: allRemboursements } = await supabase.from('remboursements').select('surplus_amount').eq('status', 'verified')
    const totalPenaltiesCollected = allRemboursements?.reduce((acc, r) => acc + (Number(r.surplus_amount) || 0), 0) || 0

    const { data: allActiveLoans } = await supabase.from('prets').select('amount, amount_paid').in('status', ['active', 'overdue'])
    const totalActiveCapital = allActiveLoans?.reduce((acc, l) => acc + Number(l.amount), 0) || 0
    const totalAlreadyRecovered = allActiveLoans?.reduce((acc, l) => acc + (Number(l.amount_paid) || 0), 0) || 0
    const totalRemainingToRecover = totalActiveCapital - totalAlreadyRecovered

    const FEE_START_DATE = new Date('2026-03-09T00:00:00')
    const { data: loansWithFees } = await supabase.from('prets').select('admin_id, created_at, status').gte('created_at', FEE_START_DATE.toISOString()).in('status', ['approved', 'active', 'paid', 'overdue'])
    const totalFeesCollected = (loansWithFees?.length || 0) * 500
    const monthlyFeesRevenue = (loansWithFees?.filter(l => new Date(l.created_at) >= new Date(startDate) && new Date(l.created_at) <= new Date(endDate)).length || 0) * 500

    const { count: pendingKyc } = await supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: pendingLoans } = await supabase.from('prets').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: pendingSubs } = await supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: pendingRepayments } = await supabase.from('remboursements').select('*', { count: 'exact', head: true }).eq('status', 'pending')

    const globalQuotas = await checkGlobalQuotasStatus()

    const { data: admins } = await supabase.from('users').select('id, nom, prenom, roles').not('roles', 'cs', '{"client"}')
    const kycActions = await supabase.from('kyc_submissions').select('admin_id, status').not('admin_id', 'is', null)
    const loanActions = await supabase.from('prets').select('admin_id, status, created_at').not('admin_id', 'is', null)
    const repaymentActions = await supabase.from('remboursements').select('admin_id, status').not('admin_id', 'is', null)

    // JOINS FIX: admin:admin_id instead of admin:users
    const { data: totalCommissions } = await supabase.from('admin_commissions').select('admin_id, amount, loan:loan_id(status), type')
    const { data: pendingWithdrawals } = await supabase.from('admin_withdrawals').select('*, admin:admin_id(nom, prenom, email, roles)').eq('status', 'pending').order('created_at', { ascending: false })

    const adminPerformance = admins?.map((admin: any) => {
        const kycCount = kycActions.data?.filter(a => a.admin_id === admin.id).length || 0
        const loanCountRaw = loanActions.data?.filter(a => a.admin_id === admin.id) || []
        const loanCount = loanCountRaw.filter(l => ['approved', 'active', 'paid', 'overdue'].includes(l.status)).length
        const totalRealizedGains = totalCommissions?.filter((c: any) => c.admin_id === admin.id && (c.loan?.status === 'paid' || c.type === 'repayment_reward')).reduce((acc, c) => acc + Number(c.amount), 0) || 0
        const repaymentCount = repaymentActions.data?.filter(a => a.admin_id === admin.id).length || 0
        return { ...admin, totalActions: kycCount + loanCount + repaymentCount, totalEarnings: totalRealizedGains, details: { kycCount, loanCount, repaymentCount } }
    }).sort((a: any, b: any) => (b.totalActions || 0) - (a.totalActions || 0)) || []

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

                    <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 backdrop-blur-xl">
                        <div className="flex bg-slate-800 rounded-xl px-4 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest italic items-center gap-2">
                            <Time size={14} /> {new Date(0, month - 1).toLocaleString('fr', { month: 'long' })} {year}
                        </div>
                        <Link href="/admin/finance" className="px-6 py-2.5 rounded-xl bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-500/20">
                            Ledger Financier
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                    {[
                        { label: 'Revenue Mensuel', value: monthlyRevenue + monthlyFeesRevenue, color: 'text-emerald-400', sub: `Subs + ${monthlyFeesRevenue.toLocaleString()} F frais`, icon: <Currency size={20} /> },
                        { label: 'Admin Gain (Dossiers)', value: totalFeesCollected, color: 'text-blue-400', sub: 'Volume total frais générés', icon: <Time size={20} /> },
                        { label: 'Volume Pénalités', value: totalPenaltiesCollected, color: 'text-blue-400', sub: 'Surplus perçus par Creditly', icon: <Wallet size={20} /> },
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
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-xs font-black shadow-inner">Q</span>
                                Santé des Quotas
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(globalQuotas || []).map((quota, i) => (
                                    <div key={i} className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{quota.label}</p>
                                                <p className="text-lg font-black text-white italic tracking-tighter uppercase">{quota.value} / {quota.limit}</p>
                                            </div>
                                            <p className={`text-xl font-black italic ${quota.status === 'danger' ? 'text-red-500' : quota.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {Math.round(quota.percent)}%
                                            </p>
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
                                Performance & Gains
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
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{admin.roles?.[0]?.replace('admin_', '')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 justify-end text-emerald-500">
                                                    <Checkmark size={12} />
                                                    <p className="text-lg font-black italic tracking-tighter leading-none">{admin.totalEarnings.toLocaleString()} F</p>
                                                </div>
                                                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic">Gains Réalisés</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="glass-panel p-6 bg-blue-600/5 border-blue-500/10 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
                                <Wallet size={20} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Note Système</p>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed italic">Les gains sont provisionnés jusqu'au remboursement effectif du client.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
