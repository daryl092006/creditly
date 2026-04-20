'use client'

import React, { useState } from 'react'
import { Plus, Minus, Wallet, Time, ArrowUpRight, ArrowDownRight } from '@carbon/icons-react'
import { InvestorTransactionModal } from './InvestorTransactionModal'
import { recordInvestorTransaction } from './investor-actions'

export default function InvestorSection({ 
    shareholders, 
    totalProfitToShare,
    ledger 
}: { 
    shareholders: any[]; 
    totalProfitToShare: number;
    ledger: any[];
}) {
    const [selectedName, setSelectedName] = useState<string | null>(null)

    const handleTransaction = async (type: 'withdrawal' | 'investment', amount: number) => {
        if (!selectedName) return
        await recordInvestorTransaction(selectedName, type, amount)
    }

    // Calculate final balances
    const shareholdersWithBalance = shareholders.map(s => {
        const myTransactions = ledger.filter(t => t.name === s.name)
        const totalAdjustments = myTransactions.reduce((acc, t) => acc + t.amount, 0)
        return {
            ...s,
            transactions: myTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            balance: s.amount + totalAdjustments,
            totalWithdrawn: Math.abs(myTransactions.filter(t => t.type === 'withdrawal').reduce((acc, t) => acc + t.amount, 0)),
            totalReinvested: myTransactions.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.amount, 0)
        }
    })

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-2 text-center md:text-left">
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.5em] italic">Dividendes Associés</p>
                    <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Partage des Bénéfices.</h3>
                    <p className="text-xs text-slate-500 font-bold italic tracking-tight uppercase">Audit cumulé depuis le 19 Mars 2026</p>
                </div>
                <div className="bg-slate-900 border border-emerald-500/20 px-8 py-5 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bénéfice Net Global Partageable</p>
                    <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">{totalProfitToShare.toLocaleString('fr-FR')} F</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {shareholdersWithBalance.map((s, i) => (
                    <div key={i} className="glass-panel p-8 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[60px] -mr-12 -mt-12 opacity-20" style={{ backgroundColor: s.color }}></div>
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white italic text-sm" style={{ backgroundColor: s.color }}>
                                    {s.name.charAt(0)}
                                </div>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{(s.share * 100).toFixed(1)}%</span>
                            </div>

                            <div>
                                <h4 className="text-2xl font-black text-white italic tracking-tighter leading-none mb-1">{s.name}</h4>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Compte Associé</p>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Solde Disponible</p>
                                    <p className={`text-2xl font-black italic tracking-tighter leading-none ${s.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {s.balance.toLocaleString('fr-FR')} F
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setSelectedName(s.name)}
                                        className="h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-white text-[9px] font-black uppercase tracking-widest"
                                    >
                                        <Wallet size={14} /> Gérer
                                    </button>
                                    <div className="flex flex-col justify-center text-[8px] font-bold text-slate-500 uppercase italic">
                                        <p>+ {s.totalReinvested.toLocaleString()} R</p>
                                        <p>- {s.totalWithdrawn.toLocaleString()} W</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent items list */}
                            {s.transactions.length > 0 && (
                                <div className="pt-4 space-y-2">
                                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2 italic flex items-center gap-2">
                                        <Time size={10} /> Activité Récente
                                    </p>
                                    {s.transactions.slice(0, 2).map((t: any) => (
                                        <div key={t.id} className="flex justify-between items-center text-[9px] font-bold">
                                            <span className="text-slate-500 italic">{new Date(t.date).toLocaleDateString()}</span>
                                            <span className={t.type === 'withdrawal' ? 'text-red-500' : 'text-emerald-500'}>
                                                {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} F
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <InvestorTransactionModal 
                isOpen={!!selectedName}
                onClose={() => setSelectedName(null)}
                name={selectedName || ''}
                onSuccess={handleTransaction}
            />
        </div>
    )
}
