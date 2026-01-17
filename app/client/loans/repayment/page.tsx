import { createClient } from '@/utils/supabase/server'
import RepaymentForm from './repayment-form'
// import { Tile } from '@carbon/react' (Disabled)

export default async function RepaymentPage({
    searchParams
}: {
    searchParams: Promise<{ loanId?: string }>
}) {
    const params = await searchParams
    const loanIdParam = params.loanId

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Connectez-vous</div>

    // Find active loan (priority to the one in URL)
    const query = supabase
        .from('prets')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')

    if (loanIdParam) {
        query.eq('id', loanIdParam)
    }

    const { data: loan } = await query.maybeSingle()

    if (!loan) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Remboursement</h1>
                <p>Vous n&apos;avez aucun prêt actif à rembourser.</p>
            </div>
        )
    }

    const dueDate = new Date(loan.due_date).toLocaleDateString()
    const remainingBalance = loan.amount - (loan.amount_paid || 0)

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                        Finalize <br />
                        <span className="premium-gradient-text">Repayment.</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-lg italic">Restaurez votre ligne de crédit en soldant votre encours.</p>
                </div>

                <div className="max-w-xl mx-auto mb-12">
                    <div className="glass-panel p-8 bg-slate-900/50 border-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Solde Restant à Payer</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">
                                    {remainingBalance.toLocaleString()} <span className="text-xs not-italic text-slate-600">FCFA</span>
                                </p>
                            </div>
                            <div className="px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                                <p className="text-[8px] font-black text-red-500/50 uppercase tracking-widest mb-1">Échéance Finale</p>
                                <p className="text-sm font-black text-red-500 uppercase italic tracking-widest">{dueDate}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Capital Initial : {loan.amount.toLocaleString()} F</p>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Déjà réglé : {(loan.amount_paid || 0).toLocaleString()} F</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Comptes de Dépôt
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">MTN Dépôt</span>
                                <span className="text-sm font-black text-white tracking-widest">+229 01 53 32 44 90</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">CELTICS</span>
                                <span className="text-sm font-black text-white tracking-widest">+229 01 44 14 00 67</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">MOOV</span>
                                <span className="text-sm font-black text-white tracking-widest">+229 01 58 69 14 05</span>
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Comptes Abonnement
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">MTN (1ère Personne)</span>
                                </div>
                                <span className="text-sm font-black text-white tracking-widest block text-right">+229 01 57 80 90 78</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">MTN (2ème Personne)</span>
                                </div>
                                <span className="text-sm font-black text-white tracking-widest block text-right">+229 01 69 46 30 04</span>
                            </div>
                        </div>
                    </div>
                </div>

                <RepaymentForm loanId={loan.id} remainingBalance={remainingBalance} />
            </div>
        </div>
    )
}
