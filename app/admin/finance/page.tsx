import { createClient, createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { Currency, Wallet, Document, Time, ArrowUpRight, ArrowDownRight, UserMultiple, CheckmarkFilled, Warning, List, User, Information } from '@carbon/icons-react'

import { DashboardFilters } from '../super/DashboardFilters'
import InvestorSection from './InvestorSection'

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
    // IMPORTANT: On filtre par validated_at pour les flux de trésorerie réels
    const { data: subs } = await supabaseAdmin.from('user_subscriptions').select('*, user:user_id(prenom, nom), plan:abonnements(name, price)').gte('created_at', startDate).lte('created_at', endDate)
    const { data: commissions } = await supabaseAdmin.from('admin_commissions').select('*, admin:admin_id(prenom, nom), loan:loan_id(user_id, status)').gte('created_at', startDate).lte('created_at', endDate)
    const { data: withdrawals } = await supabaseAdmin.from('admin_withdrawals').select('*, admin:admin_id(prenom, nom)').gte('created_at', startDate).lte('created_at', endDate)
    
    // Pour l'audit de performance, on regarde les paiements REÇUS sur la période
    const { data: verifiedRembInPeriod } = await supabaseAdmin.from('remboursements').select('*, user:user_id(prenom, nom), loan:loan_id(*)').eq('status', 'verified').gte('validated_at', startDate).lte('validated_at', endDate)
    
    // 4. Construction du Livre-Journal (Audit des flux de la période)
    const journal: any[] = []
    let periodSubsTotal = 0
    let periodFeesTotal = 0
    let periodExtensionTotal = 0
    let periodPenaltiesTotal = 0
    let periodRecoveredPrinciple = 0

    // Revenus Abonnements (Immédiat)
    subs?.forEach((s: any) => {
        const p = s.plan as any
        const price = Number(p?.price) || 0
        periodSubsTotal += price
        journal.push({
            date: s.created_at,
            type: 'REVENUE_SUBS',
            amount: price,
            label: `Abonnement ${p?.name || 'Inconnu'}`,
            user: s.user ? `${s.user.prenom} ${s.user.nom}` : 'Client',
            status: 'COMPLETED'
        })
    })

    const { calculateLoanDebt } = await import('@/utils/loan-utils')

    // Attribution fine des revenus via les remboursements validés
    verifiedRembInPeriod?.forEach((r: any) => {
        const loan = r.loan as any
        const amount = Number(r.amount_declared) || 0
        
        // On récupère la structure du prêt pour savoir ce qu'on recouvre
        // Note: C'est une simplification, en réalité on recouvre d'abord les pénalités, puis frais, puis capital
        // Mais pour l'audit de flux, on peut proratiser ou utiliser des flags si on avait une table de ventilation
        // Ici on va identifier si c'est le paiement final qui libère les marges
        
        const isLastPayment = (Number(loan.amount_paid) >= (Number(loan.amount) + (Number(loan.service_fee) || 500) + (Number(loan.extension_fee) || 0)))
        
        // Si c'est un remboursement, c'est du CASH_IN
        journal.push({
            date: r.validated_at,
            type: 'CASH_IN_REPAYMENT',
            amount: amount,
            label: `Encaissement Remboursement (Dossier ${loan.id.slice(0, 5)})`,
            user: r.user ? `${r.user.prenom} ${r.user.nom}` : 'Client',
            status: 'COMPLETED'
        })

        // On tracke aussi la partie "Revenu" vs "Capital"
        // Pour l'audit de performance on va simplifier : tout ce qui dépasse le capital prêté est du revenu
        // Pour être précis, on va regarder si le prêt a des frais d'extension
        if (loan.is_extended && Number(loan.extension_fee) > 0) {
             // On considère l'extension comme un revenu dès qu'elle est facturée/payée
             // Pour cet audit, on va juste noter sa présence
        }
    })

    // On recalcule les totaux de période via les prêts ayant changé de statut ou ayant reçu des fonds
    // Mais pour la "Performance de la Période", le plus fiable est de regarder les PLUS-VALUES réalisées
    const { data: loansPaidInPeriod } = await supabaseAdmin.from('prets').select('*').eq('status', 'paid').gte('updated_at', startDate).lte('updated_at', endDate)
    
    loansPaidInPeriod?.forEach((l: any) => {
        periodFeesTotal += (Number(l.service_fee) || 500)
        periodExtensionTotal += (Number(l.extension_fee) || 0)
        
        const debt = calculateLoanDebt(l as any)
        periodPenaltiesTotal += debt.latePenalties
    })

    // Dépenses : Commissions Agents
    commissions?.forEach((c: any) => {
        journal.push({
            date: c.created_at,
            type: 'EXPENSE_COMMISSION',
            amount: -Number(c.amount),
            label: `Commission Agent (${c.type})`,
            user: c.admin ? `${c.admin.prenom} ${c.admin.nom}` : 'Admin',
            status: 'OWED'
        })
    })

    // Flux de trésorerie : Retraits validés
    withdrawals?.forEach((w: any) => {
        journal.push({
            date: w.created_at,
            type: 'CASH_OUT_ADMIN',
            amount: -Number(w.amount),
            label: `Sortie de Trésorerie (Retrait)`,
            user: w.admin ? `${w.admin.prenom} ${w.admin.nom}` : 'Admin',
            status: w.status === 'approved' ? 'COMPLETED' : 'PENDING'
        })
    })

    const sortedJournal = journal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100)

    // --- 5. CALCULS FINANCIERS GLOBAUX ---
    const INITIAL_CAPITAL = 2000000
    const { data: allRembGlobal } = await supabaseAdmin.from('remboursements').select('amount_declared').eq('status', 'verified')
    const { data: allSubsGlobal } = await supabaseAdmin.from('user_subscriptions').select('plan:abonnements(price)')
    const { data: allLoansGlobal } = await supabaseAdmin.from('prets').select('amount, amount_paid, status').in('status', ['approved', 'active', 'paid', 'overdue'])
    const { data: allWithGlobal } = await supabaseAdmin.from('admin_withdrawals').select('amount').eq('status', 'approved')

    const totalGlobalCashIn = (allRembGlobal?.reduce((acc, r) => acc + Number(r.amount_declared), 0) || 0) +
        (allSubsGlobal?.reduce((acc, s: any) => acc + Number(s.plan?.price || 0), 0) || 0)

    const totalGlobalCashOut = (allLoansGlobal?.reduce((acc, l) => acc + Number(l.amount), 0) || 0) +
        (allWithGlobal?.reduce((acc, w) => acc + Number(w.amount), 0) || 0)

    const theoreticalCashBalance = INITIAL_CAPITAL + totalGlobalCashIn - totalGlobalCashOut

    // --- 6. AUDIT DU RISQUE (PAR - Portfolio At Risk) ---
    const { data: allActiveLoansAudit } = await supabaseAdmin.from('prets').select('*').in('status', ['active', 'overdue'])
    
    const riskStats = (allActiveLoansAudit || []).reduce((acc, loan) => {
        const debt = calculateLoanDebt(loan as any)
        const isOverdue = loan.status === 'overdue'
        return {
            totalDebt: acc.totalDebt + debt.totalDebt,
            principleAtRisk: acc.principleAtRisk + (isOverdue ? Math.max(0, Number(loan.amount) - Number(loan.amount_paid)) : 0),
            totalActivePrinciple: acc.totalActivePrinciple + Math.max(0, Number(loan.amount) - Number(loan.amount_paid))
        }
    }, { totalDebt: 0, principleAtRisk: 0, totalActivePrinciple: 0 })

    const parRate = riskStats.totalActivePrinciple > 0 ? (riskStats.principleAtRisk / riskStats.totalActivePrinciple) * 100 : 0
    const roiGlobal = ((theoreticalCashBalance - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100

    // --- 7. PERFORMANCE DE LA PÉRIODE ---
    const periodGrossRevenue = periodSubsTotal + periodFeesTotal + periodExtensionTotal + periodPenaltiesTotal
    const periodCommissions = commissions?.reduce((acc, c) => acc + Number(c.amount), 0) || 0
    const periodNetProfit = periodGrossRevenue - periodCommissions

    // --- 8. PARTAGE DES BÉNÉFICES ASSOCIÉS (Post 18 Mars 2026) ---
    const DISTRIBUTION_START_DATE = '2026-03-19T00:00:00Z'
    
    // Fetch all revenues since distribution start
    const { data: globalSubsPostMarch } = await supabaseAdmin.from('user_subscriptions').select('plan:abonnements(price)').gte('created_at', DISTRIBUTION_START_DATE)
    const { data: globalCommsPostMarch } = await supabaseAdmin.from('admin_commissions').select('amount').gte('created_at', DISTRIBUTION_START_DATE)
    const { data: globalLoansPaidPostMarch } = await supabaseAdmin.from('prets').select('*').eq('status', 'paid').gte('updated_at', DISTRIBUTION_START_DATE)
    
    let globalFeesPostMarch = 0
    let globalExtensionsPostMarch = 0
    let globalPenaltiesPostMarch = 0
    globalLoansPaidPostMarch?.forEach(l => {
        globalFeesPostMarch += (Number(l.service_fee) || 500)
        globalExtensionsPostMarch += (Number(l.extension_fee) || 0)
        const debt = calculateLoanDebt(l as any)
        globalPenaltiesPostMarch += debt.latePenalties
    })

    const globalSubsTotalPostMarch = globalSubsPostMarch?.reduce((acc, s: any) => acc + (Number(s.plan?.price) || 0), 0) || 0
    const globalCommsTotalPostMarch = globalCommsPostMarch?.reduce((acc, c) => acc + Number(c.amount), 0) || 0
    
    // Net Dividends to distribute
    const totalProfitToShare = globalSubsTotalPostMarch + globalFeesPostMarch + globalExtensionsPostMarch + globalPenaltiesPostMarch - globalCommsTotalPostMarch

    const shareholders = [
        { name: 'Habib', share: 0.885, color: '#3b82f6' },
        { name: 'Denis', share: 0.08, color: '#10b981' },
        { name: 'Wilfried', share: 0.03, color: '#f59e0b' },
        { name: 'Borel', share: 0.005, color: '#ef4444' }
    ].map(s => ({
        ...s,
        amount: Math.floor(totalProfitToShare * s.share)
    }))

    // Fetch the investor ledger
    const { data: ledgerSetting } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'investor_ledger').single()
    const ledger = ledgerSetting?.value || []

    return (
        <div className="py-16 md:py-32 page-transition min-h-screen">
            <div className="admin-container space-y-24">
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                    <div className="space-y-8 max-w-4xl">
                        <div className="flex items-center gap-4 animate-fade-in">
                            <span className="h-6 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-[11px] font-black uppercase tracking-[0.8em] text-emerald-500 italic">Audit Haute Précision</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase italic leading-[0.8] animate-slide-up">
                            Intelligence <br />
                            <span className="premium-gradient-text uppercase">Financière.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-500 font-medium italic max-w-3xl animate-fade-in delay-100">
                            Analyse chirurgicale des flux, de la rentabilité nette et de l&apos;exposition au risque.
                        </p>
                    </div>
                    <DashboardFilters currentMonth={month} currentYear={year} currentPeriod={period} />
                </header>

                {/* SOLDE MOBILE MONEY - Immersion Totale */}
                <div className="glass-panel p-16 bg-blue-600 rounded-[3rem] relative overflow-hidden group border-blue-400/20 shadow-[0_50px_100px_-20px_rgba(37,99,235,0.3)]">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:scale-110 transition-transform duration-[2s]"></div>
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-16">
                        <div className="space-y-6">
                            <p className="text-[11px] font-black text-blue-200 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                <Wallet size={20} /> Trésorerie Théorique Mobile Money
                            </p>
                            <h2 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter leading-none">
                                {theoreticalCashBalance.toLocaleString('fr-FR')} <span className="text-3xl uppercase not-italic opacity-50">FCFA</span>
                            </h2>
                            <div className="flex items-center gap-6">
                                <div className="px-6 py-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10">
                                    <p className="text-[10px] text-blue-100 font-black uppercase italic tracking-widest">ROI Global : <span className={roiGlobal >= 0 ? 'text-emerald-400' : 'text-red-400'}>{roiGlobal.toFixed(2)}%</span></p>
                                </div>
                                <p className="text-xs text-blue-200/60 font-medium italic">Calculé sur la base du capital initial de {INITIAL_CAPITAL.toLocaleString()} F</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full lg:w-auto">
                            <div className="p-8 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 hover:bg-white/15 transition-all">
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-3">Total Entrées</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">+{totalGlobalCashIn.toLocaleString('fr-FR')} F</p>
                            </div>
                            <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 hover:bg-black/30 transition-all">
                                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-3">Total Sorties</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">-{totalGlobalCashOut.toLocaleString('fr-FR')} F</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PARTAGE DES DIVIDENDES ASSOCIÉS DYNAMIQUE */}
                <InvestorSection 
                    shareholders={shareholders} 
                    totalProfitToShare={totalProfitToShare}
                    ledger={ledger as any[]}
                />

                {/* PERFORMANCE ET RISQUE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     {/* REVENUS DE LA PÉRIODE */}
                     <div className="glass-panel p-12 space-y-8">
                        <div className="flex justify-between items-end">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Performance Période</p>
                                <h3 className="text-5xl font-black text-white italic tracking-tighter">Net : {periodNetProfit.toLocaleString('fr-FR')} F</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Brut</p>
                                <p className="text-2xl font-black text-emerald-500 italic">+{periodGrossRevenue.toLocaleString('fr-FR')} F</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Abonnements</p>
                                <p className="text-xl font-bold text-white italic">{periodSubsTotal.toLocaleString()} F</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Frais (Dossier + Ext)</p>
                                <p className="text-xl font-bold text-white italic">{(periodFeesTotal + periodExtensionTotal).toLocaleString()} F</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Pénalités Retard</p>
                                <p className="text-xl font-bold text-white italic">{periodPenaltiesTotal.toLocaleString()} F</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Dépenses Comms</p>
                                <p className="text-xl font-bold text-blue-500 italic">-{periodCommissions.toLocaleString()} F</p>
                            </div>
                        </div>
                     </div>

                     {/* ANALYSE DU RISQUE (PAR) */}
                     <div className="glass-panel p-12 bg-slate-900/40 relative overflow-hidden group hover:border-red-500/20">
                        <div className="flex justify-between items-start">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic leading-tight">Exposition Risque Bancaire<br />(Portfolio At Risk)</p>
                                <div className="space-y-1">
                                    <h3 className={`text-6xl font-black italic tracking-tighter ${parRate > 15 ? 'text-red-500' : parRate > 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {parRate.toFixed(1)}%
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Ratio de défaut (PAR-30)</p>
                                </div>
                            </div>
                            <div className="text-right space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest italic leading-none">Capital en Souffrance</p>
                                    <p className="text-2xl font-black text-white italic">{riskStats.principleAtRisk.toLocaleString()} F</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Capital Actif Total</p>
                                    <p className="text-xl font-black text-slate-400 italic">{riskStats.totalActivePrinciple.toLocaleString()} F</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${parRate > 15 ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, parRate)}%` }}
                             />
                        </div>
                     </div>
                </div>

                {/* JOURNAL DES FLUX FLAMBANT NEUF */}
                <div className="glass-panel overflow-hidden bg-slate-900/20 border-white/[0.03]">
                    <div className="px-12 py-10 border-b border-white/5 flex justify-between items-end">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Grand Livre</p>
                            <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase">Registre des Flux.</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-950/20 border-b border-white/5">
                                    <th className="px-12 py-8 text-[11px] font-black text-slate-600 uppercase tracking-widest italic">Événement</th>
                                    <th className="px-12 py-8 text-[11px] font-black text-slate-600 uppercase tracking-widest italic">Nature</th>
                                    <th className="px-12 py-8 text-[11px] font-black text-slate-600 uppercase tracking-widest italic">Détails</th>
                                    <th className="px-12 py-8 text-[11px] font-black text-slate-600 uppercase tracking-widest italic text-right">Impact</th>
                                    <th className="px-12 py-8 text-[11px] font-black text-slate-600 uppercase tracking-widest italic text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {sortedJournal.map((entry: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-12 py-8">
                                            <p className="text-slate-400 font-bold italic">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                                            <p className="text-[10px] text-slate-600 font-mono italic">{new Date(entry.date).toLocaleTimeString('fr-FR')}</p>
                                        </td>
                                        <td className="px-12 py-8">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg border italic tracking-widest uppercase ${
                                                entry.type.startsWith('REVENUE') || entry.type.startsWith('CASH_IN') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                                {entry.type.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-12 py-8">
                                            <p className="text-white font-black italic tracking-tight text-lg">{entry.label}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase italic mt-1">{entry.user}</p>
                                        </td>
                                        <td className="px-12 py-8 text-right">
                                            <p className={`text-2xl font-black italic tracking-tighter ${entry.amount > 0 ? 'text-emerald-500' : 'text-white'}`}>
                                                {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('fr-FR')} <span className="text-xs italic opacity-40">F</span>
                                            </p>
                                        </td>
                                        <td className="px-12 py-8 text-center">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                                                {entry.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
