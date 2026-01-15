'use client'

import { Upload, CheckmarkOutline, Warning } from '@carbon/icons-react'
import { useState, useTransition } from 'react'
import { submitRepayment } from '../actions'

export default function RepaymentForm({ loanId, remainingBalance }: { loanId: string; remainingBalance: number }) {
    const [file, setFile] = useState<File | null>(null)
    const [amount, setAmount] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleAction = async () => {
        if (!file || !amount) return
        setError(null)

        const numAmount = Number(amount)
        if (numAmount > remainingBalance) {
            setError(`Le montant saisi (${numAmount.toLocaleString()} F) dépasse votre solde restant (${remainingBalance.toLocaleString()} F).`)
            return
        }

        const formData = new FormData()
        formData.append('loanId', loanId)
        formData.append('amount', amount)
        formData.append('proof', file)

        startTransition(async () => {
            try {
                await submitRepayment(formData)
            } catch (err: any) {
                setError(err.message || "Une erreur est survenue")
            }
        })
    }

    return (
        <div className="glass-panel p-10 max-w-xl mx-auto bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-600/10 transition-colors"></div>

            <h2 className="text-3xl font-black mb-8 text-white uppercase italic tracking-tighter text-left">
                Déclarer un <span className="premium-gradient-text uppercase">Paiement.</span>
            </h2>

            {error && (
                <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-4 text-[10px] font-black uppercase tracking-widest italic animate-shake text-left">
                    <Warning size={24} />
                    {error}
                </div>
            )}

            <div className="space-y-8 text-left">
                <div className="space-y-3">
                    <label htmlFor="amount" className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Montant de la Transaction (FCFA)</label>
                    <div className="relative group/input">
                        <input
                            id="amount"
                            type="number"
                            placeholder="Montant exact transféré"
                            value={amount}
                            max={remainingBalance}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-6 py-6 rounded-2xl border border-white/5 bg-slate-950 text-white text-3xl font-black italic tracking-tighter focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-800"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs uppercase tracking-widest group-focus-within/input:text-emerald-500 transition-colors italic">FCFA</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Preuve de Transfert (Screenshot / Certificat)</label>
                    <div className="relative group/file">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => {
                                const files = e.target.files
                                if (files && files[0]) setFile(files[0])
                            }}
                        />
                        <div className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all duration-500 bg-white/5 ${file ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-600/5'}`}>
                            {file ? (
                                <>
                                    <div className="w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-xl">
                                        <CheckmarkOutline size={32} />
                                    </div>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">{file.name}</p>
                                    <p className="text-[8px] font-bold text-slate-700 uppercase mt-1 italic">Dossier prêt pour validation</p>
                                </>
                            ) : (
                                <>
                                    <Upload size={40} className="text-slate-700 group-hover:text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                                    <span className="text-[10px] font-black text-slate-600 group-hover:text-white uppercase tracking-[0.3em] transition-colors italic">Téléverser la preuve</span>
                                    <span className="text-[8px] font-bold text-slate-800 uppercase mt-2 italic tracking-widest">Max 10 Mo</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleAction}
                    disabled={!file || !amount || isPending}
                    className="premium-button w-full py-6 text-sm bg-emerald-600 border-emerald-500 hover:bg-emerald-500 shadow-emerald-600/20 active:scale-[0.98] group/btn"
                >
                    <Upload size={20} className="group-hover/btn:-translate-y-1 transition-transform" />
                    {isPending ? 'Sécurisation du transfert...' : 'Soumettre à l\'Analyse Administrative'}
                </button>
            </div>

            <p className="mt-8 text-center text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Votre paiement sera audité et validé sous un délai de 4h maximum.</p>
        </div>
    )
}
