'use client'

import { Money, Information, CloseFilled } from '@carbon/icons-react'
import { useState } from 'react'
import { requestLoan } from '../actions'
import { useRouter } from 'next/navigation'

interface Subscription {
    plan: {
        name: string;
        max_loan_amount: number;
        repayment_delay_days: number;
    }
}

export default function LoanRequestForm({ subscription }: { subscription: Subscription }) {
    const router = useRouter()
    const [amount, setAmount] = useState<number>(subscription.plan.max_loan_amount)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)

        if (amount > subscription.plan.max_loan_amount) {
            setError('Le montant dépasse votre plafond autorisé.')
            setLoading(false)
            return
        }

        try {
            const res = await requestLoan(amount)
            if (res?.error) {
                setError(res.error)
            } else if (res?.success) {
                router.push(`/client/dashboard?success=${res.success}`)
            }
        } catch (error) {
            setError((error as Error).message)
        }
        setLoading(false)
    }


    return (
        <div className="glass-panel p-10 max-w-xl mx-auto bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-600/10 transition-colors"></div>
            <h2 className="text-3xl font-black mb-8 text-white uppercase italic tracking-tighter text-left">Nouvelle <span className="premium-gradient-text uppercase">Demande.</span></h2>

            <div className="mb-10 bg-slate-950 border border-white/5 rounded-2xl p-6 space-y-4 text-left">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-inner">
                        <Information size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Allocation Actuelle</p>
                        <p className="text-lg font-black text-white uppercase italic">{subscription.plan.name}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Plafond Max</p>
                        <p className="text-sm font-black text-white italic tracking-tighter">{subscription.plan.max_loan_amount.toLocaleString()} <span className="text-[10px] not-italic text-slate-700 font-bold">FCFA</span></p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Délai Règlement</p>
                        <p className="text-sm font-black text-white italic tracking-tighter">{subscription.plan.repayment_delay_days} <span className="text-[10px] not-italic text-slate-700 font-bold">JOURS</span></p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-4 animate-shake text-left">
                    <CloseFilled size={24} className="shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic">Erreur Protocole</p>
                        <p className="text-xs font-bold font-sans">{error}</p>
                    </div>
                </div>
            )}

            <div className="space-y-6 text-left">
                <div className="space-y-3">
                    <label htmlFor="amount" className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Montant Sollicité (FCFA)</label>
                    <div className="relative group/input">
                        <input
                            id="amount"
                            type="number"
                            value={amount}
                            max={subscription.plan.max_loan_amount}
                            min={1000}
                            step={500}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full px-6 py-6 rounded-2xl border border-white/5 bg-slate-950 text-white text-3xl font-black italic tracking-tighter focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs uppercase tracking-widest group-focus-within/input:text-blue-500 transition-colors italic">FCFA</div>
                    </div>
                    <div className="flex justify-between px-1">
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Min: 1,000</p>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Max: {subscription.plan.max_loan_amount.toLocaleString()}</p>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="premium-button w-full py-6 text-sm active:scale-[0.98] group/btn"
                >
                    <Money size={20} className="group-hover/btn:rotate-12 transition-transform" />
                    {loading ? 'Traitement Instantané...' : 'Engager le Financement'}
                </button>
            </div>
        </div>
    )
}
