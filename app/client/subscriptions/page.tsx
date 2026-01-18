import { createClient } from '@/utils/supabase/server'
import SubscribeButton from './SubscribeButton'
import Link from 'next/link'
import { ArrowLeft, CheckmarkOutline, Star, Rocket, Flash, Misuse } from '@carbon/icons-react'

export default async function SubscriptionsPage() {
    const supabase = await createClient()
    const { data: plans } = await supabase.from('abonnements').select('*').order('price')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: allSubs } = user ? await supabase.from('user_subscriptions').select('*, plan:abonnements(*)').eq('user_id', user.id) : { data: [] }

    const now = new Date().toISOString()
    const activeSub = allSubs?.find(s => s.status === 'active' && s.end_date && s.end_date > now)
    const expiredSub = !activeSub ? allSubs?.find(s => s.status === 'expired' || (s.status === 'active' && s.end_date && s.end_date <= now)) : null
    const pendingSub = allSubs?.find(s => s.status === 'pending')
    const rejectedSub = allSubs?.find(s => s.status === 'rejected')

    const getPlanIcon = (name: string) => {
        if (name === 'Platinum') return <Rocket size={32} />
        if (name === 'Haut de gamme') return <Flash size={32} />
        return <Star size={32} />
    }

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-20">
                    <div className="space-y-6">
                        <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Centre d&apos;Opérations
                        </Link>
                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                            Elite <br /><span className="premium-gradient-text uppercase">Privilèges.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-lg italic max-w-xl leading-relaxed">
                            Accédez à des plafonds de financement supérieurs et à une priorité de traitement exclusive.
                        </p>
                        {!activeSub && (
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-fade-in shadow-lg shadow-amber-500/5">
                                <Star size={20} className="animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest">Abonnement requis pour toute demande de prêt</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 items-end">
                        {pendingSub && (
                            <div className="glass-panel p-6 bg-blue-500/5 border-blue-500/20 flex items-center gap-6 animate-pulse">
                                <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                    <Flash size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Système de Validation</p>
                                    <p className="text-lg font-black text-white uppercase italic">Plan {pendingSub.plan?.name || '...'}</p>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">
                                        Paiement déclaré : {Number(pendingSub.amount_paid || 0).toLocaleString()} FCFA
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase italic">Vérification de la preuve en cours...</p>
                                </div>
                            </div>
                        )}

                        {rejectedSub && (
                            <div className="glass-panel p-6 bg-red-600/10 border-red-500/30 flex items-center gap-6 animate-shake shadow-xl shadow-red-500/10">
                                <div className="w-14 h-14 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl flex items-center justify-center">
                                    <Misuse size={32} className="animate-pulse" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Paiement Refusé</p>
                                    <p className="text-xl font-black text-white uppercase italic tracking-tighter">Plan {rejectedSub.plan?.name || '...'}</p>
                                    <p className="text-[10px] font-bold text-red-400 uppercase italic">
                                        Raison : {rejectedSub.rejection_reason || 'Preuve de paiement non conforme'}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-500 uppercase italic mt-1 font-mono tracking-widest leading-none">Veuillez choisir un plan pour resoumettre</p>
                                </div>
                            </div>
                        )}

                        {activeSub && (
                            <div className="glass-panel p-6 bg-emerald-500/5 border-emerald-500/20 flex items-center gap-6 animate-fade-in shadow-xl shadow-emerald-500/5">
                                <div className="w-14 h-14 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                                    <CheckmarkOutline size={32} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Statut : Actif</p>
                                    <p className="text-xl font-black text-white uppercase italic tracking-tighter tabular-nums">Plan {activeSub.plan?.name || '...'}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase italic">Expire le {activeSub.end_date ? new Date(activeSub.end_date).toLocaleDateString('fr-FR') : '...'}</p>
                                </div>
                            </div>
                        )}

                        {expiredSub && (
                            <div className="glass-panel p-6 bg-red-500/5 border-red-500/20 flex items-center gap-6 animate-fade-in shadow-xl shadow-red-500/5">
                                <div className="w-14 h-14 bg-red-600/20 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center">
                                    <Star size={32} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">Statut : Expiré</p>
                                    <p className="text-xl font-black text-white uppercase italic tracking-tighter tabular-nums">Plan {expiredSub.plan?.name || '...'}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase italic">Veuillez renouveler votre accès</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-10">
                    {plans?.map((plan) => (
                        <div key={plan.id} className={`glass-panel p-10 flex flex-col items-center text-center relative overflow-hidden group transition-all duration-700 hover:-translate-y-4 bg-slate-900/50 border-slate-800 w-full max-w-[320px] ${plan.name === 'Platinum' ? 'border-blue-500/30 bg-blue-600/5' : ''}`}>
                            {plan.name === 'Platinum' && (
                                <div className="absolute -right-12 top-10 rotate-45 bg-blue-600 text-white text-[8px] font-black px-12 py-1.5 uppercase tracking-[0.4em] z-20 shadow-lg shadow-blue-600/20">PREMIUM</div>
                            )}

                            <div className="mb-12 space-y-6 relative z-10 flex flex-col items-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${plan.id === activeSub?.plan_id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-white border border-white/5 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:scale-110 shadow-xl'}`}>
                                    {getPlanIcon(plan.name)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1 leading-none">{plan.name}</h3>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-3xl font-black premium-gradient-text italic tracking-tighter">{plan.price.toLocaleString()}</span>
                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">FCFA / mois</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 mb-16 flex-grow relative z-10 w-full">
                                {[
                                    { text: `${plan.max_loans_per_month} prêts mensuels`, icon: <Star size={16} /> },
                                    { text: `Limite de ${plan.max_loan_amount.toLocaleString()} FCFA`, icon: <Rocket size={16} /> },
                                    { text: `${plan.repayment_delay_days} jours de délai`, icon: <Flash size={16} /> }
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center justify-center gap-4 group/feat">
                                        <div className="text-slate-600 group-hover/feat:text-blue-500 transition-colors">{feature.icon}</div>
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight group-hover/feat:text-slate-200 transition-colors italic">{feature.text}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="relative z-10 w-full">
                                <SubscribeButton planId={plan.id} disabled={!!activeSub || !!pendingSub} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
