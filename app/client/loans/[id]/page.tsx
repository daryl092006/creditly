import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Money, Information, CheckmarkFilled, CloseFilled, Time, Document as DocumentIcon } from '@carbon/icons-react'
import LoanContractActions from './contract-actions'

export default async function LoanDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient()
    // Lazy update of system statuses
    await supabase.rpc('auto_update_system_statuses')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/auth/login')

    const { data: loan, error } = await supabase
        .from('prets')
        .select(`
            *,
            plan:subscription_snapshot_id(name),
            user:users!prets_user_id_fkey(email, nom, prenom)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    const profile = loan?.user

    const { data: pendingRepayment } = await supabase
        .from('remboursements')
        .select('id')
        .eq('loan_id', id)
        .eq('status', 'pending')
        .limit(1)
        .single()

    const hasPendingPayment = !!pendingRepayment

    if (error || !loan) {
        return (
            <div className="py-24 text-center space-y-6">
                <p className="text-slate-400 font-bold italic text-sm">Prêt introuvable ou accès refusé.</p>
                <Link href="/client/loans" className="premium-button inline-flex">Retour à la liste</Link>
            </div>
        )
    }

    const getStatusInfo = (status: string) => {
        if (hasPendingPayment && (status === 'active' || status === 'overdue')) {
            return { label: 'Vérif en cours', color: 'text-amber-400', icon: <Time size={24} className="text-amber-500" />, desc: 'On a reçu votre reçu. On vérifie tout ça pour sortir votre dossier des retards.' }
        }

        switch (status) {
            case 'active': return { label: 'En cours', color: 'text-emerald-400', icon: <CheckmarkFilled size={24} className="text-emerald-500" />, desc: 'Votre prêt est actif. Tout est bon.' }
            case 'pending': return { label: 'En étude', color: 'text-amber-400', icon: <Time size={24} className="text-amber-500" />, desc: 'On regarde votre dossier pour vous répondre vite.' }
            case 'paid': return { label: 'Fini', color: 'text-blue-400', icon: <CheckmarkFilled size={24} className="text-blue-500" />, desc: 'Bravo ! Vous avez fini de payer ce prêt.' }
            case 'rejected': return { label: 'Refusé', color: 'text-red-400', icon: <CloseFilled size={24} className="text-red-500" />, desc: 'Désolé, votre demande n&apos;est pas passée cette fois.' }
            case 'overdue': return { label: 'En retard', color: 'text-rose-500', icon: <Information size={24} className="text-rose-500" />, desc: 'La date est passée. Payez vite pour éviter les problèmes.' }
            default: return { label: status, color: 'text-slate-400', icon: <Information size={24} />, desc: '' }
        }
    }

    const statusInfo = getStatusInfo(loan.status)

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container max-w-4xl space-y-12">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-4">
                        <Link href="/client/loans" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Retour à la liste
                        </Link>
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                            Détails de <span className="premium-gradient-text">Mon Prêt.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-lg italic">
                            Numéro du dossier : <span className="text-white not-italic">{loan.id.split('-')[0].toUpperCase()}</span>
                        </p>
                    </div>
                    {(loan.status === 'active' || loan.status === 'overdue') && (
                        <Link href={`/client/loans/repayment?loanId=${loan.id}`} className="premium-button px-10">
                            Payer maintenant
                        </Link>
                    )}
                </div>

                {/* Status Hero Card */}
                <div className="glass-panel p-10 relative overflow-hidden bg-slate-900/50 border-slate-800">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="flex flex-col md:flex-row gap-10 items-start md:items-center relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-white/5 flex items-center justify-center shadow-inner">
                            {statusInfo.icon}
                        </div>
                        <div className="space-y-2 flex-1 text-left">
                            <div className="flex items-center gap-4">
                                <h2 className={`text-4xl font-black uppercase italic tracking-tighter ${statusInfo.color}`}>{statusInfo.label}</h2>
                                <span className="px-4 py-1 rounded-full bg-slate-950 border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest italic">{loan.plan?.name || 'Standard Allocation'}</span>
                            </div>
                            <p className="text-slate-500 font-bold italic leading-relaxed max-w-xl">{statusInfo.desc}</p>
                            {loan.rejection_reason && (
                                <p className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest italic">
                                    <span className="block mb-1 opacity-50">Admin Note :</span>
                                    {loan.rejection_reason}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Montant prêté</p>
                            <p className="text-5xl font-black text-white tracking-tighter italic">{(loan.amount || 0).toLocaleString()} <span className="text-xs not-italic text-slate-700">FCFA</span></p>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Dates Timeline */}
                    <div className="glass-panel p-10 space-y-8 bg-slate-900/50 border-slate-800 text-left">
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                            <Calendar size={14} /> Dates importantes
                        </h3>
                        <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center z-10">
                                    <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Demande faite le</p>
                                    <p className="text-lg font-black text-white tracking-tight">{new Date(loan.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            {loan.admin_decision_date && (
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center z-10">
                                        <div className={`w-2 h-2 rounded-full ${loan.status === 'rejected' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Réponse donnée le</p>
                                        <p className="text-lg font-black text-white tracking-tight">{new Date(loan.admin_decision_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            )}

                            {loan.due_date && (
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center z-10">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Date limite pour payer</p>
                                        <p className="text-2xl font-black text-white italic tracking-tighter">{new Date(loan.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Conditions or Contract */}
                    <div className="space-y-8">
                        {/* Contract Section - Only if signed */}
                        {loan.waiver_signed_at && (
                            <div className="glass-panel p-10 space-y-6 bg-blue-600/5 border-blue-500/20 text-left relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors"></div>
                                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 italic relative z-10">
                                    <DocumentIcon size={14} /> Votre Contrat
                                </h3>
                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed relative z-10">
                                    Votre reconnaissance de dette a été signée numériquement et validée. Vous pouvez en obtenir une copie certifiée.
                                </p>
                                <div className="relative z-10 pt-2">
                                    <LoanContractActions loan={loan} profile={profile} />
                                </div>
                            </div>
                        )}

                        {/* Conditions Section */}
                        <div className="glass-panel p-10 space-y-8 bg-slate-900/50 border-slate-800 text-left">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                <Money size={14} /> Résumé financier
                            </h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Somme prêtée</p>
                                        {loan.service_fee && <span className="text-[8px] font-black text-blue-500 uppercase border border-blue-500/20 px-2 py-0.5 rounded">+ 500 F frais</span>}
                                    </div>
                                    <p className="text-3xl font-black text-white tracking-tighter italic">{(loan.amount || 0).toLocaleString()} FCFA</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-blue-600 border border-blue-500 shadow-xl shadow-blue-600/20 group hover:scale-[1.02] transition-transform">
                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2 italic">Reste à payer</p>
                                    <p className="text-3xl font-black text-white tracking-tighter italic">{(loan.amount + (loan.service_fee || 0) - (loan.amount_paid || 0)).toLocaleString()} FCFA</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Helpful Note */}
                <div className="p-8 rounded-[2rem] bg-slate-900 border-slate-800 flex gap-6 items-center text-left">
                    <div className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Information size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-500 italic leading-relaxed">
                        Besoin d'assistance ou d'un délai de grâce ? Votre support prioritaire est disponible 24/7 via la <span className="text-blue-500">Conciergerie</span> de votre tableau de bord.
                    </p>
                </div>
            </div>
        </div>
    )
}
