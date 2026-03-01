import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Money, Information, CheckmarkFilled, CloseFilled, Time } from '@carbon/icons-react'

export default async function LoanDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/auth/login')

    const { data: loan, error } = await supabase
        .from('prets')
        .select(`
            *,
            plan:subscription_snapshot_id(name)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (error || !loan) {
        return (
            <div className="py-24 text-center space-y-6">
                <p className="text-slate-400 font-bold italic text-sm">Prêt introuvable ou accès refusé.</p>
                <Link href="/client/loans" className="premium-button inline-flex">Retour à la liste</Link>
            </div>
        )
    }

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active': return { label: 'Actif', color: 'text-emerald-400', icon: <CheckmarkFilled size={24} className="text-emerald-500" />, desc: 'Votre prêt est actif et en attente de remboursement.' }
            case 'pending': return { label: 'En attente', color: 'text-amber-400', icon: <Time size={24} className="text-amber-500" />, desc: 'Votre demande est en cours de révision par nos analystes.' }
            case 'paid': return { label: 'Remboursé', color: 'text-blue-400', icon: <CheckmarkFilled size={24} className="text-blue-500" />, desc: 'Félicitations ! Ce prêt a été intégralement remboursé.' }
            case 'rejected': return { label: 'Refusé', color: 'text-red-400', icon: <CloseFilled size={24} className="text-red-500" />, desc: 'Malheureusement, votre demande n\'a pas pu être acceptée.' }
            case 'overdue': return { label: 'En retard', color: 'text-rose-500', icon: <Information size={24} className="text-rose-500" />, desc: 'L\'échéance est dépassée. Veuillez régulariser votre situation au plus vite.' }
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
                            Operations Center
                        </Link>
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                            Détails du <span className="premium-gradient-text">Dossier.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-lg italic">
                            Identifiant Unique : <span className="text-white not-italic">{loan.id.split('-')[0].toUpperCase()}</span>
                        </p>
                    </div>
                    {loan.status === 'active' && (
                        <Link href={`/client/loans/repayment?loanId=${loan.id}`} className="premium-button px-10">
                            Rembourser Maintenant
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
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Engagement Total</p>
                            <p className="text-5xl font-black text-white tracking-tighter italic">{(loan.amount || 0).toLocaleString()} <span className="text-xs not-italic text-slate-700">FCFA</span></p>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Dates Timeline */}
                    <div className="glass-panel p-10 space-y-8 bg-slate-900/50 border-slate-800 text-left">
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                            <Calendar size={14} /> System Timeline
                        </h3>
                        <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center z-10">
                                    <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Demande Initiale</p>
                                    <p className="text-lg font-black text-white tracking-tight">{new Date(loan.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            {loan.admin_decision_date && (
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center z-10">
                                        <div className={`w-2 h-2 rounded-full ${loan.status === 'rejected' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Instance Administrative</p>
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
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Échéance de Remboursement</p>
                                        <p className="text-2xl font-black text-white italic tracking-tighter">{new Date(loan.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conditions Section */}
                    <div className="glass-panel p-10 space-y-8 bg-slate-900/50 border-slate-800 text-left">
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                            <Money size={14} /> Financial Summary
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Capital Débloqué</p>
                                <p className="text-3xl font-black text-white tracking-tighter italic">{(loan.amount || 0).toLocaleString()} FCFA</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Frais de Dossier</p>
                                <p className="text-3xl font-black text-white tracking-tighter italic">0.00% <span className="text-[10px] text-slate-700 italic ml-2">Fixe</span></p>
                            </div>
                            <div className="p-6 rounded-2xl bg-blue-600 border border-blue-500 shadow-xl shadow-blue-600/20 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2 italic">Balance à Régler</p>
                                <p className="text-3xl font-black text-white tracking-tighter italic">{(loan.amount || 0).toLocaleString()} FCFA</p>
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
