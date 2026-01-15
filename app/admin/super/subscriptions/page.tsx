import { createClient } from '@/utils/supabase/server'
import { activateSubscription } from '@/app/admin/actions'
import Link from 'next/link'

export default async function AdminSubscriptionsPage() {
    const supabase = await createClient()
    const { data: pendingSubs } = await supabase
        .from('user_subscriptions')
        .select('*, plan:abonnements(*), user:users(*)')
        .eq('is_active', false)
        .order('created_at', { ascending: false })

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/super" className="text-slate-500 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 mb-4 group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Retour au Control Center
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Validation Abonnements</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Vérifiez les preuves de paiement et activez les comptes</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {pendingSubs?.length === 0 ? (
                        <div className="glass-panel p-20 text-center bg-slate-900/50 border-slate-800">
                            <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Aucune demande en attente</h3>
                            <p className="text-slate-500 font-bold italic mt-2">Tous les paiements ont été traités.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {pendingSubs?.map((sub) => (
                                <div key={sub.id} className="glass-panel p-6 flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                <div>
                                                    <h4 className="text-xl font-black text-white italic tracking-tighter">{sub.user.prenom} {sub.user.nom}</h4>
                                                    <p className="text-sm font-bold text-slate-500 italic">{sub.user.email}</p>
                                                </div>
                                                {sub.user.whatsapp && (
                                                    <a
                                                        href={`https://wa.me/${sub.user.whatsapp.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95"
                                                    >
                                                        <svg className="w-4 h-4 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-4">
                                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 italic">
                                                    Plan {sub.plan.name}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-700 uppercase italic tracking-wider">
                                                    Demandé le {new Date(sub.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Montant attendu</p>
                                            <p className="text-2xl font-black text-blue-400 tracking-tighter italic">{sub.plan.price.toLocaleString()} <span className="text-[10px] not-italic text-slate-700">FCFA</span></p>
                                        </div>
                                        <form action={async () => {
                                            'use server'
                                            await activateSubscription(sub.id)
                                        }}>
                                            <button className="premium-button py-4 px-8 active:scale-95 shadow-2xl">
                                                Confirmer Paiement
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
