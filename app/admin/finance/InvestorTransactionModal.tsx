'use client'

import React, { useState } from 'react'
import { Add, Subtract, Time, User, Wallet, Warning } from '@carbon/icons-react'

export function InvestorTransactionModal({ 
    isOpen, 
    onClose, 
    name, 
    debt = 0,
    onSuccess 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    name: string;
    debt?: number;
    onSuccess: (type: 'withdrawal' | 'investment', amount: number, repayDebt?: boolean) => Promise<void>;
}) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [repayDebt, setRepayDebt] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (type: 'withdrawal' | 'investment') => {
        const val = parseInt(amount)
        if (isNaN(val) || val <= 0) return alert('Montant invalide')
        
        setLoading(true)
        try {
            await onSuccess(type, val, type === 'withdrawal' && repayDebt)
            setAmount('')
            setRepayDebt(false)
            onClose()
        } catch (error) {
            console.error("Transaction failed:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <div className="glass-panel p-10 bg-slate-900 border-slate-700 w-full max-w-md space-y-8 animate-scale-in">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Action Trésorerie : {name}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enregistrer un mouvement de fonds personnel</p>
                    {debt > 0 && (
                        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <Warning size={14} /> Attention : Dette Active
                            </p>
                            <p className="text-[11px] font-bold text-slate-300 italic">
                                Vous avez une dette personnelle de <span className="text-white font-black">{debt.toLocaleString('fr-FR')} F</span> sur la plateforme.
                            </p>
                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={repayDebt}
                                        onChange={(e) => setRepayDebt(e.target.checked)}
                                    />
                                    <div className={`w-5 h-5 rounded border-2 transition-all ${repayDebt ? 'bg-amber-500 border-amber-500' : 'border-slate-700 bg-slate-950 group-hover:border-slate-500'}`}>
                                        {repayDebt && (
                                            <svg className="w-full h-full text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
                                    Utiliser ce montant pour rembourser ma dette
                                </span>
                            </label>
                        </div>
                    )}
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest italic pt-2">Note : Toute demande de retrait doit être validée par un Super-Admin.</p>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Montant (FCFA)</label>
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Ex: 50000"
                        className="w-full h-16 bg-black/40 border border-white/10 rounded-2xl px-6 text-xl font-black text-white italic focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => handleSubmit('withdrawal')}
                        disabled={loading}
                        className="h-16 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Subtract size={20} /> {repayDebt ? 'Rembourser' : 'Retirer'}
                    </button>
                    <button 
                        onClick={() => handleSubmit('investment')}
                        disabled={loading}
                        className="h-16 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Add size={20} /> Remettre
                    </button>
                </div>

                <div className="flex flex-col gap-1 text-[8px] font-black text-slate-700 uppercase tracking-widest italic text-center">
                    <p>Remettre : Réinvestissement ou retour de fonds en caisse</p>
                    <p>Retirer : Sortie de fonds personnels (dividendes)</p>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors"
                >
                    Annuler
                </button>
            </div>
        </div>
    )
}
