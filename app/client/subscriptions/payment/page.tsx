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
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Numéro de dépôt (Momo/Flooz)</p>
                                    <p className="text-3xl font-black text-white tracking-widest italic selection:bg-blue-600">+229 01 69 46 30 04</p>
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
                                <p className="text-3xl font-black text-blue-500 italic tracking-tighter">{plan.price.toLocaleString()} <span className="text-[10px] text-slate-600 not-italic uppercase">FCFA</span></p>
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
