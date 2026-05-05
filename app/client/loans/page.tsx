import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import React from 'react'
import { 
    ArrowLeft, 
    Rocket, 
    Time, 
    CheckmarkFilled, 
    WarningAltFilled, 
    Misuse,
    Currency,
    Receipt,
    CloseFilled
} from '@carbon/icons-react'
import LoanListActions from './loan-list-actions'
import ExtensionButton from './extension-button'
import { getSettingValue } from '../../admin/settings/actions'

// Formule de calcul du total à payer (Capital + Frais + Extension)
const calculateTotalToPay = (loan: any) => {
    const amount = Number(loan.amount) || 0;
    const fee = Number(loan.service_fee) || 0;
    const extFee = Number(loan.extension_fee) || 0;
    return amount + fee + extFee;
};

export default async function ClientLoansPage() {
    const supabase = await createClient()
    
    // Mise à jour automatique des statuts (RPC)
    await supabase.rpc('auto_update_system_statuses')

    const extFeeSetting = await getSettingValue('loan_extension_fee', '500')
    const extensionFee = parseInt(extFeeSetting)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/auth/login')

    // Récupération des prêts avec les infos utilisateur
    const { data: loans } = await supabase
        .from('prets')
        .select('*, user:users!prets_user_id_fkey(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const hasOverdue = loans?.some(l => l.status === 'overdue') || false

    // Récupération des paiements pour vérifier les validations en cours
    const { data: repayments } = await supabase
        .from('remboursements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const loansWithPendingPayments = new Set(
        repayments?.filter(r => r.status === 'pending').map(r => r.loan_id) || []
    )

    return (
        <div className="min-h-screen py-12 md:py-24 page-transition bg-slate-950 text-slate-200">
            <div className="main-container max-w-7xl mx-auto px-6 space-y-16">
                
                {/* HEADER STRATÉGIQUE */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
                    <div className="space-y-6 max-w-3xl">
                        <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-all group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Retour au Tableau de Bord
                        </Link>
                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                            Mes <span className="premium-gradient-text">Engagements.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 font-medium italic border-l-2 border-blue-500/30 pl-6">
                            Suivez l&apos;évolution de vos financements en temps réel et gérez vos remboursements en quelques clics.
                        </p>
                    </div>
                    
                    <Link href="/client/loans/request" className="premium-button px-10 py-5 group">
                        <Rocket size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        <span>Nouveau Prêt</span>
                    </Link>
                </div>

                {/* SECTION 1: PRÊTS ACTIFS */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] italic">Dossiers de Financement</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                    </div>

                    {!loans || loans.length === 0 ? (
                        <div className="glass-panel p-20 text-center space-y-6 bg-slate-900/20 border-dashed border-slate-800">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-600">
                                <Currency size={32} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-white italic uppercase tracking-tighter">Aucun dossier actif</p>
                                <p className="text-sm text-slate-500 italic max-w-xs mx-auto">Vous n&apos;avez pas encore de demande de prêt effectuée sur la plateforme.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {/* VERSION DESKTOP TABLEAU PREMIUM */}
                            <div className="hidden md:block glass-panel overflow-hidden bg-slate-900/40 border-slate-800 shadow-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-950/80 border-b border-white/5">
                                            <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Émis le</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Montant Total</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Progression</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Statut</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loans.map((loan) => {
                                            const total = calculateTotalToPay(loan);
                                            const progress = Math.min(100, Math.round(((loan.amount_paid || 0) / (total || 1)) * 100));
                                            const isPendingVerification = loansWithPendingPayments.has(loan.id);

                                            return (
                                                <tr key={loan.id} className="hover:bg-blue-500/[0.02] transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                                                                <Time size={16} />
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-400 italic">
                                                                {new Date(loan.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="space-y-1">
                                                            <p className="text-lg font-black text-white italic tracking-tighter uppercase leadings-none">
                                                                {total.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600 not-italic">FCFA</span>
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Capital: {Number(loan.amount).toLocaleString('fr-FR')}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 w-56 text-center">
                                                        {(loan.status === 'active' || loan.status === 'overdue') ? (
                                                            <div className="space-y-2">
                                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full transition-all duration-1000 ${loan.status === 'overdue' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`}
                                                                        style={{ width: `${progress}%` }}
                                                                    ></div>
                                                                </div>
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter italic">Payé à {progress}%</p>
                                                            </div>
                                                        ) : <span className="text-slate-700 text-[10px] italic">N/A</span>}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <LoanStatusBadge status={loan.status} isVerifying={isPendingVerification} />
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <ExtensionButton loanId={loan.id} isExtended={loan.is_extended} status={loan.status} hasOverdue={hasOverdue} extensionFee={extensionFee} />
                                                            <LoanListActions loan={loan} profile={loan.user} />
                                                            <Link href={`/client/loans/${loan.id}`} className="p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all">
                                                                <ArrowLeft size={16} className="rotate-180" />
                                                            </Link>
                                                            {(loan.status === 'active' || loan.status === 'overdue') && (
                                                                <Link 
                                                                    href={`/client/loans/repayment?loanId=${loan.id}`}
                                                                    className="px-6 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                                                                >
                                                                    <Receipt size={14} />
                                                                    Payer
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* VERSION MOBILE CARTES PREMIUM */}
                            <div className="grid grid-cols-1 gap-4 md:hidden">
                                {loans.map((loan) => (
                                    <div key={loan.id} className="glass-panel p-6 bg-slate-900/60 border-slate-800 relative overflow-hidden group">
                                         <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                                         <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Dossier du</p>
                                                <p className="text-xs font-bold text-white italic">{new Date(loan.created_at).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                            <LoanStatusBadge status={loan.status} isVerifying={loansWithPendingPayments.has(loan.id)} />
                                         </div>

                                         <div className="space-y-4 mb-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Somme Engagement</p>
                                                <p className="text-3xl font-black text-white italic tracking-tighter leading-none">
                                                    {calculateTotalToPay(loan).toLocaleString('fr-FR')} <span className="text-xs not-italic text-slate-600">FCFA</span>
                                                </p>
                                            </div>
                                            
                                            {(loan.status === 'active' || loan.status === 'overdue') && (
                                                <div className="space-y-2">
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${loan.status === 'overdue' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                                            style={{ width: `${Math.min(100, Math.round(((loan.amount_paid || 0) / (calculateTotalToPay(loan) || 1)) * 100))}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Remboursement avancé à {Math.min(100, Math.round(((loan.amount_paid || 0) / (calculateTotalToPay(loan) || 1)) * 100))}%</p>
                                                </div>
                                            )}
                                         </div>

                                         <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div className="space-y-1 text-left">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Actions disponibles</p>
                                                <div className="flex gap-2">
                                                    <LoanListActions loan={loan} profile={loan.user} />
                                                    <Link href={`/client/loans/${loan.id}`} className="text-[10px] font-black p-1 text-slate-500 group-hover:text-blue-400 uppercase italic">Détails</Link>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <ExtensionButton loanId={loan.id} isExtended={loan.is_extended} status={loan.status} hasOverdue={hasOverdue} extensionFee={extensionFee} />
                                                {(loan.status === 'active' || loan.status === 'overdue') && (
                                                    <Link href={`/client/loans/repayment?loanId=${loan.id}`} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Payer</Link>
                                                )}
                                            </div>
                                         </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 2: HISTORIQUE DES PAIEMENTS */}
                <div className="space-y-8 pb-20">
                    <div className="flex items-center gap-4">
                        <div className="h-px w-8 bg-slate-800"></div>
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] italic leading-none">Historique Transac.</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                    </div>

                    <div className="glass-panel bg-slate-900/40 border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950/50 border-b border-white/5">
                                        <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase">Soumis à</th>
                                        <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase">Versement</th>
                                        <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase">État</th>
                                        <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase text-right">Confirmation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {!repayments || repayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-16 text-center text-slate-700 text-xs italic tracking-widest uppercase">Aucun reçu soumis pour le moment</td>
                                        </tr>
                                    ) : (
                                        repayments.map((r) => (
                                            <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-8 py-5 text-xs font-bold text-slate-400 italic">
                                                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-base font-black text-white italic tracking-tighter">
                                                        {Number(r.amount_declared).toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600 not-italic uppercase">FCFA</span>
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic border ${
                                                        r.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        r.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]' :
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                        {r.status === 'verified' && <CheckmarkFilled size={12} />}
                                                        {r.status === 'pending' && <Time size={12} />}
                                                        {r.status === 'rejected' && <CloseFilled size={12} />}
                                                        {r.status === 'verified' ? 'Validé' : r.status === 'pending' ? 'En attente' : 'Refusé'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right text-xs font-bold text-slate-600 italic">
                                                    {r.validated_at ? new Date(r.validated_at).toLocaleDateString('fr-FR') : '---'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// COMPOSANT INTERNE POUR LES BADGES DE STATUT PRÊT
function LoanStatusBadge({ status, isVerifying }: { status: string, isVerifying: boolean }) {
    if (isVerifying && status === 'overdue') {
        return (
             <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-[0.15em] italic">
                <Time size={14} className="animate-spin-slow" />
                Vérification
            </span>
        )
    }

    switch (status) {
        case 'active':
            return (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-[0.15em] italic shadow-lg shadow-emerald-500/10">
                    <CheckmarkFilled size={14} />
                    Dossier Actif
                </span>
            )
        case 'overdue':
            return (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-[0.15em] italic shadow-lg shadow-red-500/10 animate-pulse-slow">
                    <WarningAltFilled size={14} />
                    En Retard
                </span>
            )
        case 'pending':
            return (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-[0.15em] italic">
                    <Time size={14} />
                    Analyse en cours
                </span>
            )
        case 'paid':
            return (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-[9px] font-black uppercase tracking-[0.15em] italic opacity-60">
                    <CheckmarkFilled size={14} />
                    Soldé
                </span>
            )
        case 'rejected':
            return (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-slate-700 border border-slate-800 text-[9px] font-black uppercase tracking-[0.15em] italic line-through">
                    <CloseFilled size={14} />
                    Refusé
                </span>
            )
        default:
            return <span className="text-slate-500 text-[10px] uppercase font-bold italic tracking-widest">{status}</span>
    }
}
