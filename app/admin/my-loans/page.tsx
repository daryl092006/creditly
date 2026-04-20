import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Money, ChevronRight, Information, Receipt, CheckmarkFilled, Warning } from '@carbon/icons-react'
import { calculateLoanDebt } from '@/utils/loan-utils'

export default async function AdminMyLoansPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/auth/login')

    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: loans } = await supabase
        .from('prets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const activeLoans = loans?.filter(l => ['approved', 'active', 'overdue'].includes(l.status)) || []
    const totalDebt = activeLoans.reduce((sum, l) => sum + calculateLoanDebt(l as any).totalDebt, 0)

    return (
        <div className="py-10 md:py-16 animate-fade-in px-4 md:px-0">
            <div className="main-container space-y-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Mes Prêts.</h1>
                    <p className="text-slate-500 font-bold mt-2 italic">Gérez vos engagements personnels envers Creditly.</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-8 bg-slate-900 border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Dette Totale à Rembourser</p>
                        <p className={`text-4xl font-black italic tracking-tighter ${totalDebt > 0 ? 'text-white' : 'text-slate-700'}`}>
                            {totalDebt.toLocaleString('fr-FR')} <span className="text-xs text-slate-600">FCFA</span>
                        </p>
                    </div>

                    <div className="glass-panel p-8 bg-slate-900 border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Nombre d'Échéances</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">{activeLoans.length}</p>
                    </div>

                    <div className="flex items-center justify-center">
                        <Link href="/client/loans/request" className="w-full">
                            <button className="w-full group p-8 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex flex-col items-center justify-center gap-2">
                                <Money size={32} className="group-hover:scale-110 transition-transform" />
                                <span>Nouvelle Demande</span>
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Loans Table */}
                <div className="glass-panel bg-slate-900/50 border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Historique de vos dotations staff</h3>
                    </div>
                    {activeLoans.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                                <Information size={32} />
                            </div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-xs">Aucune dette en cours</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Description & Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Montant Initial</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Échéance</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Reste à Payer</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {activeLoans.map((loan) => {
                                        const { totalDebt } = calculateLoanDebt(loan as any)
                                        const isOverdue = loan.status === 'overdue'
                                        
                                        return (
                                            <tr key={loan.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-white italic tracking-tight">{loan.description || 'Prêt Staff'}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Octroyé le {new Date(loan.created_at).toLocaleDateString('fr-FR')}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-slate-400 italic">{loan.amount.toLocaleString('fr-FR')} F</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        {isOverdue && <Warning size={14} className="text-red-500 animate-pulse" />}
                                                        <p className={`font-black italic ${isOverdue ? 'text-red-500' : 'text-white'}`}>
                                                            {loan.due_date ? new Date(loan.due_date).toLocaleDateString('fr-FR') : '-'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xl font-black text-blue-500 italic">{totalDebt.toLocaleString('fr-FR')} F</p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <Link href={`/client/loans/${loan.id}`}>
                                                        <button className="px-6 py-2 bg-slate-950 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-blue-500/50 transition-all flex items-center gap-2 ml-auto">
                                                            Payer <Receipt size={14} />
                                                        </button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
