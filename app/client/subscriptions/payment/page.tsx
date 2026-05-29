import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, Locked } from '@carbon/icons-react'
import SubscriptionPaymentForm from './PaymentForm'

export default async function PaymentPage({
    searchParams
}: {
    searchParams: Promise<{ planId?: string }>
}) {
    const { planId } = await searchParams
    if (!planId) redirect('/client/subscriptions')

    const supabase = await createClient()
    const { data: plan } = await supabase
        .from('abonnements')
        .select('*')
        .eq('id', planId)
        .single()

    if (!plan) redirect('/client/subscriptions')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/client/dashboard')

    // ─── VÉRIF ÉLIGIBILITÉ (protection anti manipulation URL) ───
    const { getUserLoanEligibility } = await import('@/utils/eligibility')
    const eligibility = await getUserLoanEligibility(user.id)
    const planEligibility = eligibility.plans.find(p => p.planId === planId)

    if (!planEligibility?.available) {
        return (
            <div className="min-h-screen flex items-center justify-center py-24">
                <div className="main-container max-w-2xl text-center space-y-8">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
                        <Locked size={40} />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Plan non disponible</h1>
                        <p className="text-slate-400 font-bold italic text-lg leading-relaxed">
                            Ce plan n&apos;est pas disponible pour votre profil actuel.<br />
                            Votre paiement n&apos;a pas été initié.
                        </p>
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider mb-1">Votre limite actuelle</p>
                                    <p className="text-2xl font-black text-white italic">{eligibility.realMaxLoanAmount.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span></p>
                                </div>
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-wider mb-1">Limite requise</p>
                                    <p className="text-2xl font-black text-red-400 italic">{planEligibility?.planMaxAmount?.toLocaleString('fr-FR') ?? '—'} <span className="text-xs">FCFA</span></p>
                                </div>
                            </div>
                            {eligibility.blockingReasons.length > 0 && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mb-2">Cause(s) du blocage</p>
                                    <ul className="space-y-1">
                                        {eligibility.blockingReasons.map((r, i) => (
                                            <li key={i} className="text-[10px] font-bold text-slate-300 italic">• {r}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 pt-4">
                            <Link href="/client/kyc" className="px-6 py-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                                Finaliser mon KYC
                            </Link>
                            <Link href="/client/support?subject=réévaluation" className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                                Demander une réévaluation
                            </Link>
                            <Link href="/client/subscriptions" className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                                Retour aux plans
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const { data: activeLoans } = await supabase
        .from('prets')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['active', 'overdue'])

    if (activeLoans && activeLoans.length > 0) {
        redirect('/client/subscriptions')
    }

    // Fetch Payment Number from Settings
    const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'subscription_phone')
        .single()

    const paymentPhone = settings?.value || '+229 01 69 46 30 04'

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container max-w-4xl">
                <div className="mb-16 space-y-6">
                    <Link href="/client/subscriptions" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Retour aux Plans
                    </Link>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9]">
                        Finaliser <br /><span className="premium-gradient-text uppercase">l&apos;Abonnement.</span>
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Instructions Side */}
                    <div className="space-y-8">
                        <div className="glass-panel p-8 bg-blue-600/5 border-blue-500/20">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                <Wallet size={20} className="text-blue-500" />
                                Instructions de Paiement
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Numéro de dépôt (Momo)</p>
                                    <p className="text-3xl font-black text-white tracking-widest italic selection:bg-blue-600">{paymentPhone}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        ⚠️ Attention
                                    </p>
                                    <p className="text-[10px] font-bold text-amber-200/70 italic leading-relaxed">
                                        Ce numéro est strictement réservé aux <span className="text-amber-500">abonnements</span>. Pour les remboursements, veuillez utiliser le numéro indiqué dans la section dédiée.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-8 border-slate-800 bg-slate-900/30">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Récapitulatif</h3>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-black text-white uppercase italic">{plan.name}</p>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Validité : 1 mois</p>
                                </div>
                                <p className="text-3xl font-black text-blue-500 italic tracking-tighter">{plan.price.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600 not-italic uppercase">FCFA</span></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-[9px] font-black text-slate-600 uppercase tracking-widest italic px-4">
                            <Locked size={14} />
                            Paiement sécurisé & vérification manuelle sous 4h
                        </div>
                    </div>

                    {/* Form Side */}
                    <div>
                        <SubscriptionPaymentForm planId={planId} planPrice={plan.price} />
                    </div>
                </div>
            </div>
        </div>
    )
}
