import { createClient, createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { Currency, Wallet, Document, Time, ArrowUpRight, ArrowDownRight, UserMultiple, CheckmarkFilled, Warning, List, User, Information, ChartLine } from '@carbon/icons-react'

import { DashboardFilters } from '../super/DashboardFilters'
import InvestorSection from './InvestorSection'
import { calculateProfitToShare, getShareholdersConfig } from '@/utils/finance-utils'

export default async function FinanceAuditPage({
    searchParams
}: {
    searchParams: any
}) {
    // 1. Contrôle de sécurité (Admin, Comptable ou Propriétaire)
    await requireAdminRole(['superadmin', 'admin_comptable', 'owner'])

    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()


    let params = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams || {}))
    const now = new Date()
    const period = params.period || 'month'
    const month = params.month ? parseInt(params.month) : now.getMonth() + 1
    const year = params.year ? parseInt(params.year) : now.getFullYear()

    // RÉCUPÉRATION DE L'EMAIL ET RÔLES POUR LE FILTRE DE CONFIDENTIALITÉ
    const { data: { user } } = await supabase.auth.getUser()
    const { data: adminUser } = await supabaseAdmin.from('users').select('email, roles').eq('id', user?.id).single()
    const userEmail = adminUser?.email || user?.email || ''
    const userRoles = adminUser?.roles || []
    const isOwner = userRoles.includes('owner') || userRoles.includes('superadmin')

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

        const isExtension = r.proof_url?.includes('extension_')

        // Si c'est un remboursement, c'est du CASH_IN
        journal.push({
            date: r.validated_at,
            type: isExtension ? 'CASH_IN_EXTENSION' : 'CASH_IN_REPAYMENT',
            amount: amount,
            label: isExtension ? `Frais de Prolongation (+5j)` : `Encaissement Remboursement (Dossier ${loan.id.slice(0, 5)})`,
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
    const { data: allLoansGlobal } = await supabaseAdmin.from('prets').select('id, user_id, amount, amount_paid, status, service_fee, extension_fee, created_at, due_date').in('status', ['approved', 'active', 'paid', 'overdue'])
    const { data: allWithGlobal } = await supabaseAdmin.from('admin_withdrawals').select('amount').eq('status', 'approved')

    // --- 6. AUDIT DU RISQUE (PAR - Portfolio At Risk) ---
    const { data: allActiveLoansAudit } = await supabaseAdmin.from('prets').select('*').in('status', ['active', 'overdue'])

    const riskStats = (allActiveLoansAudit || []).reduce((acc: any, loan) => {
        const debt = calculateLoanDebt(loan as any)
        const isOverdue = loan.status === 'overdue'
        const remainingPrincipal = Math.max(0, Number(loan.amount) - Number(loan.amount_paid))

        return {
            totalDebt: acc.totalDebt + debt.totalDebt,
            principleAtRisk: acc.principleAtRisk + (isOverdue ? remainingPrincipal : 0),
            totalActivePrinciple: acc.totalActivePrinciple + remainingPrincipal
        }
    }, { totalDebt: 0, principleAtRisk: 0, totalActivePrinciple: 0 })

    const parRate = riskStats.totalActivePrinciple > 0 ? (riskStats.principleAtRisk / riskStats.totalActivePrinciple) * 100 : 0

    // FETCH REAL TRANSACTIONS AND COMMISSIONS
    const [
        { data: investorTransactions },
        { data: allCommissions },
        { data: allUsers }
    ] = await Promise.all([
        supabaseAdmin.from('investor_transactions').select('*').order('date', { ascending: false }),
        supabaseAdmin.from('admin_commissions').select('*, loan:loan_id(status)'),
        supabaseAdmin.from('users').select('id, email')
    ])

    // --- 7. LOGIQUE DE LA CAISSE ÉTANCHE (DOUBLE CAISSE) ---
    const totalInvestorWithdrawals = investorTransactions?.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0
    const totalInvestorInvestments = investorTransactions?.filter(t => t.type === 'investment' && t.status === 'approved').reduce((acc, t) => acc + Number(t.amount), 0) || 0

    const totalWithdrawals = (allWithGlobal?.reduce((acc: number, w: any) => acc + Number(w.amount), 0) || 0) + totalInvestorWithdrawals
    const capitalInCirculation = riskStats.totalActivePrinciple

    const { realizedProfit: totalPortfolioProfit, theoreticalProfit, breakdown } = await calculateProfitToShare(supabaseAdmin)
    const shareholders = await getShareholdersConfig(supabaseAdmin)

    // Mapper les emails aux IDs pour lier les commissions
    const emailToId = Object.fromEntries(allUsers?.map(u => [u.email?.toLowerCase(), u.id]) || [])
    const idToEmail = Object.fromEntries(allUsers?.map(u => [u.id, u.email?.toLowerCase()]) || [])

    // --- LOGIQUE DE PARTS DYNAMIQUES (CAPITAL FLOTTANT) ---
    const INITIAL_TOTAL_CAPITAL = 2000000;
    
    // 1. Calcul du capital actuel de chacun (Base + Investissements approuvés)
    const shareholdersWithCapital = shareholders.map(s => {
        const baseCapital = INITIAL_TOTAL_CAPITAL * s.share;
        const myInvestments = investorTransactions
            ?.filter(t => t.shareholder_name?.toLowerCase().trim() === s.name.toLowerCase().trim() && t.type === 'investment' && t.status === 'approved')
            .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;
            
        return { 
            ...s, 
            currentCapital: baseCapital + myInvestments 
        };
    });
    
    const totalCurrentCapital = shareholdersWithCapital.reduce((acc, s) => acc + s.currentCapital, 0);

    // 2. Enrichir les shareholders avec leurs commissions gagnées ET leur nouvelle part dynamique
    const enrichedShareholders = shareholdersWithCapital.map(s => {
        const dynamicShare = s.currentCapital / totalCurrentCapital;
        const adminId = emailToId[s.email?.toLowerCase()]
        const myComms = allCommissions?.filter(c => c.admin_id === adminId) || []
        
        // Commissions réalisées (prêt payé ou récompense remboursement)
        const realizedComms = myComms.filter(c => c.loan?.status === 'paid' || c.type === 'repayment_reward')
        const totalComms = realizedComms.reduce((acc, c) => acc + Number(c.amount), 0)
        
        // CALCUL DE LA DETTE PERSONNELLE (si l'associé est aussi client)
        const myLoans = allLoansGlobal?.filter(l => idToEmail[l.user_id] === s.email?.toLowerCase()) || []
        const myDebt = myLoans.reduce((acc, l) => {
            if (l.status === 'paid' || l.status === 'rejected') return acc
            const { totalDebt } = calculateLoanDebt(l as any)
            return acc + totalDebt
        }, 0)
        
        return { 
            ...s, 
            realizedComms: totalComms, 
            totalDebt: myDebt,
            share: dynamicShare, // On remplace la part fixe par la part dynamique pour les calculs de bénéfices
            originalShare: s.share // On garde l'originale pour info
        }
    })
    
    const ledger = { transactions: investorTransactions || [] }

    const totalCashInCaisse = Math.max(0, INITIAL_CAPITAL + totalPortfolioProfit - totalWithdrawals - capitalInCirculation)
    const maxCapitalAllowedInHand = Math.max(0, INITIAL_CAPITAL - capitalInCirculation)
    const capitalInHand = Math.max(0, Math.min(maxCapitalAllowedInHand, totalCashInCaisse))
    const benefitsInHand = Math.max(0, totalCashInCaisse - capitalInHand)
    const benefitsReinvested = Math.max(0, (capitalInCirculation + totalWithdrawals) - INITIAL_CAPITAL)

    const roiGlobal = (totalPortfolioProfit / INITIAL_CAPITAL) * 100

    // --- 7. PERFORMANCE DE LA PÉRIODE ---
    const periodGrossRevenue = periodSubsTotal + periodFeesTotal + periodExtensionTotal + periodPenaltiesTotal
    const periodCommissions = commissions?.reduce((acc: number, c: any) => acc + Number(c.amount), 0) || 0
    const periodNetProfit = periodGrossRevenue - periodCommissions

    const totalAmountLent = allLoansGlobal?.reduce((acc: number, l: any) => acc + Number(l.amount), 0) || 0

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                    <div className="glass-panel p-10 bg-slate-900 border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Total Prêt Actif (Encours)</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">{riskStats.totalActivePrinciple.toLocaleString('fr-FR')} F</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase mt-2 italic">Capital actuellement sur le terrain</p>
                    </div>
                    <div className="glass-panel p-10 bg-slate-900/50 border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Bénéfice Net Encaissé</p>
                        <p className="text-4xl font-black text-emerald-500 italic tracking-tighter">+{totalPortfolioProfit.toLocaleString('fr-FR')} F</p>
                    </div>
                    <div className="glass-panel p-10 bg-blue-600/10 border-blue-500/20">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Bénéfice Cible (Horizon)</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">+{theoreticalProfit.toLocaleString('fr-FR')} F</p>
                        <p className="text-[8px] font-bold text-blue-400/60 uppercase mt-2 italic">Projection si tous sont payés</p>
                    </div>
                    <div className="glass-panel p-10 bg-slate-900/50 border-slate-800 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">ROI Global Actuel</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">{roiGlobal.toFixed(2)}%</p>
                    </div>
                    <div className="glass-panel p-10 bg-slate-900/50 border-slate-800 flex flex-col justify-center text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">PAR Ratio</p>
                        <p className={`text-4xl font-black italic tracking-tighter ${parRate > 15 ? 'text-red-500' : 'text-emerald-500'}`}>{parRate.toFixed(1)}%</p>
                    </div>
                </div>

                {/* VÉRITABLE RÉSERVE DE LIQUIDITÉ (DOUBLE CAISSE) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* CAISSE CAPITAL */}
                    <div className="glass-panel p-16 bg-slate-950 border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                             <Wallet size={120} className="text-white" />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="space-y-2">
                                <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                                    Réserve Capital (Plafond 2M)
                                </div>
                                <h2 className="text-7xl md:text-8xl font-black text-white italic tracking-tighter leading-none">
                                    {capitalInHand.toLocaleString('fr-FR')} <span className="text-3xl uppercase not-italic opacity-50 text-slate-500">F</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-6 pt-8 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Capital Dehors</p>
                                    <p className="text-xl font-bold text-slate-300 italic">{capitalInCirculation.toLocaleString('fr-FR')} F</p>
                                </div>
                                <div className="w-px h-8 bg-white/5"></div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Statut</p>
                                    <p className={`text-xl font-bold italic ${capitalInHand === 0 ? 'text-blue-500' : 'text-emerald-500'}`}>
                                        {capitalInHand === 0 ? 'Entièrement Prêté' : 'Disponible'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CAISSE BÉNÉFICES */}
                    <div className="glass-panel p-16 bg-emerald-600/10 border-emerald-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                             <ChartLine size={120} className="text-emerald-500" />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="space-y-2">
                                <div className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    Cagnotte Bénéfices Réels
                                </div>
                                <h2 className="text-7xl md:text-8xl font-black text-emerald-500 italic tracking-tighter leading-none">
                                    {benefitsInHand.toLocaleString('fr-FR')} <span className="text-3xl uppercase not-italic opacity-50 text-emerald-500/50">F</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-6 pt-8 border-t border-emerald-500/10">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest italic">Profit Total (Vie)</p>
                                    <p className="text-xl font-bold text-emerald-400 italic">+{totalPortfolioProfit.toLocaleString('fr-FR')} F</p>
                                </div>
                                <div className="w-px h-8 bg-emerald-500/10"></div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Réinvesti</p>
                                    <p className="text-xl font-bold text-blue-400 italic">-{benefitsReinvested.toLocaleString('fr-FR')} F</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                <p className="text-xl font-bold text-white italic">{periodSubsTotal.toLocaleString('fr-FR')} F</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Frais (Dossier + Ext)</p>
                                <p className="text-xl font-bold text-white italic">{(periodFeesTotal + periodExtensionTotal).toLocaleString('fr-FR')} F</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Pénalités Retard</p>
                                <p className="text-xl font-bold text-white italic">{periodPenaltiesTotal.toLocaleString('fr-FR')} F</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Dépenses Comms</p>
                                <p className="text-xl font-bold text-blue-500 italic">-{periodCommissions.toLocaleString('fr-FR')} F</p>
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
                                    <p className="text-2xl font-black text-white italic">{riskStats.principleAtRisk.toLocaleString('fr-FR')} F</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Capital Actif Total</p>
                                    <p className="text-xl font-black text-slate-400 italic">{riskStats.totalActivePrinciple.toLocaleString('fr-FR')} F</p>
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
                
                {/* SECTION INVESTISSEURS */}
                <InvestorSection 
                    shareholders={enrichedShareholders}
                    totalProfitToShare={totalPortfolioProfit}
                    ledger={investorTransactions || []}
                    currentUserEmail={userEmail}
                    profitBreakdown={breakdown}
                    showAll={isOwner}
                />

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
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg border italic tracking-widest uppercase ${entry.type.startsWith('REVENUE') || entry.type.startsWith('CASH_IN') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
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
