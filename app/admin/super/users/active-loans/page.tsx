import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ChevronLeft, User, Money, Time, Warning } from '@carbon/icons-react'

export default async function ActiveLoansPage() {
    const supabase = await createClient()

    const { data: loans } = await supabase
        .from('prets')
        .select('*, user:users(*), snapshot:subscription_snapshot_id(*)')
        .in('status', ['active', 'overdue'])
        .order('due_date', { ascending: true })

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <Link href="/admin/super/users" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/10 transition-all mb-8 group">
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Gestion des Utilisateurs
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Prêts Actifs.</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed max-w-xl">
                            Liste prioritaire des financements en cours de remboursement ou en retard.
                        </p>
                    </div>

                    <div className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1 italic">Total en cours</p>
                        <p className="text-white font-black text-xl italic leading-none">{loans?.length || 0}</p>
                    </div>
                </div>

                <div className="glass-panel overflow-hidden bg-slate-900/50 border-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Client</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Montant</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Échéance</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Restant</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loans?.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white italic tracking-tight">{loan.user?.prenom} {loan.user?.nom}</p>
                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{loan.user?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-white italic">{Number(loan.amount).toLocaleString()} F</p>
                                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{loan.snapshot?.name}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Time size={14} className={loan.status === 'overdue' ? 'text-red-500 animate-pulse' : 'text-slate-500'} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${loan.status === 'overdue' ? 'text-red-500' : 'text-slate-300'}`}>
                                                    {new Date(loan.due_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-black text-emerald-500 italic">
                                                {(Number(loan.amount) - Number(loan.amount_paid)).toLocaleString()} F
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Link
                                                href={`/admin/super/users/${loan.user_id}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/10 transition-all"
                                            >
                                                Voir Dossier
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {(!loans || loans.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="w-16 h-16 bg-slate-950 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Warning size={32} className="text-slate-700" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 uppercase italic">Aucun prêt actif pour le moment.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
