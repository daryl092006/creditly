import { createClient, createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { Currency, Wallet, Document, Time, ArrowUpRight, ArrowDownRight, UserMultiple, CheckmarkFilled, Warning, List, User, Information } from '@carbon/icons-react'

import { DashboardFilters } from '../super/DashboardFilters'

export default async function FinanceAuditPage({
    searchParams
}: {
    searchParams: any
}) {
    // 1. Contrôle de sécurité (Admin, Comptable ou Propriétaire)
    await requireAdminRole(['superadmin', 'admin_comptable', 'owner'])

    let params = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams || {}))
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
    const supabaseAdmin = await createAdminClient()

    // 2. Récupération des données (Période sélectionnée) - Bypassing RLS for audit
    const { data: subs, error: errSubs } = await supabaseAdmin.from('user_subscriptions').select('*, user:user_id(prenom, nom), plan:abonnements(name, price)').gte('created_at', startDate).lte('created_at', endDate)
    const { data: commissions, error: errComm } = await supabaseAdmin.from('admin_commissions').select('*, admin:admin_id(prenom, nom), loan:loan_id(user_id, status)').gte('created_at', startDate).lte('created_at', endDate)
    const { data: withdrawals, error: errWith } = await supabaseAdmin.from('admin_withdrawals').select('*, admin:admin_id(prenom, nom)').gte('created_at', startDate).lte('created_at', endDate)
    const { data: paidLoans } = await supabaseAdmin.from('prets').select('id, amount, amount_paid, created_at, status, service_fee').eq('status', 'paid').gte('created_at', startDate).lte('created_at', endDate)
    const { data: allRemboursements } = await supabaseAdmin.from('remboursements').select('*, user:user_id(prenom, nom), loan:loan_id(amount, service_fee, created_at, amount_paid)').eq('status', 'verified').gte('created_at', startDate).lte('created_at', endDate)

    // Diagnostic d'erreur
    if (errSubs || errComm || errWith) {
        console.error("Finance Audit Error:", { errSubs, errComm, errWith })
        return (
            <div className="p-20 text-center animate-fade-in">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-xl shadow-red-500/10">
                    <Warning size={40} />
                </div>
                <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-4">Erreur Système</h1>
                <p className="text-slate-500 italic max-w-md mx-auto mb-10 leading-relaxed">Impossible de générer le rapport financier. Erreur de connexion au serveur.</p>
                <code className="text-xs text-slate-400 font-mono bg-slate-900 p-4 border border-slate-800 rounded-xl">{errSubs?.message || errComm?.message || errWith?.message || "Erreur Inconnue"}</code>
            </div>
        )
    }

    // 4. Construction du Livre-Journal (Audit des flux de la période)
    const journal: any[] = []
    let periodSubsTotal = 0
    let periodFeesTotal = 0
    let periodPenaltiesTotal = 0

    // Revenus Abonnements
    subs?.forEach((s: any) => {
        const u = s.user as any
        const p = s.plan as any
        const price = Number(p?.price) || 0
        periodSubsTotal += price
        journal.push({
            date: s.created_at,
            type: 'REVENUE_SUBS',
            amount: price,
            label: `Abonnement ${p?.name || 'Inconnu'}`,
            user: u ? `${u.prenom} ${u.nom}` : 'Utilisateur',
            status: 'COMPLETED'
        })
    })

    const { calculateLoanDebt } = await import('@/utils/loan-utils')

    // Revenus Frais de Service (Gross) et Pénalités (Auto)
    paidLoans?.forEach((l: any) => {
        const { fee } = calculateLoanDebt(l as any)

        // 1. Frais de service
        const feeRevenue = fee
        periodFeesTotal += feeRevenue
        journal.push({
            date: l.created_at,
            type: 'REVENUE_FEE',
            amount: feeRevenue,
            label: `Frais de dossier (Dossier ${l.id.slice(0, 5)})`,
            user: 'Système',
            status: 'COMPLETED'
        })

        // 2. Pénalités de retard
        const penalty = Math.max(0, Number(l.amount_paid) - (Number(l.amount) + fee))
        if (penalty > 0) {
            periodPenaltiesTotal += penalty
            journal.push({
                date: l.created_at,
                type: 'REVENUE_PENALTY',
                amount: penalty,
                label: `Pénalités recouvrées automatiques (Dossier ${l.id.slice(0, 5)})`,
                user: 'Système',
                status: 'COMPLETED'
            })
        }
    })

    // Dépenses : Commissions Agents
    commissions?.forEach((c: any) => {
        const a = c.admin as any
        journal.push({
            date: c.created_at,
            type: 'EXPENSE_COMMISSION',
            amount: -Number(c.amount),
            label: `Commission ${c.type.replace('_', ' ')}`,
            user: a ? `${a.prenom} ${a.nom}` : 'Admin',
            status: 'OWED'
        })
    })

    // Flux de trésorerie : Retraits validés
    withdrawals?.forEach((w: any) => {
        const a = w.admin as any
        journal.push({
            date: w.created_at,
            type: 'CASH_OUT',
            amount: -Number(w.amount),
            label: `Retrait d'Argent (Liquidité)`,
            user: a ? `${a.prenom} ${a.nom}` : 'Admin',
            status: w.status === 'approved' ? 'COMPLETED' : 'PENDING'
        })
    })

    const sortedJournal = journal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100)

    // --- 5. CALCULS FINANCIERS GLOBAUX (RECONCILIATION) ---
    // Ces calculs couvrent TOUTE l'histoire de la plateforme pour équilibrer les comptes.
    const INITIAL_CAPITAL = 2000000

    const { data: allRembGlobal } = await supabase.from('remboursements').select('amount_declared').eq('status', 'verified')
    const { data: allSubsGlobal } = await supabase.from('user_subscriptions').select('plan:abonnements(price)').eq('status', 'active')
    const { data: allLoansGlobal } = await supabase.from('prets').select('amount').in('status', ['approved', 'active', 'paid', 'overdue'])
    const { data: allWithGlobal } = await supabase.from('admin_withdrawals').select('amount').eq('status', 'approved')

    const totalGlobalCashIn = (allRembGlobal?.reduce((acc, r) => acc + Number(r.amount_declared), 0) || 0) +
        (allSubsGlobal?.reduce((acc, s: any) => acc + Number(s.plan?.price || 0), 0) || 0)

    const totalGlobalCashOut = (allLoansGlobal?.reduce((acc, l) => acc + Number(l.amount), 0) || 0) +
        (allWithGlobal?.reduce((acc, w) => acc + Number(w.amount), 0) || 0)

    const theoreticalCashBalance = INITIAL_CAPITAL + totalGlobalCashIn - totalGlobalCashOut

    // --- 6. AUDIT PROBABILISTE DU CAPITAL (ENCOURS) ---
    const { data: allActiveLoansAudit } = await supabase.from('prets').select('*').in('status', ['active', 'overdue'])
    const { data: allHistoryLoans } = await supabase.from('prets').select('*').in('status', ['paid', 'approved', 'active', 'overdue'])

    // Debt metrics based on active/overdue loans (matching Super Dashboard)
    const activeStats = (allActiveLoansAudit || []).reduce((acc, loan) => {
        const debt = calculateLoanDebt(loan as any);
        const remainingPrinciple = Math.max(0, debt.principle - debt.paid);
        return {
            total: acc.total + debt.totalDebt,
            principle: acc.principle + remainingPrinciple,
            fees: acc.fees + debt.fee,
            penalties: acc.penalties + debt.latePenalties
        };
    }, { total: 0, principle: 0, fees: 0, penalties: 0 });

    const resteARecouvrer = activeStats.total
    const restePrincipal = activeStats.principle
    const margeRestante = activeStats.fees + activeStats.penalties
    const penalitesLatentes = activeStats.penalties

    // Historical audit for global cash balance (Section 5) uses allHistoryLoans if needed
    const capitalPrete = allHistoryLoans?.reduce((acc, l) => acc + Number(l.amount), 0) || 0
    const dejaRecouvre = allHistoryLoans?.reduce((acc, l) => acc + (Number(l.amount_paid) || 0), 0) || 0

    // --- 7. PERFORMANCE DE LA PÉRIODE ---
    // Revenu Brut = Abonnements + Frais (500F) + Pénalités
    const periodGrossRevenue = periodSubsTotal + periodFeesTotal + periodPenaltiesTotal
    // Commissions totales de la période
    const periodCommissions = commissions?.reduce((acc, c) => acc + Number(c.amount), 0) || 0
    // Profit Net = Brut - Commissions
    const periodNetProfit = periodGrossRevenue - periodCommissions

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Currency size={24} />
                            </span>
                            <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Audit Financier</h1>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-slate-500 font-bold italic leading-relaxed">Transparence totale des flux, marges et rentabilité nette.</p>
                            <div className="flex items-center gap-2 text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 w-fit">
                                <Information size={12} />
                                <span className="font-black uppercase tracking-widest">Calculs en temps réel basés sur le grand livre</span>
                            </div>
                        </div>
                    </div>

                    <DashboardFilters currentMonth={month} currentYear={year} currentPeriod={period} />
                </header>

                {/* SECTION 1: RÉCONCILIATION DE CAISSE (MOBILE MONEY) */}
                <div className="mb-12 p-8 bg-blue-600 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-blue-400/20">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                        <div className="lg:col-span-2">
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-3 italic flex items-center gap-2">
                                <Wallet size={16} /> Solde Théorique Mobile Money (Audit Global)
                            </p>
                            <h2 className="text-6xl font-black text-white italic tracking-tighter mb-4">
                                {theoreticalCashBalance.toLocaleString('fr-FR')} <span className="text-xl uppercase not-italic opacity-70">FCFA</span>
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                <div className="px-4 py-2 bg-black/20 backdrop-blur-md rounded-xl border border-white/10">
                                    <p className="text-[10px] text-blue-100 font-bold italic uppercase">
                                        Formule : Capital Initial ({INITIAL_CAPITAL.toLocaleString()} F) + Total Entrées - Total Sorties
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-md px-6 py-5 rounded-3xl border border-white/10 group-hover:bg-white/15 transition-all">
                                <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1 italic">Total Entrées (Cash-In)</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">+{totalGlobalCashIn.toLocaleString('fr-FR')} F</p>
                                <p className="text-[8px] text-blue-200/60 mt-2 leading-tight uppercase font-bold italic">Remboursements + Abonnements</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-6 py-5 rounded-3xl border border-white/10 group-hover:bg-white/15 transition-all">
                                <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1 italic">Total Sorties (Cash-Out)</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">-{totalGlobalCashOut.toLocaleString('fr-FR')} F</p>
                                <p className="text-[8px] text-blue-200/60 mt-2 leading-tight uppercase font-bold italic">Prêts Capital + Retraits Admin</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: PERFORMANCE DE LA PÉRIODE (KPI RENTABILITÉ) */}
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3 italic">
                    <ArrowUpRight size={18} /> Performance de la Période ({period === 'week' ? 'Semaine' : 'Mois'})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {/* REVENU BRUT */}
                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all shadow-xl group">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-tight">Revenu Brut<br />(Gross Revenue)</p>
                            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <ArrowUpRight size={16} />
                            </span>
                        </div>
                        <p className="text-3xl font-black text-white italic tracking-tighter mb-2">
                            {periodGrossRevenue.toLocaleString('fr-FR')} <span className="text-xs ml-1 uppercase not-italic font-bold">F</span>
                        </p>
                        <hr className="border-white/5 mb-3" />
                        <p className="text-[9px] text-slate-500 font-bold uppercase italic leading-relaxed">
                            <span className="text-emerald-500">Formule :</span> Abo ({periodSubsTotal.toLocaleString()} F) + Frais Service ({periodFeesTotal.toLocaleString()} F) + Pénalités ({periodPenaltiesTotal.toLocaleString()} F)
                        </p>
                    </div>

                    {/* COMMISSIONS DUES */}
                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all shadow-xl group">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-tight">Dépenses Agents<br />(Commissions)</p>
                            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <UserMultiple size={16} />
                            </span>
                        </div>
                        <p className="text-3xl font-black text-blue-500 italic tracking-tighter mb-2">
                            {periodCommissions.toLocaleString('fr-FR')} <span className="text-xs ml-1 uppercase not-italic font-bold">F</span>
                        </p>
                        <hr className="border-white/5 mb-3" />
                        <p className="text-[9px] text-slate-500 font-bold uppercase italic leading-relaxed">
                            <span className="text-blue-500">Formule :</span> Somme de toutes les commissions (KYC + Prêt + Remboursement) générées sur la période.
                        </p>
                    </div>

                    {/* PROFIT NET */}
                    <div className="glass-panel p-6 bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500 transition-all shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic leading-tight">Profit Net<br />(Net Profit)</p>
                            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/50">
                                <CheckmarkFilled size={16} />
                            </span>
                        </div>
                        <p className="text-3xl font-black text-white italic tracking-tighter mb-2 relative z-10">
                            {periodNetProfit.toLocaleString('fr-FR')} <span className="text-xs ml-1 uppercase not-italic font-bold">F</span>
                        </p>
                        <hr className="border-emerald-500/10 mb-3 relative z-10" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-relaxed relative z-10">
                            <span className="text-emerald-500">Formule :</span> Revenu Brut ({periodGrossRevenue.toLocaleString()} F) - Commissions ({periodCommissions.toLocaleString()} F)
                        </p>
                    </div>

                    {/* CAPITAL ET MARGE EN RISQUE (RECOVERY) */}
                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-amber-500/30 transition-all shadow-xl group">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-tight">Recouvrement Restant<br />(Principal & Marge)</p>
                            <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Time size={16} />
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <p className="text-[9px] font-black text-rose-500 uppercase italic mb-1">Capital Net</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">
                                    {restePrincipal.toLocaleString('fr-FR')} <span className="text-xs not-italic">F</span>
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div>
                                    <p className="text-[9px] font-black text-amber-500 uppercase italic mb-1">Marge Service</p>
                                    <p className="text-sm font-black text-white italic tracking-tighter">
                                        {activeStats.fees.toLocaleString('fr-FR')} <span className="text-[8px] not-italic">F</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-red-400 uppercase italic mb-1">Pénalités Latentes</p>
                                    <p className="text-sm font-black text-white italic tracking-tighter">
                                        {penalitesLatentes.toLocaleString('fr-FR')} <span className="text-[8px] not-italic">F</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <hr className="border-white/5 mb-3" />
                        <p className="text-[9px] text-slate-500 font-bold uppercase italic leading-relaxed">
                            <span className="text-rose-500 italic">Base :</span> Somme des capitaux restants dus + Frais et Pénalités sur dossiers actifs ({allActiveLoansAudit?.length || 0} dossiers).
                        </p>
                    </div>
                </div>

                {/* SECTION 3: JOURNAL DÉTAILLÉ */}
                <div className="glass-panel overflow-hidden border-slate-800 shadow-2xl bg-slate-900/40">
                    <div className="px-8 py-6 bg-slate-950/50 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <List size={20} />
                            </span>
                            <h3 className="text-sm font-black text-white italic tracking-widest uppercase">Journal des Flux Financiers</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black italic uppercase tracking-widest">100 dernières opérations</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-950/30 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Date & Heure</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Nature du Flux</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Détails de l'Opération</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Tiers / Admin</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Impact Caisse</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {sortedJournal.length > 0 ? sortedJournal.map((entry: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="text-slate-400 font-bold italic">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                                            <p className="text-[10px] text-slate-600 font-mono tracking-tighter italic">{new Date(entry.date).toLocaleTimeString('fr-FR')}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg border italic tracking-widest uppercase ${entry.type.startsWith('REVENUE') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                entry.type.startsWith('EXPENSE') ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                {entry.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-white font-black italic tracking-tight">{entry.label}</p>
                                        </td>
                                        <td className="px-8 py-5 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                <User size={14} />
                                            </div>
                                            <p className="text-slate-300 font-bold italic">{entry.user}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <p className={`font-black italic text-lg tracking-tighter ${entry.amount > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('fr-FR')} <span className="text-[10px] not-italic opacity-50">F</span>
                                            </p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-white/5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${entry.status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                    entry.status === 'OWED' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                                                        'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                                    }`} />
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{entry.status}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Document size={48} />
                                                <p className="text-slate-400 font-black uppercase italic tracking-[0.3em]">Aucune donnée sur cette période</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
