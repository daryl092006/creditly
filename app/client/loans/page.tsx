import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@carbon/icons-react'

export default async function ClientLoansPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    const { data: loans } = await supabase
        .from('prets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const { data: repayments } = await supabase
        .from('remboursements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                    <div className="space-y-4">
                        <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Centre d&apos;Opérations
                        </Link>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.9]">
                            Suivi <br /><span className="premium-gradient-text uppercase">Financier.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-lg italic max-w-xl">
                            Consultez l&apos;historique complet de vos engagements et l&apos;état de vos remboursements.
                        </p>
                    </div>
                    <Link
                        href="/client/loans/request"
                        className="premium-button w-full md:w-auto px-10"
                    >
                        Nouveau Prêt
                    </Link>
                </div>

                {/* ACTIVE LOANS */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Historique des Prêts</h2>

                    {/* Desktop View Table */}
                    <div className="glass-panel overflow-hidden border-slate-800 bg-slate-900/50 hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/50 border-b border-white/5">
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Montant</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Échéance</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loans && loans.length > 0 ? (
                                        loans.map((loan) => (
                                            <tr key={loan.id} className="hover:bg-white/5 transition-all group">
                                                <td className="px-8 py-6 text-sm font-bold text-slate-400 italic">
                                                    {new Date(loan.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-xl font-black text-white tracking-tighter italic">
                                                            {(loan.amount || 0).toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span>
                                                        </span>
                                                        {loan.status === 'active' && (loan.amount_paid || 0) > 0 && (
                                                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                                    style={{ width: `${Math.min(100, ((loan.amount_paid || 0) / loan.amount) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-left">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic border ${loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' :
                                                        loan.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
                                                            loan.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {loan.status === 'active'
                                                            ? ((loan.amount_paid || 0) > 0 ? `Actif (${Math.round(((loan.amount_paid || 0) / loan.amount) * 100)}%)` : 'Actif')
                                                            : loan.status === 'pending' ? 'En Vérification'
                                                                : loan.status === 'paid' ? 'Payé' : 'Rejeté'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                                                    {loan.due_date ? new Date(loan.due_date).toLocaleDateString('fr-FR') : '—'}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-4">
                                                        <Link
                                                            href={`/client/loans/${loan.id}`}
                                                            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                                                        >
                                                            Details
                                                        </Link>
                                                        {loan.status === 'rejected' && (
                                                            <Link
                                                                href="/client/loans/request"
                                                                className="px-6 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all border border-white/10"
                                                            >
                                                                Ressayer
                                                            </Link>
                                                        )}
                                                        {loan.status === 'active' && (
                                                            <Link
                                                                href={`/client/loans/repayment?loanId=${loan.id}`}
                                                                className="px-6 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                                            >
                                                                Rembourser
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-24 text-center">
                                                <div className="space-y-4 opacity-50">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Aucun prêt trouvé</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="space-y-4 md:hidden">
                        {loans && loans.length > 0 ? (
                            loans.map((loan) => (
                                <div key={loan.id} className="glass-panel p-6 bg-slate-900/50 border-slate-800 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Date de demande</p>
                                            <p className="text-xs font-bold text-white">{new Date(loan.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic border ${loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            loan.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                loan.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {loan.status === 'active' ? 'Actif' : loan.status === 'pending' ? 'Vérification' : loan.status === 'paid' ? 'Payé' : 'Rejeté'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Montant Engagé</p>
                                        <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{(loan.amount || 0).toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                                        {loan.status === 'active' && (loan.amount_paid || 0) > 0 && (
                                            <div className="pt-2">
                                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                                                    <div
                                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(100, ((loan.amount_paid || 0) / loan.amount) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">Progress : {Math.round(((loan.amount_paid || 0) / loan.amount) * 100)}% réglé</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Échéance Finale</p>
                                            <p className="text-[10px] font-bold text-slate-400">{loan.due_date ? new Date(loan.due_date).toLocaleDateString('fr-FR') : '—'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/client/loans/${loan.id}`}
                                                className="px-4 py-2 border border-slate-700 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                            >
                                                Details
                                            </Link>
                                            {loan.status === 'rejected' && (
                                                <Link
                                                    href="/client/loans/request"
                                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10"
                                                >
                                                    Ressayer
                                                </Link>
                                            )}
                                            {loan.status === 'active' && (
                                                <Link
                                                    href={`/client/loans/repayment?loanId=${loan.id}`}
                                                    className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                                                >
                                                    Payer
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center opacity-50">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Aucun prêt trouvé</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* REPAYMENT HISTORY */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Historique des Paiements</h2>

                    {/* Desktop Table */}
                    <div className="glass-panel overflow-hidden border-slate-800 bg-slate-900/50 hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/50 border-b border-white/5">
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date Soumission</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Montant Déclaré</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Validé Le</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {repayments && repayments.length > 0 ? (
                                        repayments.map((repayment) => (
                                            <tr key={repayment.id} className="hover:bg-white/5 transition-all group">
                                                <td className="px-8 py-6 text-sm font-bold text-slate-400 italic">
                                                    {new Date(repayment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-xl font-black text-white tracking-tighter italic">
                                                        {(repayment.amount_declared || 0).toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span>
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-left">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic border ${repayment.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        repayment.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {repayment.status === 'verified' ? 'Validé' :
                                                            repayment.status === 'pending' ? 'En Attente' : 'Rejeté'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                                                    {repayment.validated_at ? new Date(repayment.validated_at).toLocaleDateString('fr-FR') : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-24 text-center">
                                                <div className="space-y-4 opacity-50">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Aucun paiement trouvé</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-4 md:hidden">
                        {repayments && repayments.length > 0 ? (
                            repayments.map((repayment) => (
                                <div key={repayment.id} className="glass-panel p-6 bg-slate-900/50 border-slate-800 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Date de soumission</p>
                                            <p className="text-xs font-bold text-white">{new Date(repayment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic border ${repayment.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            repayment.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {repayment.status === 'verified' ? 'Validé' : repayment.status === 'pending' ? 'En Attente' : 'Rejeté'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Montant déclaré</p>
                                        <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{(repayment.amount_declared || 0).toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none mb-1">Date de validation</p>
                                        <p className="text-[10px] font-bold text-slate-400">{repayment.validated_at ? new Date(repayment.validated_at).toLocaleDateString('fr-FR') : 'Audit en cours...'}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center opacity-50">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Aucun paiement trouvé</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )

}
