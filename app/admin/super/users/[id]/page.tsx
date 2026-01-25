import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ChevronLeft, User, Identification, Document, Money, Time, CheckmarkFilled, Misuse, Flash, Star } from '@carbon/icons-react'
import { notFound } from 'next/navigation'

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch User Profile
    const { data: user } = await supabase.from('users').select('*').eq('id', id).single()
    if (!user) notFound()

    // Fetch KYC
    const { data: kyc } = await supabase.from('kyc_submissions').select('*').eq('user_id', id).single()

    // Fetch Loans
    const { data: loans } = await supabase.from('prets').select('*, snapshot:subscription_snapshot_id(*)').eq('user_id', id).order('created_at', { ascending: false })

    // Fetch Subscriptions
    const { data: subs } = await supabase.from('user_subscriptions').select('*, plan:abonnements(*)').eq('user_id', id).order('created_at', { ascending: false })

    const getFullUrl = (path: string, bucket: string = 'repayment-proofs') => {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`
    }

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <Link href="/admin/super/users" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/10 transition-all mb-8 group">
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Retour à la liste
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">{user.prenom} {user.nom}</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed max-w-xl">
                            Dossier complet et historique des activités de l'utilisateur.
                        </p>
                    </div>
                    <div className="px-6 py-3 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${user.is_account_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                        <span className="text-white font-black text-xs uppercase tracking-widest italic">{user.is_account_active ? 'Compte Actif' : 'En attente'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar: Profile & KYC Docs */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="glass-panel p-8 bg-slate-900/50 border-white/5 space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 italic">Informations de Contact</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500">
                                            <Document size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Email</p>
                                            <p className="text-sm font-bold text-white italic">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                            <Flash size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">WhatsApp</p>
                                            <p className="text-sm font-bold text-white italic">{user.whatsapp || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 italic">Documents KYC</h3>
                                {kyc ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { label: 'Pièce d\'Identité', url: kyc.id_card_url },
                                            { label: 'Selfie de Vérification', url: kyc.selfie_url },
                                            { label: 'Preuve de Résidence', url: kyc.proof_of_residence_url }
                                        ].map((doc, i) => (
                                            <a
                                                key={i}
                                                href={getFullUrl(doc.url, 'repayment-proofs')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block glass-panel p-4 bg-slate-950 border-white/5 hover:border-blue-500/30 transition-all group"
                                            >
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">{doc.label}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase italic">Visualiser</span>
                                                    <Identification size={16} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold text-slate-600 italic">Aucun document soumis.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Loans & Subscriptions */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* active Sub info maybe? */}
                        <div className="glass-panel p-8 bg-slate-900/50 border-white/5">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 italic">Abonnement Actuel</h3>
                            {subs?.find(s => s.status === 'active') ? (
                                (() => {
                                    const activeSub = subs.find(s => s.status === 'active')!;
                                    return (
                                        <div className="flex items-center gap-8">
                                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                <Star size={32} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic leading-none mb-2">Statut : Actif</p>
                                                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter tabular-nums leading-none">
                                                    Plan {activeSub.plan?.name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase italic mt-1">
                                                    Expire le {new Date(activeSub.end_date!).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })()
                            ) : (
                                <p className="text-xs font-bold text-slate-600 italic">Aucun abonnement actif.</p>
                            )}
                        </div>

                        <div className="glass-panel p-8 bg-slate-900/50 border-white/5">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 italic">Historique des Prêts</h3>
                            {loans && loans.length > 0 ? (
                                <div className="space-y-4">
                                    {loans.map((loan) => (
                                        <div key={loan.id} className="glass-panel p-6 bg-slate-950 border-white/5 flex flex-wrap items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                                    <Money size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white uppercase italic">{Number(loan.amount).toLocaleString()} FCFA</p>
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{loan.snapshot?.name || 'Prêt'}</p>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Échéance</p>
                                                <p className="text-[10px] font-bold text-slate-400 italic">{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Payé</p>
                                                <p className="text-[10px] font-black text-emerald-500 italic">{Number(loan.amount_paid || 0).toLocaleString()} F</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${loan.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    loan.status === 'active' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        loan.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                {loan.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs font-bold text-slate-600 italic">Aucun historique de prêt.</p>
                            )}
                        </div>

                        <div className="glass-panel p-8 bg-slate-900/50 border-white/5">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 italic">Historique des Abonnements</h3>
                            <div className="space-y-4">
                                {subs?.map((sub) => (
                                    <div key={sub.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                                                <Flash size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white italic">Plan {sub.plan?.name}</p>
                                                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{new Date(sub.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                sub.status === 'expired' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }`}>
                                            {sub.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
