import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { createOffer } from './actions'
import { SubmitButton } from '@/app/components/ui/SubmitButton'
import { Rocket } from '@carbon/icons-react'
import { OfferCard } from './OfferCard'

export default async function OffersPage() {
    const supabase = await createClient()
    const { data: offers } = await supabase.from('abonnements').select('*').order('price')
    const { data: quotas } = await supabase.from('global_quotas').select('*')
    const quotaMap = (quotas || []).reduce((acc: any, q: any) => ({ ...acc, [q.plan_id]: q.monthly_limit }), {})

    return (
        <div className="py-10 md:py-16 animate-fade-in text-slate-300">
            <div className="main-container space-y-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/super" className="text-slate-500 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 mb-4 group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Retour au Centre de Contrôle
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Configuration Système</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Gérez les offres commerciales et leurs plafonds d'abonnés mensuels</p>
                    </div>
                </div>

                {/* Subscription Plans Section */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                            <Rocket size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Catalogue des Offres & Quotas</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Définissez les prix et les limites d'abonnés pour chaque formule</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {offers?.map((offer) => (
                            <OfferCard
                                key={offer.id}
                                offer={offer}
                                quota={quotaMap[offer.id] || 0}
                            />
                        ))}

                        {/* New Offer Form */}
                        <div className="glass-panel p-8 bg-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40 transition-all border-dashed">
                            <div className="flex items-center gap-4 mb-6 text-left">
                                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center font-black text-xl">
                                    +
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Ajouter un Plan</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nouveaux paliers de financement</p>
                                </div>
                            </div>

                            <form action={createOffer} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom de l'offre</label>
                                        <input name="name" placeholder="Ex: Diamond" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix (FCFA)</label>
                                        <input name="price" type="number" placeholder="5000" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prêts / Mois</label>
                                        <input name="max_loans_per_month" type="number" placeholder="4" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plafond Prêt (FCFA)</label>
                                        <input name="max_loan_amount" type="number" placeholder="50000" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Délai (Jours)</label>
                                        <input name="repayment_delay_days" type="number" placeholder="7" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <SubmitButton
                                        loadingText="Création..."
                                        className="glass-panel px-6 py-3 bg-emerald-600/10 text-emerald-400 border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                        variant="glass"
                                    >
                                        Créer l'offre
                                    </SubmitButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
