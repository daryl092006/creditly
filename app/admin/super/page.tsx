/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import Link from 'next/link'
import { Currency, Document, ChevronRight, Filter, Time, Wallet, UserMultiple, Identification, RequestQuote, Receipt, CheckmarkFilled, Rocket, Warning } from '@carbon/icons-react'
import { checkGlobalQuotasStatus } from '@/utils/quotas-server'
import { AdminWithdrawalsManagement } from './WithdrawalManagement'
import { DashboardFilters } from './DashboardFilters'
import AdminEmailControl from '@/app/components/admin/AdminEmailControl'
import { InternalControlPanel } from './InternalControlPanel'
import { checkPlatformLiquidity, evaluateUserRisk } from '@/utils/risk-engine'

import { calculateProfitToShare, getShareholderByEmail, getShareholdersConfig } from '@/utils/finance-utils'
import InvestorSection from '../finance/InvestorSection'

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
    const supabaseAdmin = await createAdminClient()

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
        { data: pendingWithdrawals, error: errWith },
        { data: notificationData },
        { data: transactionsResult },
        { count: pendingInvestorTransactions },
        { data: allWithGlobal },
        platformLiquidity,
        { data: auditLogs },
        { data: riskUsers, error: riskUserError }
    ] = await Promise.all([
        supabase.from('user_subscriptions').select('*, plan:abonnements(price)').in('status', ['active', 'expired']).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('remboursements').select('*, loan:prets(amount, amount_paid, service_fee, created_at, status, due_date)').eq('status', 'verified').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('prets').select('user_id, amount, amount_paid, service_fee, created_at, status, due_date').in('status', ['active', 'overdue']),
        supabase.from('prets').select('amount, amount_paid, admin_id, created_at, status, service_fee').eq('status', 'paid'),
        supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('prets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('remboursements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        checkGlobalQuotasStatus(month, year),
        supabase.from('abonnements').select('id, name, max_loan_amount'),
        supabase.from('users').select('id, nom, prenom, email, roles').overlaps('roles', ['admin_kyc', 'admin_loan', 'admin_repayment', 'admin_comptable', 'superadmin', 'owner']),
        supabase.from('kyc_submissions').select('created_at, reviewed_at, admin_id, status').gte('reviewed_at', startDate).lte('reviewed_at', endDate).not('admin_id', 'is', null),
        supabase.from('prets').select('created_at, admin_decision_date, admin_id, status').gte('admin_decision_date', startDate).lte('admin_decision_date', endDate).not('admin_id', 'is', null),
        supabase.from('remboursements').select('admin_id, status').gte('validated_at', startDate).lte('validated_at', endDate).not('admin_id', 'is', null),
        supabase.from('admin_commissions').select('admin_id, amount, loan:loan_id(status), type'),
        supabase.from('admin_withdrawals').select('*, admin:admin_id(nom, prenom, email, roles)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('user_notifications').select('*').order('created_at', { ascending: false }).limit(5),
        supabaseAdmin.from('investor_transactions').select('*').order('date', { ascending: false }),
        supabaseAdmin.from('investor_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('admin_withdrawals').select('amount').eq('status', 'approved'),
        checkPlatformLiquidity(),
        supabaseAdmin.from('audit_logs').select('*, actor:actor_user_id(nom, prenom, email)').order('created_at', { ascending: false }).limit(20),
        supabaseAdmin.from('users').select('risk_class, fraud_suspicion_level')
    ]);

    const riskUsersData = (riskUsers as any) || []
    console.log("RISK USERS DATA FETCHED:", riskUsersData?.length, "ERROR if any:", riskUserError)

    // --- RISK & FRAUD ANALYTICS ---
    const fraudSuspicionCount = riskUsersData.filter((u: any) => {
        if (!u.fraud_suspicion_level) return false;
        if (typeof u.fraud_suspicion_level === 'string') return u.fraud_suspicion_level !== 'NONE';
        return u.fraud_suspicion_level > 0;
    }).length

    const getRiskClass = (u: any) => (u.risk_class || 'Standard').toUpperCase()

    const riskDistribution = [
        { label: 'Elite', count: riskUsersData.filter((u: any) => getRiskClass(u) === 'ELITE').length, color: '#10b981' },
        { label: 'Fiable', count: riskUsersData.filter((u: any) => getRiskClass(u) === 'FIABLE').length, color: '#3b82f6' },
        { label: 'Standard', count: riskUsersData.filter((u: any) => getRiskClass(u) === 'STANDARD').length, color: '#6b7280' },
        { label: 'A surveiller', count: riskUsersData.filter((u: any) => getRiskClass(u) === 'A SURVEILLER').length, color: '#f59e0b' },
        { label: 'Risqué', count: riskUsersData.filter((u: any) => getRiskClass(u) === 'RISQUE' || getRiskClass(u) === 'RISQUÉ').length, color: '#ef4444' }
    ]

    const riskStats = {
        exposureRate: (platformLiquidity as any)?.exposureRate || 0,
        decisionStatus: (platformLiquidity as any)?.decisionStatus || 'NORMAL',
        fraudSuspicionCount,
        riskDistribution,
        recentAuditLogs: auditLogs || []
    }

    const ledgerTransactions = (transactionsResult as any) || []

    // NOUVEAU : Intégration des flux associés dans la trésorerie globale
    const totalInvestorWithdrawals = ledgerTransactions.filter((t: any) => t.type === 'withdrawal' && t.status === 'approved').reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0)
    const totalInvestorInvestments = ledgerTransactions.filter((t: any) => t.type === 'investment' && t.status === 'approved').reduce((acc: number, t: any) => acc + Number(t.amount), 0)

    const totalWithdrawals = (allWithGlobal?.reduce((acc: number, w: any) => acc + Number(w.amount), 0) || 0) + totalInvestorWithdrawals

    const { realizedProfit: totalProfitEarned, theoreticalProfit, breakdown } = await calculateProfitToShare(supabaseAdmin)
    const shareholders = await getShareholdersConfig(supabaseAdmin)

    // CALCUL DE LA LIQUIDITÉ RÉELLE (Pour éviter les 603k fantômes)
    const INITIAL_TOTAL_CAPITAL = 2000000
    const capitalInCirculation = (allActiveLoans || []).reduce((acc: number, loan) => acc + Math.max(0, Number(loan.amount) - Number(loan.amount_paid)), 0)

    // Le capital disponible augmente avec les réinvestissements ("Remises")
    const totalCashInCaisse = Math.max(0, (INITIAL_TOTAL_CAPITAL + totalInvestorInvestments) + totalProfitEarned - totalWithdrawals - capitalInCirculation)
    const maxCapitalAllowedInHand = Math.max(0, (INITIAL_TOTAL_CAPITAL + totalInvestorInvestments) - capitalInCirculation)
    const capitalInHand = Math.max(0, Math.min(maxCapitalAllowedInHand, totalCashInCaisse))
    const benefitsInHand = Math.max(0, totalCashInCaisse - capitalInHand)

    // --- LOGIQUE DE PARTS DYNAMIQUES (CAPITAL FLOTTANT) ---
    const allUsers = admins || [] // On utilise la liste des admins déjà chargée
    const idToEmail = Object.fromEntries(allUsers.map(u => [u.id, u.email?.toLowerCase()]))

    const shareholdersWithCapital = shareholders.map(s => {
        const baseCapital = INITIAL_TOTAL_CAPITAL * s.share;
        const myInvestments = ledgerTransactions
            ?.filter((t: any) =>
                (t.shareholder_name?.toLowerCase().trim() === s.name?.toLowerCase().trim()) &&
                t.type === 'investment' &&
                t.status === 'approved'
            )
            .reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0) || 0;

        return { ...s, currentCapital: baseCapital + myInvestments };
    });

    const totalCurrentCapital = shareholdersWithCapital.reduce((acc: number, s: any) => acc + s.currentCapital, 0);

    const enrichedShareholders = shareholdersWithCapital.map(s => {
        const dynamicShare = s.currentCapital / totalCurrentCapital;
        const adminId = allUsers.find(u => u.email?.toLowerCase() === s.email?.toLowerCase())?.id
        const myComms = totalCommissions?.filter((c: any) => c.admin_id === adminId) || []
        const realizedComms = myComms.filter((c: any) => c.loan?.status === 'paid' || c.type === 'repayment_reward')
        const totalComms = realizedComms.reduce((acc: number, c: any) => acc + Number(c.amount), 0)

        // Dette
        const myLoans = allActiveLoans?.filter(l => idToEmail[l.user_id] === s.email?.toLowerCase()) || []
        const myDebt = myLoans.reduce((acc: number, l: any) => {
            const { totalDebt } = calculateLoanDebt(l as any)
            return acc + totalDebt
        }, 0)

        const myTransactions = ledgerTransactions.filter((t: any) =>
            t.shareholder_name?.toLowerCase().trim() === s.name?.toLowerCase().trim()
        )
        const approvedTransactions = myTransactions.filter((t: any) => t.status === 'approved')
        const totalAdjustments = approvedTransactions.reduce((acc: number, t: any) => acc + Number(t.amount), 0)

        return {
            ...s,
            realizedComms: totalComms,
            totalDebt: myDebt,
            share: dynamicShare,
            originalShare: s.share,
            totalAdjustments: totalAdjustments,
            balance: Math.floor(totalProfitEarned * dynamicShare) + totalAdjustments + totalComms
        }
    })

    const monthlyRevenue = monthlySubs?.reduce((acc: number, sub: any) => acc + (Number(sub.plan?.price) || 0), 0) || 0
    const periodPenaltiesCollected = allRemboursements?.reduce((acc: number, r: any) => acc + (Number(r.surplus_amount) || 0), 0) || 0

    const activeStats = (allActiveLoans || []).reduce((acc: number, loan: any) => acc + calculateLoanDebt(loan as any).totalDebt, 0)
    const totalRemainingToRecover = activeStats

    const totalFeesCollected = allPaidLoans?.reduce((acc: number, l: any) => acc + (Number(l.service_fee || 0) * 0.4), 0) || 0
    const monthlyFeesRevenue = allPaidLoans?.filter(l =>
        new Date(l.created_at) >= new Date(startDate) &&
        new Date(l.created_at) <= new Date(endDate)
    ).reduce((acc: number, l) => acc + Number(l.service_fee || 0), 0) || 0

    const offersMap: Record<string, string> = {}
    allOffersNames?.forEach(o => {
        offersMap[o.id] = o.name
        offersMap[o.max_loan_amount.toString()] = o.name
    })

    const currentActivePenalties = (allActiveLoans || []).reduce((acc, loan) => acc + calculateLoanDebt(loan as any).latePenalties, 0)

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

    // --- SLA & PERFORMANCE KPIs ---
    // KYC SLA (in hours)
    const kycSLA = kycData?.filter(k => (k as any).reviewed_at && k.created_at).map(k => {
        const diff = new Date((k as any).reviewed_at).getTime() - new Date(k.created_at).getTime()
        return diff / (1000 * 60 * 60)
    }) || []
    const avgKycSLA = kycSLA.length > 0 ? kycSLA.reduce((a, b) => a + b, 0) / kycSLA.length : 0

    // LOAN SLA (in hours)
    const loanSLA = loanData?.filter(l => (l as any).admin_decision_date && l.created_at).map(l => {
        const diff = new Date((l as any).admin_decision_date).getTime() - new Date(l.created_at).getTime()
        return diff / (1000 * 60 * 60)
    }) || []
    const avgLoanSLA = loanSLA.length > 0 ? loanSLA.reduce((a, b) => a + b, 0) / loanSLA.length : 0

    // Repayment Rate
    const totalDueGlobal = (allActiveLoans || []).reduce((acc: number, l: any) => acc + calculateLoanDebt(l as any).totalDebt, 0) + (allPaidLoans || []).reduce((acc: number, l: any) => acc + Number(l.amount) + Number(l.service_fee), 0)
    const totalPaidGlobal = (allActiveLoans || []).reduce((acc: number, l: any) => acc + Number(l.amount_paid), 0) + (allPaidLoans || []).reduce((acc: number, l: any) => acc + Number(l.amount_paid), 0)
    const globalRepaymentRate = totalDueGlobal > 0 ? (totalPaidGlobal / totalDueGlobal) * 100 : 100

    // --- PERSONAL PROFIT SHARING LOGIC (DRY VERSION) ---
    const { data: { user } } = await supabase.auth.getUser()
    const currentUser = (admins || []).find(a => a.id === user?.id)
    const currentEmail = currentUser?.email || user?.email || ''
    const currentUserRoles = currentUser?.roles || []

    let myShareStats = null
    const myEnriched = enrichedShareholders.find(s => s.email?.toLowerCase() === currentEmail.toLowerCase())
    if (myEnriched) {
        myShareStats = {
            name: myEnriched.name,
            sharePercent: (myEnriched.share * 100).toFixed(3),
            color: myEnriched.color,
            theoreticalGain: Math.floor(theoreticalProfit * myEnriched.share),
            availableBalance: myEnriched.balance,
            forecastedBalance: Math.floor(theoreticalProfit * myEnriched.share) + (myEnriched.balance - Math.floor(totalProfitEarned * myEnriched.share)),
            adjustments: myEnriched.balance - Math.floor(totalProfitEarned * myEnriched.share) - myEnriched.realizedComms
        }
    }


    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
                                <Rocket size={24} />
                            </span>
                            <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Control Center</h1>
                        </div>
                        <p className="text-slate-500 font-bold italic leading-relaxed">Intelligence financière & Flux opérationnels</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest italic">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Système Nominal
                        </div>
                        <Link href="/admin/finance" className="px-5 py-2.5 rounded-2xl bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all italic">
                            Audit Comptable
                        </Link>
                        <DashboardFilters currentMonth={month} currentYear={year} currentPeriod={period} />
                    </div>
                </header>

                {/* ─── PHASE 1: FINANCIAL CLARITY (Actionable) ─── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                    {[
                        { label: 'Revenue Période', value: monthlyRevenue + monthlyFeesRevenue, color: 'text-emerald-400', sub: `Subs + ${monthlyFeesRevenue.toLocaleString('fr-FR')} F`, icon: <Currency size={18} />, href: '/admin/super/subscriptions' },
                        { label: 'Admin Gain', value: totalFeesCollected, color: 'text-blue-400', sub: 'Sur dossiers payés', icon: <Time size={18} />, href: '/admin/finance' },
                        { label: 'Vol. Pénalités', value: periodPenaltiesCollected, color: 'text-blue-400', sub: 'Encaissé (Flux)', icon: <Wallet size={18} />, href: '/admin/repayments?status=verified' },
                        { label: 'Pénalités Latentes', value: currentActivePenalties, color: 'text-amber-400', sub: 'Retards actifs', icon: <Time size={18} />, href: '/admin/loans?status=overdue' },
                        { label: 'Dette Totale', value: totalRemainingToRecover, color: 'text-red-400', sub: 'Encours global', icon: <Document size={18} />, href: '/admin/loans?status=active' }
                    ].map((kpi, i) => (
                        <Link key={i} href={kpi.href} className="relative group/kpi block h-full">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 rounded-2xl blur opacity-0 group-hover/kpi:opacity-100 transition-all duration-500" />
                            <div className="relative glass-panel p-5 bg-slate-900/40 border-slate-800/50 flex flex-col justify-between hover:border-blue-500/40 hover:bg-slate-900/60 transition-all shadow-lg h-full overflow-hidden group/box">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/kpi:opacity-100 transition-all translate-x-2 group-hover/kpi:translate-x-0">
                                    <ChevronRight size={16} className="text-blue-500" />
                                </div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-slate-500 group-hover/kpi:text-blue-400 transition-colors">{kpi.icon}</div>
                                    <div className={`w-1.5 h-1.5 rounded-full ${i === 4 ? 'bg-red-500 animate-pulse' : 'bg-blue-600/50'}`}></div>
                                </div>
                                <div>
                                    <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">{kpi.label}</h2>
                                    <p className={`text-xl font-black tracking-tighter italic ${kpi.color}`}>
                                        {kpi.value.toLocaleString('fr-FR')} <span className="text-[8px] uppercase ml-0.5 not-italic">F</span>
                                    </p>
                                    <p className="text-[7px] font-bold text-slate-600 mt-1 italic uppercase truncate group-hover/box:text-slate-400 transition-colors">{kpi.sub}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ─── PHASE 2: ADMIN HUB (Always Accessible) ─── */}
                <section className="mb-14 relative group animate-slide-up">
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 rounded-[3rem] blur-3xl opacity-50" />
                    <div className="relative glass-panel p-2 bg-slate-950/40 border-white/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
                        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/5">
                            {[
                                { label: 'KYC', count: pendingKyc, href: '/admin/kyc', icon: <Identification size={24} />, color: 'from-amber-500/20 to-orange-500/10', iconColor: 'text-amber-500', desc: 'Identités' },
                                { label: 'Prêts', count: pendingLoans, href: '/admin/loans', icon: <RequestQuote size={24} />, color: 'from-blue-500/20 to-indigo-500/10', iconColor: 'text-blue-500', desc: 'Demandes' },
                                { label: 'Subs', count: pendingSubs, href: '/admin/super/subscriptions', icon: <Currency size={24} />, color: 'from-emerald-500/20 to-teal-500/10', iconColor: 'text-emerald-500', desc: 'Abonnements' },
                                { label: 'Remb.', count: pendingRepayments, href: '/admin/repayments', icon: <Receipt size={24} />, color: 'from-purple-500/20 to-pink-500/10', iconColor: 'text-purple-500', desc: 'Transactions' },
                                { label: 'Users', count: null, href: '/admin/users', icon: <UserMultiple size={24} />, color: 'from-slate-500/20 to-slate-400/10', iconColor: 'text-slate-400', desc: 'Base Clients' }
                            ].map((item, i) => (
                                <Link key={i} href={item.href} className="flex-1 group/hub px-8 py-10 hover:bg-white/[0.02] transition-all relative overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover/hub:opacity-100 transition-opacity duration-500`} />
                                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center ${item.iconColor} shadow-2xl group-hover/hub:scale-110 group-hover/hub:-translate-y-1 transition-all duration-300`}>
                                            {item.icon}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black text-white italic uppercase tracking-tighter leading-none">{item.label}</h4>
                                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none">{item.desc}</p>
                                        </div>
                                        {item.count !== null && (
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${(item.count || 0) > 0 ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'}`} />
                                                <span className={`text-[10px] font-black italic ${(item.count || 0) > 0 ? 'text-white' : 'text-slate-700'}`}>
                                                    {(item.count || 0)} <span className="text-[8px] uppercase font-bold ml-0.5">En cours</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {((pendingInvestorTransactions || 0) > 0 || (pendingWithdrawals?.length || 0) > 0) && (
                        <div className="mt-8 relative glass-panel p-8 bg-slate-950/20 border-white/5 rounded-[2.5rem] space-y-10">
                            <InvestorSection
                                shareholders={enrichedShareholders}
                                totalProfitToShare={totalProfitEarned}
                                ledger={ledgerTransactions}
                                currentUserEmail={currentEmail}
                                profitBreakdown={breakdown}
                                showAll={currentUserRoles.includes('superadmin') || currentUserRoles.includes('owner')}
                                compact={true}
                            />
                            <AdminWithdrawalsManagement initialWithdrawals={pendingWithdrawals || []} />
                        </div>
                    )}
                </section>

                {/* ─── PHASE 3: OPERATIONNEL & SIDEBAR ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* SLA Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Taux Remboursement', value: `${globalRepaymentRate.toFixed(1)}%`, icon: <CheckmarkFilled />, color: 'emerald', href: '/admin/repayments' },
                                { label: 'SLA KYC Moy.', value: `${avgKycSLA.toFixed(1)}h`, icon: <Time />, color: 'blue', href: '/admin/kyc' },
                                { label: 'SLA Prêts Moy.', value: `${avgLoanSLA.toFixed(1)}h`, icon: <Rocket />, color: 'purple', href: '/admin/loans' }
                            ].map((stat, i) => (
                                <Link key={i} href={stat.href} className="glass-panel p-6 bg-slate-900/40 border-white/5 flex items-center gap-5 hover:border-blue-500/20 hover:bg-slate-900/60 transition-all group/stat">
                                    <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center group-hover/stat:scale-110 transition-transform`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 italic">{stat.label}</p>
                                        <p className="text-2xl font-black text-white italic tracking-tighter">{stat.value}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Quotas & Alertes side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Link href="/admin/super/offers" className="glass-panel p-6 bg-slate-900/40 border-slate-800 space-y-5 hover:border-emerald-500/30 transition-all group/quotas cursor-pointer block">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black italic">Q</span>
                                        Quotas
                                    </h3>
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest opacity-0 group-hover/quotas:opacity-100 transition-all">Gérer →</span>
                                </div>
                                <div className="space-y-3">
                                    {quotasArray.map((quota, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-black text-slate-400 italic">{quota.label}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-500">{quota.value}/{quota.limit}</span>
                                                    <span className={`text-[10px] font-black italic ${quota.status === 'danger' ? 'text-red-500' : quota.status === 'warning' ? 'text-amber-400' : 'text-emerald-500'}`}>
                                                        {Math.round(quota.percent || 0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${quota.status === 'danger' ? 'bg-red-500' : quota.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(quota.percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {quotasArray.length === 0 && <p className="text-[10px] text-slate-600 italic">Aucun quota configuré.</p>}
                                </div>
                            </Link>

                            <section className="glass-panel p-6 bg-slate-900/40 border-slate-800 space-y-5">
                                <h3 className="text-sm font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-[10px] font-black italic">@</span>
                                    Alertes Email
                                </h3>
                                <AdminEmailControl stats={{ lastReminders: notificationData || [] }} />
                            </section>
                        </div>
                    </div>

                    {/* ─── SIDEBAR: LEADERBOARD & CONTRÔLE ─── */}
                    <div className="space-y-8">
                        {/* Admin Leaderboard */}
                        <section className="glass-panel p-6 bg-slate-900/40 border-slate-800 space-y-5">
                            <h3 className="text-sm font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-[10px] font-black italic">P</span>
                                Activité Admins
                            </h3>
                            <div className="space-y-2">
                                {adminPerformance.map((admin: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[9px] font-black text-blue-500 uppercase italic">
                                                {(admin.prenom || '')[0]}{(admin.nom || '')[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white italic uppercase">{admin.prenom}</p>
                                                <p className="text-[8px] font-bold text-slate-600 tracking-wider italic">{admin.roles?.[0]?.replace('admin_', '')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-black italic text-white">{admin.totalActions}</span>
                                            <span className="text-[7px] font-bold text-slate-600 uppercase">act.</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <InternalControlPanel stats={riskStats} />
                    </div>
                </div>

                {/* ─── PHASE 4: ÉQUIPE ASSOCIÉS (FULL WIDTH) ─── */}
                <section className="space-y-6 pt-4">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                        <h3 className="text-sm font-black text-white tracking-tighter uppercase italic flex items-center gap-3 whitespace-nowrap">
                            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black italic">€</span>
                            Équipe Associés
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                    </div>
                    <InvestorSection
                        shareholders={enrichedShareholders}
                        totalProfitToShare={totalProfitEarned}
                        ledger={ledgerTransactions}
                        currentUserEmail={currentEmail}
                        profitBreakdown={breakdown}
                        showAll={currentUserRoles.includes('superadmin') || currentUserRoles.includes('owner')}
                        compact={true}
                        hideValidation={true}
                    />
                </section>
            </div>
        </div>
    )
}
