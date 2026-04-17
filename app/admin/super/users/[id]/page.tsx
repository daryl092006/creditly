import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ChevronLeft, User, Identification, Document, Money, Time, Flash, Star } from '@carbon/icons-react'
import { notFound } from 'next/navigation'
import { getSignedProofUrl } from '@/app/admin/actions'
import EmailClientModal from './EmailClientModal'

interface Abonnement {
    name: string;
    price: number;
    max_loan_amount: number;
}

interface UserSubscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    plan?: Abonnement;
}

interface Loan {
    id: string;
    user_id: string;
    amount: number;
    amount_paid: number;
    status: string;
    due_date: string | null;
    created_at: string;
    service_fee?: number;
    snapshot?: Abonnement;
}

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch User Profile
    const { data: user } = await supabase.from('users').select('*').eq('id', id).single()
    if (!user) notFound()

    // Fetch KYC
    const { data: kyc } = await supabase.from('kyc_submissions').select('*').eq('user_id', id).single()

    // Fetch Loans
    const { data: loansResult } = await supabase.from('prets').select('*, snapshot:subscription_snapshot_id(*)').eq('user_id', id).order('created_at', { ascending: false })
    const loans = (loansResult || []) as unknown as Loan[]

    // Fetch Subscriptions
    const { data: subsResult } = await supabase.from('user_subscriptions').select('*, plan:abonnements(*)').eq('user_id', id).order('created_at', { ascending: false })
    const subs = (subsResult || []) as unknown as UserSubscription[]

    // Get Signed URLs for KYC docs if they exist
    const idCardUrl = kyc?.id_card_url ? (await getSignedProofUrl(kyc.id_card_url, 'kyc-documents')).url : null
    const selfieUrl = kyc?.selfie_url ? (await getSignedProofUrl(kyc.selfie_url, 'kyc-documents')).url : null
    const residenceUrl = kyc?.proof_of_residence_url ? (await getSignedProofUrl(kyc.proof_of_residence_url, 'kyc-documents')).url : null

    // Calculate Debt
    const activeLoans = loans.filter(l => ['active', 'overdue'].includes(l.status))
    const totalDebt = activeLoans.reduce((acc, l) => {
        const fee = Number(l.service_fee) || (new Date(l.created_at) >= new Date('2026-03-09') ? 500 : 0);
        const amount = Number(l.amount) || 0;
        const paid = Number(l.amount_paid) || 0;
        return acc + (amount + fee - paid);
    }, 0);

    const activeSub = subs.find(s => s.status === 'active');

    // 6. Automated Analysis & Scoring
    const { calculateUserScore } = await import('@/utils/scoring-utils')
    const analysis = calculateUserScore(loans, user.created_at, !!activeSub)

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                {/* Visual Trust Header */}
                <div className="glass-panel p-10 bg-slate-900 border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-8">
                             <div className="relative">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * analysis.score) / 100} className="transition-all duration-1000 ease-out" style={{ color: analysis.color }} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{analysis.score}</span>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Score</span>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <span className="text-[10px] font-black px-3 py-1 rounded-full border border-white/10 italic tracking-widest uppercase" style={{ color: analysis.color, backgroundColor: `${analysis.color}10`, borderColor: `${analysis.color}20` }}>
                                    {analysis.label}
                                </span>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter">{user.prenom} {user.nom}</h2>
                                <p className="text-sm text-slate-500 font-medium italic max-w-md">{analysis.description}</p>
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full md:w-auto">
                            <div className="text-center md:text-left">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Remboursements</p>
                                <p className="text-lg font-black text-white italic">{analysis.metrics.repaymentRate.toFixed(0)}%</p>
                            </div>
                            <div className="text-center md:text-left">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Volume Total</p>
                                <p className="text-lg font-black text-white italic">{analysis.metrics.totalVolume.toLocaleString()} F</p>
                            </div>
                            <div className="text-center md:text-left">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Prêts Clôturés</p>
                                <p className="text-lg font-black text-emerald-500 italic">{loans.filter(l => l.status === 'paid').length}</p>
                            </div>
                            <div className="text-center md:text-left">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">SLA Prolongations</p>
                                <p className="text-lg font-black text-amber-500 italic">{analysis.metrics.extensionCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar: Profile & KYC Docs */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="glass-panel p-8 bg-slate-900/50 border-white/5 space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6 italic">Balance Financière</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                            <Money size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Dette Totale</p>
                                            <p className="text-xl font-black text-red-500 italic tracking-tighter">
                                                {totalDebt.toLocaleString('fr-FR')} <span className="text-[8px] not-italic text-slate-700">F</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 italic">Coordonnées</h3>
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
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 italic">Détails Personnels</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500">
                                            <Time size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Date de naissance</p>
                                            <p className="text-sm font-bold text-white italic">
                                                {user.birth_date ? new Date(user.birth_date).toLocaleDateString('fr-FR') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Star size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Profession</p>
                                            <p className="text-sm font-bold text-white italic">{user.profession || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-6 italic">Personne de référence</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Nom Complet</p>
                                            <p className="text-sm font-bold text-white italic">
                                                {user.guarantor_prenom || '-'} {user.guarantor_nom || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                            <Flash size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">WhatsApp Référence</p>
                                            <p className="text-sm font-bold text-white italic">{user.guarantor_whatsapp || 'N/A'}</p>
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
                                            { label: 'Pièce d\'Identité', url: idCardUrl },
                                            { label: 'Selfie de Vérification', url: selfieUrl },
                                            { label: 'Preuve de Résidence', url: residenceUrl }
                                        ].map((doc, i) => (
                                            <a
                                                key={i}
                                                href={doc.url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`block glass-panel p-4 bg-slate-950 border-white/5 transition-all group ${!doc.url ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500/30'}`}
                                            >
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">{doc.label}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase italic">{doc.url ? 'Visualiser' : 'Non disponible'}</span>
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
                            {activeSub ? (
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
                                                    <p className="text-[10px] font-black text-white uppercase italic">{Number(loan.amount).toLocaleString('fr-FR')} FCFA</p>
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{loan.snapshot?.name || 'Prêt'}</p>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Échéance</p>
                                                <p className="text-[10px] font-bold text-slate-400 italic">{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Payé</p>
                                                <p className="text-[10px] font-black text-emerald-500 italic">{Number(loan.amount_paid || 0).toLocaleString('fr-FR')} F</p>
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
