import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { updateOffer, createOffer, updateQuotas } from './actions'
import { SubmitButton } from '@/app/components/ui/SubmitButton'
import { SettingsAdjust, WarningAlt, Rocket, CheckmarkFilled } from '@carbon/icons-react'

export default async function OffersPage() {
    const supabase = await createClient()
    const { data: offers } = await supabase.from('abonnements').select('*').order('price')
    const { data: quotas } = await supabase.from('global_quotas').select('*').order('amount')

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/super" className="text-slate-500 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 mb-4 group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Retour au Centre de Contrôle
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Configuration Système</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Gérez les offres commerciales et les quotas de sécurité globaux</p>
                    </div>
                </div>

                {/* Global Quotas Management Section */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                            <SettingsAdjust size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Quotas de Sécurité Globaux</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Nombre maximum d'abonnements autorisés par mois et par palier</p>
                        </div>
                    </div>

                    <div className="glass-panel p-8 bg-slate-900/50 border-slate-800">
                        <form action={updateQuotas} className="space-y-8">
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6">
                                {quotas?.map((q) => (
                                    <div key={q.amount} className="space-y-3">
                                        <div className="flex flex-col">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Palier</label>
                                            <span className="text-sm font-black text-white italic">{q.amount.toLocaleString()} F</span>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block italic">Limite / Mois</label>
                                            <input
                                                name={`quota_${q.amount}`}
                                                type="number"
                                                defaultValue={q.monthly_limit}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-sm font-bold text-emerald-500 focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                                <div className="flex items-center gap-2 text-amber-500/60">
                                    <WarningAlt size={16} />
                                    <p className="text-[9px] font-bold uppercase italic tracking-widest">Une limite à 0 désactive les nouvelles souscriptions pour ce palier.</p>
                                </div>
                                <SubmitButton
                                    loadingText="Mise à jour..."
                                    className="glass-panel px-8 py-3 bg-emerald-600/10 text-emerald-400 border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all text-xs font-black uppercase tracking-[0.2em]"
                                >
                                    Appliquer les Quotas
                                </SubmitButton>
                            </div>
                        </form>
                    </div>
                </section>

                <div className="h-px bg-slate-800/50"></div>

                {/* Subscription Plans Section */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                            <Rocket size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Catalogue des Offres</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Détails techniques et tarification des plans d'abonnement</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {offers?.map((offer) => (
                            <div key={offer.id} className="glass-panel p-8 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[60px] -mr-16 -mt-16 transition-all group-hover:bg-blue-600/10"></div>
                                <form action={updateOffer} className="space-y-6 relative z-10">
                                    <input type="hidden" name="id" value={offer.id} />

                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black text-xl border border-blue-500/20 shadow-inner">
                                                {offer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">{offer.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-600 font-mono">ID: {offer.id.substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom du Plan</label>
                                            <input name="name" defaultValue={offer.name} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix (FCFA / mois)</label>
                                            <input name="price" type="number" defaultValue={offer.price} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prêts Simultanés</label>
                                            <input name="max_loans_per_month" type="number" defaultValue={offer.max_loans_per_month} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plafond Prêt (FCFA)</label>
                                            <input name="max_loan_amount" type="number" defaultValue={offer.max_loan_amount} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Délai (Jours)</label>
                                            <input name="repayment_delay_days" type="number" defaultValue={offer.repayment_delay_days} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <SubmitButton
                                            loadingText="Mise à jour..."
                                            className="glass-panel px-6 py-3 bg-blue-600/10 text-blue-400 border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                            variant="glass"
                                        >
                                            Enregistrer
                                        </SubmitButton>
                                    </div>
                                </form>
                            </div>
                        ))}

                        {/* New Offer Form */}
                        <div className="glass-panel p-8 bg-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40 transition-all border-dashed">
                            <div className="flex items-center gap-4 mb-6">
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
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom de l'offre</label>
                                        <input name="name" placeholder="Ex: Diamond" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix (FCFA)</label>
                                        <input name="price" type="number" placeholder="5000" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prêts / Mois</label>
                                        <input name="max_loans_per_month" type="number" placeholder="4" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plafond Prêt (FCFA)</label>
                                        <input name="max_loan_amount" type="number" placeholder="50000" required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
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
