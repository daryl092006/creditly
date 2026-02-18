import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import Link from 'next/link'
import { Currency, Document, ChevronRight, Filter, CheckmarkFilled } from '@carbon/icons-react'

export default async function SuperAdminPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    // Security Check - STRICT SUPERADMIN
    await requireAdminRole(['superadmin'])

    const params = await searchParams
    const month = params.month ? parseInt(params.month) : new Date().getMonth() + 1
    const year = params.year ? parseInt(params.year) : new Date().getFullYear()

    const supabase = await createClient()

    // 1. Statisiques Globales (Total)
    const { count: activeLoansCount } = await supabase.from('prets').select('*', { count: 'exact', head: true }).eq('status', 'active')

    // 2. Éléments en attente (Urgence)
    const { count: pendingKyc } = await supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: pendingLoans } = await supabase.from('prets').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: pendingSubs } = await supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: pendingRepayments } = await supabase.from('remboursements').select('*', { count: 'exact', head: true }).eq('status', 'pending')

    // 3. Filtrage Temporel (Revenue & Loans par mois)
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

    // Revenu du mois (Abonnements activés pendant ce mois)
    const { data: monthlySubs } = await supabase
        .from('user_subscriptions')
        .select('plan:abonnements(price), start_date')
        .eq('is_active', true)
        .gte('start_date', startDate)
        .lte('start_date', endDate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyRevenue = monthlySubs?.reduce((acc, sub: any) => acc + (Number(sub.plan?.price) || 0), 0) || 0

    // 4. Prêts Actifs & Finances (Détail)
    const { data: allActiveLoans } = await supabase
        .from('prets')
        .select('amount, amount_paid, due_date')
        .in('status', ['active', 'overdue', 'paid'])

    const totalActiveCapital = allActiveLoans?.reduce((acc, l) => acc + Number(l.amount), 0) || 0
    const totalAlreadyRecovered = allActiveLoans?.reduce((acc, l) => acc + (Number(l.amount_paid) || 0), 0) || 0
    const totalRemainingToRecover = totalActiveCapital - totalAlreadyRecovered

    // Calcul Revenu Hebdomadaire (Semaine courante)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday=0, Sunday=6 relative to Mon
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const { data: weeklySubs } = await supabase
        .from('user_subscriptions')
        .select('plan:abonnements(price)')
        .eq('status', 'active')
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weeklyRevenue = weeklySubs?.reduce((acc, sub: any) => acc + (Number(sub.plan?.price) || 0), 0) || 0

    // 5. Abonnements récents (Historique)
    const { data: recentSubs } = await supabase
        .from('user_subscriptions')
        .select('*, plan:abonnements(name, price), user:users(nom, prenom)')
        .order('created_at', { ascending: false })
        .limit(5)

    // 6. Prêts Actifs (Top 5 Urgences)
    const { data: urgentLoans } = await supabase
        .from('prets')
        .select('*, user:users(nom, prenom, email, whatsapp)')
        .eq('status', 'active')
        .order('due_date', { ascending: true })
        .limit(5)

    // 5. Performance Admin (Audit)
    // On récupère tous les admins
    const { data: admins } = await supabase
        .from('users')
        .select('id, nom, prenom, role, whatsapp')
        .in('role', ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin'])

    // On agrège leurs actions
    const kycActions = await supabase.from('kyc_submissions').select('admin_id, status').not('admin_id', 'is', null)
    const loanActions = await supabase.from('prets').select('admin_id, status').not('admin_id', 'is', null)
    const repaymentActions = await supabase.from('remboursements').select('admin_id, status').not('admin_id', 'is', null)
    // Removed subscription actions from audit as per request

    const adminPerformance = admins?.map(admin => {
        const kycCount = kycActions.data?.filter(a => a.admin_id === admin.id).length || 0
        const loanCount = loanActions.data?.filter(a => a.admin_id === admin.id).length || 0
        const repaymentCount = repaymentActions.data?.filter(a => a.admin_id === admin.id).length || 0
        // const subCount = subActions.data?.filter(a => a.admin_id === admin.id).length || 0
        return {
            ...admin,
            totalActions: kycCount + loanCount + repaymentCount, // Adjusted total
            details: { kycCount, loanCount, repaymentCount } // Adjusted details
        }
    }).sort((a, b) => b.totalActions - a.totalActions)

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                {/* Header with Search/Filters */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase italic tracking-widest">Dashboard v2.0</span>
                            <span className="text-slate-700 font-black italic">/</span>
                            <span className="text-slate-500 font-bold italic text-[10px] uppercase tracking-widest">{month}/{year}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black premium-gradient-text tracking-tight uppercase">Control Center.</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed max-w-xl">Surveillance multidimensionnelle : Finance, Gouvernance et Performance administrative.</p>
                    </div>

                    <form className="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-800 rounded-2xl">
                        <Filter size={16} className="text-slate-600 ml-2" />
                        <select name="month" defaultValue={month} className="bg-transparent text-white font-black text-xs p-2 outline-none cursor-pointer">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1} className="bg-slate-950">{new Date(0, i).toLocaleString('fr', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select name="year" defaultValue={year} className="bg-transparent text-white font-black text-xs p-2 outline-none cursor-pointer border-l border-slate-800 ml-2">
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y} className="bg-slate-950">{y}</option>
                            ))}
                        </select>
                        <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all active:scale-90">
                            <ChevronRight size={16} />
                        </button>
                    </form>
                </div>

                {/* KPI Grid - Temporal & Absolute */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Revenue Mensuel', value: monthlyRevenue, color: 'text-emerald-400', sub: `${new Date(0, month - 1).toLocaleString('fr', { month: 'long' })} ${year}`, icon: <Currency /> },
                        { label: 'Revenue Hebdo', value: weeklyRevenue, color: 'text-purple-400', sub: 'Semaine en cours', icon: <Currency /> },
                        { label: 'Volume Prêté', value: totalActiveCapital, color: 'text-white', sub: `${activeLoansCount || 0} dossiers actifs`, icon: <Document /> },
                        { label: 'Reste à Recouvrer', value: totalRemainingToRecover, color: 'text-amber-400', sub: 'Objectif recouvrement', icon: <CheckmarkFilled /> }
                    ].map((kpi, i) => (
                        <div key={i} className="glass-panel p-8 group relative overflow-hidden bg-slate-900/50 border-slate-800">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic leading-none">{kpi.label}</p>
                                <div className="text-slate-700 opacity-20 group-hover:opacity-40 transition-opacity">
                                    {kpi.icon}
                                </div>
                            </div>
                            <p className={`text-4xl font-black tracking-tighter italic ${kpi.color}`}>
                                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                                {typeof kpi.value === 'number' && (kpi.label.includes('Revenue') || kpi.label.includes('Prêté') || kpi.label.includes('Récupéré') || kpi.label.includes('Recouvrer')) && <span className="text-xs not-italic text-slate-700 ml-1">FCFA</span>}
                            </p>
                            <p className="text-[10px] font-black text-slate-700 mt-2 uppercase italic tracking-wider">{kpi.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Main Dashboard Rows */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left: Alerts & Active Loans */}
                    <div className="xl:col-span-2 space-y-8">
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
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Alerte Prioritaire</p>
                                        </div>
                                        <div className={`w-12 h-12 ${item.count! > 0 ? item.color + '/10 text-' + item.color.split('-')[1] + '-500 border border-' + item.color.split('-')[1] + '-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]' : 'bg-slate-950 border border-white/5 text-slate-700'} rounded-2xl flex items-center justify-center font-black transition-transform group-hover:scale-110`}>
                                            {item.count}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-xs font-black shadow-inner">L</span>
                                    Échéances Imminentes (Top 5)
                                </h3>
                                <Link href="/admin/loans" className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic hover:underline">Gestion des Prêts</Link>
                            </div>
                            <div className="glass-panel overflow-hidden bg-slate-900/50 border-slate-800">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950/50 border-b border-white/5">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Client</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Montant</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Échéance</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Contact</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {urgentLoans?.map(loan => (
                                            <tr key={loan.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-black text-slate-200 italic">{loan.user?.prenom} {loan.user?.nom}</p>
                                                        <p className="text-[10px] font-bold text-slate-600 lowercase">{loan.user?.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-black text-white italic">{loan.amount.toLocaleString()} F</p>
                                                        <div className="w-full bg-white/5 h-1 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="bg-emerald-500 h-full transition-all"
                                                                style={{ width: `${Math.min(100, (Number(loan.amount_paid) / Number(loan.amount)) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-black uppercase italic ${new Date(loan.due_date) < new Date() ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                                                        {new Date(loan.due_date).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {loan.user?.whatsapp && (
                                                        <a
                                                            href={`https://wa.me/${loan.user.whatsapp.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95"
                                                            title={`Contacter ${loan.user.prenom}`}
                                                        >
                                                            <svg className="w-3.5 h-3.5 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">WhatsApp</span>
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!urgentLoans || urgentLoans.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-700 font-black italic uppercase tracking-widest text-[10px]">Aucun prêt actif à risque imminent</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xs font-black shadow-inner">S</span>
                                    Historique Abonnements
                                </h3>
                                <Link href="/admin/super/subscriptions" className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic hover:underline">Voir tout</Link>
                            </div>
                            <div className="glass-panel overflow-hidden bg-slate-900/50 border-slate-800">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950/50 border-b border-white/5">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Client</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Plan</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Montant</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {recentSubs?.map(sub => (
                                            <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 text-xs font-black text-slate-300 italic">{sub.user?.prenom} {sub.user?.nom}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[9px] font-black uppercase tracking-tighter border border-blue-500/20 italic">
                                                        {sub.plan?.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-black text-white italic">{sub.plan?.price.toLocaleString()} F</td>
                                                <td className="px-6 py-4 text-right pr-6">
                                                    <span className={`text-[9px] font-black uppercase italic ${sub.status === 'active' ? 'text-emerald-500' : sub.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`}>
                                                        {sub.status === 'active' ? 'Validé' : sub.status === 'rejected' ? 'Rejeté' : 'En attente'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Right: Performance Audit & Tools */}
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xs font-black shadow-inner">P</span>
                                Performance Audit.
                            </h3>
                            <div className="glass-panel p-6 space-y-4 bg-slate-900/50 border-slate-800">
                                {adminPerformance?.map((admin, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="text-xs font-black text-white italic uppercase tracking-tight">{admin.prenom} {admin.nom}</p>
                                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{admin.role}</p>
                                                </div>
                                                {admin.whatsapp && (
                                                    <a
                                                        href={`https://wa.me/${admin.whatsapp.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shrink-0"
                                                        title={`Contacter ${admin.prenom}`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-blue-500 leading-none">{admin.totalActions}</p>
                                                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic">Actions</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {(admin.role === 'admin_kyc' || admin.role === 'superadmin') && (
                                                <div className="flex-1 text-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                                    <p className="text-[8px] font-black text-slate-600 uppercase italic mb-1">KYC</p>
                                                    <p className="text-[10px] font-black text-slate-300">{admin.details.kycCount}</p>
                                                </div>
                                            )}
                                            {(admin.role === 'admin_loan' || admin.role === 'superadmin') && (
                                                <div className="flex-1 text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                    <p className="text-[8px] font-black text-slate-600 uppercase italic mb-1">Prêts</p>
                                                    <p className="text-[10px] font-black text-slate-300">{admin.details.loanCount}</p>
                                                </div>
                                            )}
                                            {(admin.role === 'admin_repayment' || admin.role === 'superadmin') && (
                                                <div className="flex-1 text-center p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                                    <p className="text-[8px] font-black text-slate-600 uppercase italic mb-1">Remb.</p>
                                                    <p className="text-[10px] font-black text-slate-300">{admin.details.repaymentCount}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xs font-black shadow-inner">G</span>
                                Gouvernance.
                            </h3>
                            <div className="glass-panel p-8 space-y-4 bg-slate-900/50 border-slate-800">
                                <Link href="/admin/super/users" className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 border border-white/5 hover:border-blue-500/30 transition-all group">
                                    <span className="font-black text-slate-200 italic tracking-tight">Utilisateurs & Rôles</span>
                                    <ChevronRight size={20} className="w-5 h-5 text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link href="/admin/super/offers" className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 border border-white/5 hover:border-blue-500/30 transition-all group">
                                    <span className="font-black text-slate-200 italic tracking-tight">Paramètres Offres</span>
                                    <ChevronRight size={20} className="w-5 h-5 text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>

                            <div className="glass-panel p-8 relative overflow-hidden group bg-slate-900/50 border-slate-800">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                                <h4 className="text-xl font-black mb-2 text-white italic tracking-tighter uppercase relative z-10">Data Audit.</h4>
                                <p className="text-slate-500 text-[10px] font-black relative z-10 mb-6 italic uppercase tracking-widest leading-relaxed">Génération de rapports d&apos;activité consolidés.</p>
                                <button className="premium-button w-full py-4 relative z-10 active:scale-95 shadow-2xl text-[10px]">
                                    Télécharger Rapports
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
