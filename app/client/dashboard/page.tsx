import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckmarkOutline, Rocket, Flash, Wallet, Chat, Help, Add, Time } from '@carbon/icons-react'
import ContactInfoForm from './ContactInfoForm'
import DashboardSuccessToast from './DashboardSuccessToast'

interface SubscriptionPlan {
    name: string
}

interface UserSubscription {
    is_active: boolean
    status: string
    rejection_reason?: string | null
    plan_id: string
    end_date: string
    created_at: string
    admin_id?: string
    plan: SubscriptionPlan // Standardize to match other pages
}

interface Loan {
    id: string
    amount: number
    status: string
    created_at: string
    due_date?: string
    admin_decision_date?: string
    amount_paid?: number
    service_fee?: number
}

interface Repayment {
    id: string
    amount_declared: number
    status: string
    created_at: string
    validated_at?: string
}

export default async function ClientDashboard() {
    const supabase = await createClient()

    // LAZY-CRON: Auto-update statuses silently
    await supabase.rpc('auto_update_system_statuses')

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    // Concurrent High-Speed Data Fetching
    const [
        { data: profile },
        { data: userSubsRaw },
        { data: activeLoans },
        { data: recentLoans },
        { data: recentRepayments },
        { data: kycDocs }
    ] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('user_subscriptions').select('*, plan:abonnements(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('prets').select('amount, amount_paid, service_fee, created_at, status, due_date').eq('user_id', user.id).in('status', ['active', 'overdue']),
        supabase.from('prets').select('id, amount, amount_paid, service_fee, status, created_at, admin_decision_date, due_date').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('remboursements').select('id, loan_id, amount_declared, status, created_at, validated_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('kyc_submissions').select('status').eq('user_id', user.id).maybeSingle()
    ]);

    const userSubs = (userSubsRaw || []).map((sub: any) => ({
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

    const now = new Date().toISOString()
    const allSubs = userSubs || []

    // Find a subscription that is active and not expired - Sync mapping with subscriptions page (less strict on is_active)
    const activeSub = allSubs.find((sub: UserSubscription) =>
        sub.status === 'active' && sub.end_date && sub.end_date > now
    )

    // Find if there's an expired but previously active subscription
    const expiredSub = !activeSub ? allSubs.find((sub: UserSubscription) =>
        (sub.status === 'expired' || sub.status === 'active') && sub.end_date && sub.end_date <= now
    ) : null

    // Fetch account manager info if there is an active sub with an admin assigned
    let accountManager = null;
    if (activeSub?.admin_id) {
        const { data: adminData } = await supabase.from('users').select('nom, prenom, whatsapp').eq('id', activeSub.admin_id).single()
        accountManager = adminData
    }

    const { calculateLoanDebt } = await import('@/utils/loan-utils')
    const totalOutstanding = activeLoans?.reduce((acc, loan) => {
        return acc + calculateLoanDebt(loan as any).totalDebt;
    }, 0) || 0

    // Fetch latest for Status Hub
    const latestLoan = recentLoans?.[0]
    const latestLoanDebt = latestLoan ? calculateLoanDebt(latestLoan as any).totalDebt : 0
    const latestRepayment = recentRepayments?.[0]
    const latestSubscription = allSubs[0]

    // Combine and format notifications
    const notifications = [
        ...allSubs.map((s: UserSubscription) => ({
            id: `sub-${s.created_at}`,
            text: s.status === 'pending' ? `Paiement abonnement ${s.plan?.name || '...'} en cours de validation` :
                s.status === 'active' ? `Abonnement ${s.plan?.name || '...'} actif` :
                    s.status === 'rejected' ? `Paiement ${s.plan?.name || '...'} refusé : ${s.rejection_reason || 'Inconnu'}` :
                        `Abonnement ${s.plan?.name || '...'} expiré`,
            date: s.created_at,
            type: s.status === 'pending' ? 'pending' : 'status',
            status: s.status
        })),
        ...(recentLoans?.map(l => ({
            id: `loan-${l.id}`,
            text: l.status === 'pending' ? `Votre demande de ${((l.amount || 0) + (l.service_fee || 0)).toLocaleString('fr-FR')} F est en cours` :
                l.status === 'active' ? `C'est bon ! Votre prêt de ${((l.amount || 0) + (l.service_fee || 0)).toLocaleString('fr-FR')} F est prêt` :
                    l.status === 'overdue' ? `Attention : Votre prêt de ${((l.amount || 0) + (l.service_fee || 0)).toLocaleString('fr-FR')} F est en retard` :
                        l.status === 'paid' ? `Bravo ! Prêt de ${((l.amount || 0) + (l.service_fee || 0)).toLocaleString('fr-FR')} F fini de payer` :
                            `Désolé, votre prêt de ${((l.amount || 0) + (l.service_fee || 0)).toLocaleString('fr-FR')} F a été refusé`,
            date: l.admin_decision_date || l.created_at,
            type: l.status === 'pending' ? 'pending' : 'status',
            status: l.status
        })) || []),
        ...(recentRepayments?.map(r => ({
            id: `rep-${r.id}`,
            text: r.status === 'pending' ? `On vérifie votre reçu de ${(r.amount_declared || 0).toLocaleString('fr-FR')} F` :
                r.status === 'verified' ? `Merci ! Votre paiement de ${(r.amount_declared || 0).toLocaleString('fr-FR')} F est reçu` :
                    `Désolé, votre reçu de ${(r.amount_declared || 0).toLocaleString('fr-FR')} F a été rejeté`,
            date: r.validated_at || r.created_at,
            type: r.status === 'pending' ? 'pending' : 'status',
            status: r.status
        })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

    // Identity Card Formatting
    const kycBadge = profile?.is_account_active ? 'Complet' : kycDocs?.status === 'rejected' ? 'Refusé' : kycDocs ? 'En attente' : 'Incomplet'
    const kycColor = profile?.is_account_active ? 'bg-emerald-500/10 text-emerald-500' : kycDocs?.status === 'rejected' ? 'bg-red-500/10 text-red-500/80 animate-pulse' : kycDocs ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
    const kycProgress = profile?.is_account_active ? '100' : kycDocs?.status === 'rejected' ? '33' : kycDocs ? '66' : '33'

    const loansWithPendingPayments = new Set(
        recentRepayments?.filter(r => r.status === 'pending').map(r => r.loan_id) || []
    )

    const imminentDeadlines = recentLoans?.filter(l =>
        (l.status === 'active' || l.status === 'overdue') &&
        !loansWithPendingPayments.has(l.id) &&
        l.due_date &&
        (new Date(l.due_date).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000)
    ) || []


    return (
        <div className="py-12 md:py-24 page-transition">
            <DashboardSuccessToast />
            <div className="main-container">
                {/* Hero Dashboard Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 mb-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 animate-fade-in">
                            <span className="h-4 w-1 bg-blue-600 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-500">Accès Elite Privilégié</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8]">
                            Mon Espace <br />
                            <span className="premium-gradient-text uppercase">Financier.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xl italic lg:max-w-2xl">
                            Bienvenue <span className="text-white not-italic">{profile?.prenom}</span>. Voici la situation de votre portefeuille <span className="text-blue-500">Creditly</span> à cet instant.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full xl:w-auto">
                        <div className="flex flex-col p-6 bg-slate-900 shadow-2xl rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Dette Totale</p>
                            <p className={`text-2xl font-black italic tracking-tighter ${totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                {totalOutstanding.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-700">F</span>
                            </p>
                            <p className="text-[8px] font-bold text-slate-700 uppercase mt-2 italic">{totalOutstanding > 0 ? 'À régulariser' : 'Libéré de dette'}</p>
                        </div>

                        <div className="flex flex-col p-6 bg-slate-900 shadow-2xl rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-600/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-600/10 transition-colors"></div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Score Confiance</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">
                                {totalOutstanding > 0 ? '92%' : '100%'}
                            </p>
                            <p className="text-[8px] font-bold text-emerald-500 uppercase mt-2 italic">Status : Excellent</p>
                        </div>

                        <div className="flex flex-col p-6 bg-slate-900 shadow-2xl rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-600/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-600/10 transition-colors"></div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Plafond Possible</p>
                            <p className="text-2xl font-black text-blue-500 italic tracking-tighter">
                                {(activeSub?.plan?.max_loan_amount || latestSubscription?.plan?.max_loan_amount || 0).toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-700">F</span>
                            </p>
                            <p className="text-[8px] font-bold text-slate-700 uppercase mt-2 italic">Capacité d&apos;emprunt</p>
                        </div>
                    </div>
                </div>

                {/* Imminent Deadlines Alert */}
                {imminentDeadlines.length > 0 && (
                    <div className="mb-12 animate-bounce-subtle">
                        <Link href="/client/loans" className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl group hover:bg-red-500/20 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                                <Time size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Attention : Il faut payer bientôt</p>
                                <p className="text-sm font-bold text-white italic">
                                    Vous avez {imminentDeadlines.length} prêt{imminentDeadlines.length > 1 ? 's' : ''} en retard ou presque. Régularisez vite pour éviter les frais.
                                </p>
                            </div>
                            <div className="text-red-500 font-black italic uppercase text-[10px] tracking-widest group-hover:translate-x-2 transition-transform">
                                Payer maintenant →
                            </div>
                        </Link>
                    </div>
                )}

                {/* Status Monitoring Hub */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 whitespace-nowrap bg-slate-950 px-4">L&apos;état de mes dossiers</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* KYC Status */}
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all flex flex-col justify-between min-h-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Identité (KYC)</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black text-white italic truncate">Dossier KYC</span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${kycColor}`}>
                                        {kycBadge}
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${kycColor.replace('text-', 'bg-').split(' ')[1]}`} style={{ width: `${kycProgress}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Status */}
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all flex flex-col justify-between min-h-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Mon Forfait</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black text-white italic truncate">{activeSub?.plan?.name || expiredSub?.plan?.name || latestSubscription?.plan?.name || 'N/A'}</span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${activeSub ? 'bg-emerald-500/10 text-emerald-500' :
                                        expiredSub ? 'bg-red-500/10 text-red-500' :
                                            latestSubscription && (latestSubscription.status === 'pending' || !latestSubscription.is_active) ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {activeSub ? 'Actif' : expiredSub ? 'Expiré' : latestSubscription && (latestSubscription.status === 'pending' || !latestSubscription.is_active) ? 'Validation' : 'Aucun'}
                                    </span>
                                </div>
                                <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                                    {activeSub && activeSub.end_date
                                        ? `Échéance : ${new Date(activeSub.end_date).toLocaleDateString('fr-FR')}`
                                        : expiredSub ? '⚠️ Abonnement expiré' : 'Services restreints'}
                                </p>
                            </div>
                        </div>

                        {/* Loan Status */}
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all flex flex-col justify-between min-h-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Mon Prêt (Solde)</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className={`text-xl font-black italic truncate ${latestLoan?.status === 'paid' ? 'text-emerald-400' : 'text-white'}`}>
                                        {latestLoan?.status === 'paid' ? 'Soldé (0 F)' : latestLoan ? `${latestLoanDebt.toLocaleString('fr-FR')} F` : 'Aucun'}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${latestLoan?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                                        latestLoan?.status === 'overdue' ? (loansWithPendingPayments.has(latestLoan.id) ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500 animate-pulse') :
                                            latestLoan?.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                latestLoan?.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                                    latestLoan?.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {latestLoan?.status === 'active' ? 'Approuvé' :
                                            latestLoan?.status === 'overdue' ? (loansWithPendingPayments.has(latestLoan.id) ? 'Vérification' : 'En Retard') :
                                                latestLoan?.status === 'pending' ? 'Étude' :
                                                    latestLoan?.status === 'rejected' ? 'Refusé' :
                                                        latestLoan?.status === 'paid' ? 'Payé' : 'Libre'}
                                    </span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">
                                    {latestLoan?.status === 'paid' ? 'Régularité exemplaire' : latestLoan?.status === 'active' && latestLoan.due_date
                                        ? `Date limite : ${new Date(latestLoan.due_date).toLocaleDateString('fr-FR')}`
                                        : latestLoan ? `Emprunté le ${new Date(latestLoan.created_at).toLocaleDateString('fr-FR')}` : 'Prêt à vous aider'}
                                </p>
                            </div>
                        </div>

                        {/* Repayment Status */}
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all flex flex-col justify-between min-h-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Mon Paiement</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black text-white italic truncate">{latestRepayment ? `${(latestRepayment.amount_declared || 0).toLocaleString('fr-FR')} F` : 'À définir'}</span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${latestRepayment?.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                        latestRepayment?.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                            latestRepayment?.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {latestRepayment?.status === 'verified' ? 'Validé' :
                                            latestRepayment?.status === 'pending' ? 'Vérif' :
                                                latestRepayment?.status === 'rejected' ? 'Refusé' : 'Aucun'}
                                    </span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">
                                    {latestRepayment ? `Envoyé le ${new Date(latestRepayment.created_at).toLocaleDateString('fr-FR')}` : 'Aucun reçu'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {/* Card Identity */}
                            <div className="virtual-card border-slate-800 shadow-2xl hover:scale-[1.02] transition-transform duration-500 group">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">Mes Papiers</p>
                                        <p className="text-2xl font-black text-white italic uppercase tracking-tighter">Profil Validé</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center text-blue-400 border border-white/10 group-hover:rotate-12 transition-transform">
                                        <CheckmarkOutline size={24} />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-[0.2em] italic">•••• {user.id.slice(-4)}</p>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Titulaire</p>
                                            <p className="text-xs sm:text-sm font-bold text-white uppercase">{profile?.prenom} {profile?.nom}</p>
                                        </div>
                                        <div className="px-3 sm:px-5 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest italic">
                                            Priorité Active
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Status Card */}
                            <div className="glass-panel p-8 sm:p-10 flex flex-col justify-between bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                        <Rocket size={32} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Montant possible</p>
                                        <p className={`text-xs font-black uppercase mt-1 ${activeSub ? 'text-emerald-400' : expiredSub ? 'text-red-500' : 'text-amber-500'}`}>
                                            {activeSub ? 'Tout est bon' : expiredSub ? 'C&apos;est fini' : 'Pas actif'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-3">
                                    <h3 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                                        {activeSub?.plan?.name || expiredSub?.plan?.name || latestSubscription?.plan?.name || 'Aucun forfait'}
                                    </h3>
                                    {activeSub && activeSub.end_date && (
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">
                                            Valide jusqu'au {new Date(activeSub.end_date).toLocaleDateString('fr-FR')}
                                        </p>
                                    )}
                                    <Link href="/client/subscriptions" className="inline-flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:gap-3 transition-all">
                                        Changer de forfait <Flash size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Account Manager Notification */}
                        {accountManager && (
                            <div className="glass-panel p-6 sm:p-8 bg-gradient-to-br from-blue-900/30 to-slate-900 border-blue-500/20 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
                                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-600 border border-blue-500 shadow-xl flex items-center justify-center shrink-0">
                                        <span className="text-2xl font-black text-white italic tracking-tighter">
                                            VIP
                                        </span>
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tighter italic mb-1">Votre Assistant Personnel</h3>
                                        <p className="text-xs font-bold text-slate-400 mb-4 max-w-lg">
                                            Un assistant s&apos;occupe de vous et a validé votre compte. Contactez-le si vous avez besoin d&apos;aide.
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Service Elite</p>
                                                <p className="text-sm font-black text-slate-200">Conseiller Dédié</p>
                                            </div>
                                            {accountManager.whatsapp && (
                                                <a href={`https://wa.me/${accountManager.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="premium-button py-2.5 px-6 inline-flex items-center gap-2">
                                                    <Chat size={16} /> Contacter sur WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Activity Mini-Panel */}
                        <div className="glass-panel p-6 sm:p-8 bg-slate-900/50 border-slate-800">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                Système Notifications
                            </h3>
                            <div className="space-y-4">
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <div key={notif.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-all">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.type === 'pending' ? 'bg-amber-600/10 text-amber-500' :
                                                notif.status === 'rejected' ? 'bg-red-600/10 text-red-500' :
                                                    'bg-blue-600/10 text-blue-500'
                                                }`}>
                                                <Chat size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{notif.text}</p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-tight italic">
                                                    {new Date(notif.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {notif.type === 'pending' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></div>}
                                            {notif.type === 'status' && <div className={`w-2 h-2 rounded-full shrink-0 ${notif.status === 'rejected' ? 'bg-red-500' : 'bg-blue-600'}`}></div>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 text-slate-500 italic">
                                        <p className="text-xs font-bold">Aucune notification récente.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                            {[
                                { t: 'Mon Forfait', d: 'Vos avantages', icon: <Flash />, href: '/client/subscriptions' },
                                { t: 'Mes Prêts', d: 'Ma liste et mes demandes', icon: <Rocket />, href: '/client/loans' },
                                { t: 'Mes Paiements', d: 'Envoyer mes reçus', icon: <Wallet />, href: '/client/loans/repayment' }
                            ].map((action, i) => (
                                <Link key={i} href={action.href} className="glass-panel p-8 group hover:border-blue-500/40 relative overflow-hidden transition-all duration-500 bg-slate-900/50 border-slate-800">
                                    <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-150 transition-transform duration-700">
                                        {action.icon}
                                    </div>
                                    <div className="space-y-10 relative z-10 text-left">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                            {action.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-white uppercase italic leading-none mb-2">{action.t}</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-relaxed italic">{action.d}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-8">
                        {/* Financial Stats */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-sm hover:border-blue-500/30 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center shadow-inner shrink-0">
                                    <Wallet size={24} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ce que je dois au total</p>
                                    <p className="text-2xl font-black text-white tracking-tighter italic truncate">{(totalOutstanding || 0).toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                                </div>
                            </div>

                            <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 group hover:border-emerald-500/20 transition-all flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center shadow-inner shrink-0">
                                    <CheckmarkOutline size={24} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dernière Opération</p>
                                    <p className="text-2xl font-black text-white tracking-tighter italic truncate">Validée</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="glass-panel p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-colors"></div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-6">Mes <br /> Informations</h4>
                            <ContactInfoForm
                                defaultWhatsapp={profile?.whatsapp}
                                defaultNom={profile?.nom}
                                defaultPrenom={profile?.prenom}
                                defaultBirthDate={profile?.birth_date}
                                defaultProfession={profile?.profession}
                                defaultGuarantorNom={profile?.guarantor_nom}
                                defaultGuarantorPrenom={profile?.guarantor_prenom}
                                defaultGuarantorWhatsapp={profile?.guarantor_whatsapp}
                            />
                        </div>

                        {/* Support & Help */}
                        <div className="glass-panel p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-600/10 transition-colors"></div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-6">Aide & <br /> Messages</h4>
                            <div className="space-y-3">
                                <button className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:bg-slate-900 transition-all group/item">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/item:text-blue-400 transition-colors">Base de Savoir</span>
                                    <Help size={20} className="text-slate-700" />
                                </button>
                                <Link
                                    href="https://wa.me/14383906281"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:bg-slate-900 transition-all group/item"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/item:text-emerald-400 transition-colors">Sur WhatsApp</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                                    </div>
                                    <Chat size={20} className="text-slate-700" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support Luxury Section */}
                <div className="mt-20 glass-panel p-8 sm:p-12 lg:p-16 bg-slate-900 border-slate-800 text-white relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,1),transparent_70%)]"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="space-y-8">
                            <div className="inline-flex px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-[10px] font-black uppercase tracking-widest text-blue-400">
                                Conciergerie 24/7
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
                                Assistance <br /><span className="premium-gradient-text uppercase">Immédiate.</span>
                            </h2>
                            <p className="text-slate-500 font-bold text-lg max-w-md italic">
                                Une question ? Nos experts vous accompagnent avec la réactivité exigée par votre statut.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="https://wa.me/14383906281"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="premium-button px-10"
                                >
                                    <Chat size={20} />
                                    <span>Chat Live</span>
                                </Link>
                                <button className="glass-panel bg-slate-800/50 border-slate-700 px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-3">
                                    <Help size={20} className="text-blue-500" />
                                    Questions fréquentes
                                </button>
                            </div>
                        </div>
                        <div className="hidden lg:block relative">
                            <div className="absolute -inset-10 bg-blue-600/10 blur-[100px] animate-mesh"></div>
                            <div className="relative glass-panel bg-slate-900/80 border-slate-800 p-10 backdrop-blur-3xl transform rotate-3 hover:rotate-0 transition-transform duration-1000 shadow-2xl">
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black italic">C</div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-1/3 bg-white/10 rounded-full animate-pulse"></div>
                                            <div className="h-3 w-full bg-white/5 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400 italic">
                                        &quot;Support Opérationnel : Comment pouvons-nous vous aider aujourd&apos;hui ?&quot;
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
