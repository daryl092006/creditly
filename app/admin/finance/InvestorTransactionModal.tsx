'use client'

import React, { useState } from 'react'
import { Plus, Minus, Time, User, Wallet } from '@carbon/icons-react'

export function InvestorTransactionModal({ 
    isOpen, 
    onClose, 
    name, 
    onSuccess 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    name: string;
    onSuccess: (type: 'withdrawal' | 'investment', amount: number) => Promise<void>;
}) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (type: 'withdrawal' | 'investment') => {
        const val = parseInt(amount)
        if (isNaN(val) || val <= 0) return alert('Montant invalide')
        
        setLoading(true)
        await onSuccess(type, val)
        setLoading(false)
        setAmount('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <div className="glass-panel p-10 bg-slate-900 border-slate-700 w-full max-w-md space-y-8 animate-scale-in">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Action Trésorerie : {name}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enregistrer un mouvement de fonds personnel</p>
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
                        <Minus size={20} /> Retirer
                    </button>
                    <button 
                        onClick={() => handleSubmit('investment')}
                        disabled={loading}
                        className="h-16 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Remettre
                    </button>
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
