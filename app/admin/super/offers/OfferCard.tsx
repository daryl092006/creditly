'use client'

import { deleteOffer } from './actions'
import { SubmitButton } from '@/app/components/ui/SubmitButton'
import { Rocket } from '@carbon/icons-react'
import { updateOfferAndQuotas } from './actions'

import { checkGlobalQuotasStatus } from '@/utils/quotas-server'
import Link from 'next/link'

interface OfferCardProps {
    offer: any
    quota: {
        count: number
        limit: number
        reached: boolean
    }
}

export function OfferCard({ offer, quota }: OfferCardProps) {
    const remaining = Math.max(0, quota.limit - quota.count);
    const percent = quota.limit > 0 ? (quota.count / quota.limit) * 100 : 0;

    return (
        <div key={offer.id} className="glass-panel p-8 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all relative overflow-hidden group text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[60px] -mr-16 -mt-16 transition-all group-hover:bg-blue-600/10"></div>
            <form action={updateOfferAndQuotas} className="space-y-6 relative z-10">
                <input type="hidden" name="id" value={offer.id} />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black text-xl border border-blue-500/20 shadow-inner">
                            {(offer.name || 'P').charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">{offer.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${quota.reached ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                    {quota.count} / {quota.limit} VENDUS
                                </span>
                                <Link href={`/admin/super/subscriptions?plan=${offer.name}`} className="text-[8px] font-bold text-blue-400 hover:text-white underline underline-offset-2 uppercase tracking-tighter">
                                    Voir la liste
                                </Link>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 italic mt-1">
                                {remaining > 0 ? `Encore ${remaining} places disponibles` : 'FORFAIT COMPLET'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Limite Mensuelle</label>
                        <input
                            name={`quota_${offer.id}`}
                            type="number"
                            defaultValue={quota.limit}
                            className={`w-20 bg-slate-950 border rounded-lg p-2 text-center text-xs font-black transition-colors ${quota.reached ? 'border-red-500 text-red-500' : 'border-slate-800 text-white focus:border-blue-500'}`}
                        />
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
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rembourset (Jours)</label>
                        <input name="repayment_delay_days" type="number" defaultValue={offer.repayment_delay_days} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Durée Forfait (Jours)</label>
                        <input name="duration_days" type="number" defaultValue={offer.duration_days || 30} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Frais Dossier (FCFA)</label>
                        <input name="service_fee" type="number" defaultValue={offer.service_fee ?? 500} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white focus:border-blue-500 transition-colors" />
                    </div>
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-slate-800/50">
                    <div className="flex gap-4 items-center">
                        <SubmitButton
                            loadingText="Mise à jour..."
                            className="glass-panel px-6 py-3 bg-blue-600/10 text-blue-400 border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                            variant="glass"
                        >
                            Enregistrer
                        </SubmitButton>
                    </div>
                </div>
            </form>

            <div className="mt-4 flex justify-start">
                <form action={deleteOffer} onSubmit={(e) => !confirm('Êtes-vous sûr de vouloir supprimer cette offre ? Cela peut échouer si des clients y sont déjà abonnés.') && e.preventDefault()}>
                    <input type="hidden" name="id" value={offer.id} />
                    <button
                        type="submit"
                        className="text-[9px] font-black text-rose-500/50 hover:text-rose-500 uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-rose-500/5 transition-all italic underline decoration-rose-500/20 underline-offset-4"
                    >
                        Supprimer l'offre
                    </button>
                </form>
            </div>
        </div>
    )
}
