import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { updateOffer, createOffer } from './actions'

export default async function OffersPage() {
    const supabase = await createClient()
    const { data: offers } = await supabase.from('abonnements').select('*').order('price')

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/super" className="text-slate-500 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 mb-4 group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Retour au Centre de Contrôle
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Gestion des Offres</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Configurez les abonnements et les limites de crédit</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {offers?.map((offer) => (
                        <div key={offer.id} className="glass-panel p-8 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all">
                            <form action={async (formData) => {
                                'use server'
                                await updateOffer(formData)
                            }} className="space-y-6">
                                <input type="hidden" name="id" value={offer.id} />

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black text-xl">
                                        {offer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{offer.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID: {offer.id}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom de l'offre</label>
                                        <input name="name" defaultValue={offer.name} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix (FCFA)</label>
                                        <input name="price" type="number" defaultValue={offer.price} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prêts / Mois</label>
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
                                    <button type="submit" className="glass-panel px-6 py-3 bg-blue-600/10 text-blue-400 border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                                        Enregistrer Modifications
                                    </button>
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
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Nouvelle Offre</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Créer un abonnement</p>
                            </div>
                        </div>

                        <form action={async (formData) => {
                            'use server'
                            await createOffer(formData)
                        }} className="space-y-6">
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
                                <button type="submit" className="glass-panel px-6 py-3 bg-emerald-600/10 text-emerald-400 border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                                    Créer l'offre
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
