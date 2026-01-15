import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { updateContactInfo } from '../user-actions'
import { CheckmarkOutline, Rocket, Flash, Wallet, Chat, Help, Add } from '@carbon/icons-react'

export default async function ClientDashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*, user_subscriptions(is_active, plan_id, abonnements(name))')
        .eq('id', user.id)
        .single()

    const activeSub = profile?.user_subscriptions?.find((sub: { is_active: boolean }) => sub.is_active)

    // Fetch active loans for "En-cours total"
    const { data: activeLoans } = await supabase
        .from('prets')
        .select('amount, amount_paid')
        .eq('user_id', user.id)
        .eq('status', 'active')

    const totalOutstanding = activeLoans?.reduce((acc, loan) => acc + (loan.amount - (loan.amount_paid || 0)), 0) || 0

    // Fetch recent activities for notifications
    const { data: recentLoans } = await supabase
        .from('prets')
        .select('id, amount, status, created_at, admin_decision_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

    const { data: recentRepayments } = await supabase
        .from('remboursements')
        .select('id, amount_declared, status, created_at, validated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

    // Fetch latest for Status Hub
    const latestLoan = recentLoans?.[0]
    const latestRepayment = recentRepayments?.[0]
    const latestSubscription = profile?.user_subscriptions?.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]

    // Check if KYC docs exist
    const { data: kycDocs } = await supabase.from('kyc_submissions').select('status').eq('user_id', user.id).maybeSingle()

    // Combine and format notifications
    const notifications = [
        ...(recentLoans?.map(l => ({
            id: `loan-${l.id}`,
            text: l.status === 'pending' ? `Demande de prêt de ${l.amount.toLocaleString()} FCFA en attente` :
                l.status === 'active' ? `Prêt de ${l.amount.toLocaleString()} FCFA approuvé` :
                    l.status === 'paid' ? `Prêt de ${l.amount.toLocaleString()} FCFA entièrement remboursé` :
                        `Demande de prêt de ${l.amount.toLocaleString()} FCFA rejetée`,
            date: l.admin_decision_date || l.created_at,
            type: l.status === 'pending' ? 'pending' : 'status',
            status: l.status
        })) || []),
        ...(recentRepayments?.map(r => ({
            id: `rep-${r.id}`,
            text: r.status === 'pending' ? `Preuve de remboursement de ${r.amount_declared.toLocaleString()} FCFA en attente` :
                r.status === 'verified' ? `Remboursement de ${r.amount_declared.toLocaleString()} FCFA validé` :
                    `Remboursement de ${r.amount_declared.toLocaleString()} FCFA rejeté`,
            date: r.validated_at || r.created_at,
            type: r.status === 'pending' ? 'pending' : 'status',
            status: r.status
        })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

    // Identity Card Formatting
    const kycBadge = profile?.is_account_active ? 'Complet' : kycDocs ? 'En attente' : 'Incomplet'
    const kycColor = profile?.is_account_active ? 'bg-emerald-500/10 text-emerald-500' : kycDocs ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
    const kycProgress = profile?.is_account_active ? '100' : kycDocs ? '66' : '33'


    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container">
                {/* Hero Dashboard Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 animate-fade-in">
                            <span className="h-4 w-1 bg-blue-600 rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Accès Membre Privilégié</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                            Centre de <br />
                            <span className="premium-gradient-text">Contrôle.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-lg italic">
                            Bonjour <span className="text-white not-italic">{profile?.prenom}</span>. Voici l&apos;état global de votre patrimoine.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <Link href={activeSub ? "/client/loans/request" : "/client/subscriptions"} className="premium-button w-full sm:w-auto px-10">
                            <span>Nouveau Prêt</span>
                            <Add size={20} className="group-hover:rotate-90 transition-transform" />
                        </Link>
                        <Link href="/client/loans" className="glass-panel px-6 py-4 flex items-center justify-center gap-3 bg-slate-900/50 hover:bg-slate-800/50 transition-all border-slate-800">
                            <Wallet size={20} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Mes Prêts</span>
                        </Link>
                    </div>
                </div>

                {/* Status Monitoring Hub */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 whitespace-nowrap bg-slate-950 px-4">Suivi de Statut en Direct</h2>
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
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Abonnement</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black text-white italic truncate">{activeSub ? activeSub.abonnements.name : 'N/A'}</span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${activeSub ? 'bg-emerald-500/10 text-emerald-500' :
                                        latestSubscription && !latestSubscription.is_active ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {activeSub ? 'Actif' : latestSubscription && !latestSubscription.is_active ? 'Validation' : 'Aucun'}
                                    </span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                    {activeSub ? 'Plein accès prêt' : 'Services restreints'}
                                </p>
                            </div>
                        </div>

                        {/* Loan Status */}
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all flex flex-col justify-between min-h-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Crédit</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black text-white italic truncate">{latestLoan ? `${latestLoan.amount.toLocaleString()} F` : 'N/A'}</span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${latestLoan?.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                                        latestLoan?.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                            latestLoan?.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                                latestLoan?.status === 'paid' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {latestLoan?.status === 'active' ? 'Approuvé' :
                                            latestLoan?.status === 'pending' ? 'Étude' :
                                                latestLoan?.status === 'rejected' ? 'Refusé' :
                                                    latestLoan?.status === 'paid' ? 'Soldé' : 'Aucun'}
                                    </span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">
                                    {latestLoan ? `Initiée le ${new Date(latestLoan.created_at).toLocaleDateString('fr-FR')}` : 'Aucune demande'}
                                </p>
                            </div>
                        </div>

                        {/* Repayment Status */}
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all flex flex-col justify-between min-h-[140px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Paiement</p>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black text-white italic truncate">{latestRepayment ? `${latestRepayment.amount_declared.toLocaleString()} F` : 'N/A'}</span>
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${latestRepayment?.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                        latestRepayment?.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                            latestRepayment?.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {latestRepayment?.status === 'verified' ? 'Vérifié' :
                                            latestRepayment?.status === 'pending' ? 'Contrôle' :
                                                latestRepayment?.status === 'rejected' ? 'Invalidé' : 'Aucun'}
                                    </span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">
                                    {latestRepayment ? `Soumis le ${new Date(latestRepayment.created_at).toLocaleDateString('fr-FR')}` : 'Aucune preuve'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
                    <div className="xl:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Card Identity */}
                            <div className="virtual-card border-slate-800 shadow-2xl hover:scale-[1.02] transition-transform duration-500 group">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">Identité Globale</p>
                                        <p className="text-2xl font-black text-white italic uppercase tracking-tighter">Client Vérifié</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center text-blue-400 border border-white/10 group-hover:rotate-12 transition-transform">
                                        <CheckmarkOutline size={24} />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <p className="text-4xl font-black text-white tracking-[0.2em] italic">•••• {user.id.slice(-4)}</p>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Titulaire</p>
                                            <p className="text-sm font-bold text-white uppercase">{profile?.prenom} {profile?.nom}</p>
                                        </div>
                                        <div className="px-5 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest italic">
                                            Priorité Active
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Status */}
                            <div className="glass-panel p-10 flex flex-col justify-between bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="w-14 h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                        <Rocket size={32} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Allocation Actuelle</p>
                                        <p className={`text-xs font-black uppercase mt-1 ${activeSub ? 'text-emerald-400' : 'text-amber-500'}`}>
                                            {activeSub ? 'Optimisé' : 'Inactif'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                                        {activeSub ? activeSub.abonnements.name : 'Aucun Plan'}
                                    </h3>
                                    <Link href="/client/subscriptions" className="inline-flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:gap-3 transition-all">
                                        Améliorer le Plan <Flash size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Mini-Panel */}
                        <div className="glass-panel p-8 bg-slate-900/50 border-slate-800">
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
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-white">{notif.text}</p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-tight italic">
                                                    {new Date(notif.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {notif.type === 'pending' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>}
                                            {notif.type === 'status' && <div className={`w-2 h-2 rounded-full ${notif.status === 'rejected' ? 'bg-red-500' : 'bg-blue-600'}`}></div>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 text-slate-500 italic">
                                        <p className="text-xs font-bold">Aucune notification récente.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats Panel - Replaced Quick Links with Admin Stats Style */}
                    <div className="space-y-6">
                        <div className="glass-panel p-8 bg-slate-900/50 border-slate-800 group hover:border-blue-500/20 transition-all">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center shadow-inner">
                                    <Wallet size={20} />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En-cours total</p>
                            </div>
                            <p className="text-3xl font-black text-white tracking-tighter italic">{totalOutstanding.toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                        </div>

                        <div className="glass-panel p-8 bg-slate-900/50 border-slate-800 group hover:border-emerald-500/20 transition-all">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center shadow-inner">
                                    <CheckmarkOutline size={20} />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dernier Paiement</p>
                            </div>
                            <p className="text-3xl font-black text-white tracking-tighter italic">Aucun</p>
                        </div>

                        <div className="glass-panel p-10 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-600/10 transition-colors"></div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-6">Mes <br /> Informations</h4>
                            <form action={updateContactInfo} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro WhatsApp</label>
                                    <div className="flex gap-2">
                                        <input
                                            name="whatsapp"
                                            type="text"
                                            defaultValue={profile?.whatsapp || ''}
                                            placeholder="+229 00 00 00 00"
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                                        />
                                        <button type="submit" className="px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                                            OK
                                        </button>
                                    </div>
                                    {!profile?.whatsapp && (
                                        <p className="text-[8px] font-bold text-amber-500/80 italic mt-1 uppercase tracking-tight">Veuillez renseigner votre numéro</p>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="glass-panel p-10 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-colors"></div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-6">Support & <br /> Conciergerie</h4>
                            <div className="space-y-3">
                                <button className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:bg-slate-900 transition-all group/item">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/item:text-blue-400 transition-colors">Base de Savoir</span>
                                    <Help size={16} className="text-slate-700" />
                                </button>
                                <Link
                                    href="https://wa.me/14383906281"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:bg-slate-900 transition-all group/item"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/item:text-emerald-400 transition-colors">Chat Direct</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                                    </div>
                                    <Chat size={16} className="text-slate-700" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    {[
                        { t: 'Mes Abonnements', d: 'Plans et avantages', icon: <Flash />, href: '/client/subscriptions', c: 'blue' },
                        { t: 'Mes Prêts', d: 'Historique et demandes', icon: <Rocket />, href: '/client/loans', c: 'blue' },
                        { t: 'Remboursements', d: 'Preuves de paiement', icon: <Wallet />, href: '/client/loans/repayment', c: 'blue' }
                    ].map((action, i) => (
                        <Link key={i} href={action.href} className="glass-panel p-8 group hover:border-blue-500/40 relative overflow-hidden transition-all duration-500 bg-slate-900/50 border-slate-800">
                            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-150 transition-transform duration-700">
                                {action.icon}
                            </div>
                            <div className="space-y-12 relative z-10 text-left">
                                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                    {action.icon}
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white uppercase italic leading-none mb-2">{action.t}</h4>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed italic">{action.d}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Support Luxury Section */}
                <div className="mt-24 glass-panel p-10 lg:p-16 bg-slate-900 border-slate-800 text-white relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,1),transparent_70%)]"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="space-y-8 text-left">
                            <div className="inline-flex px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-[10px] font-black uppercase tracking-widest text-blue-400">
                                Conciergerie 24/7
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
                                Assistance <br /><span className="premium-gradient-text uppercase">Prioritaire.</span>
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
                                    Base de Connaissances
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
