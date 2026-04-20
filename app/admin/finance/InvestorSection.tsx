'use client'

import React, { useState } from 'react'
import { Add, Subtract, Wallet, Time, ArrowUpRight, ArrowDownRight, Information } from '@carbon/icons-react'
import { InvestorTransactionModal } from './InvestorTransactionModal'
import { recordInvestorTransaction } from './investor-actions'

export default function InvestorSection({ 
    shareholders, 
    totalProfitToShare,
    ledger,
    currentUserEmail,
    profitBreakdown
}: { 
    shareholders: any[]; 
    totalProfitToShare: number;
    ledger: any[];
    currentUserEmail: string;
    profitBreakdown?: any;
}) {
    const [selectedName, setSelectedName] = useState<string | null>(null)

    const handleTransaction = async (type: 'withdrawal' | 'investment', amount: number) => {
        if (!selectedName) return
        await recordInvestorTransaction(selectedName, type, amount)
    }

    // Calculate final balances
    // Filter to hide everyone else's profit (Privacy Shield)
    const shareholdersWithBalance = shareholders
        .filter(s => s.email && currentUserEmail && s.email.toLowerCase() === currentUserEmail.toLowerCase())
        .map(s => {
            const myTransactions = ledger.filter(t => t.name.toLowerCase().includes(s.name.toLowerCase()))
            const totalAdjustments = myTransactions.reduce((acc, t) => acc + t.amount, 0)
            return {
                ...s,
                transactions: myTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                balance: Math.floor(totalProfitToShare * s.share) + totalAdjustments,
                totalWithdrawn: Math.abs(myTransactions.filter(t => t.type === 'withdrawal').reduce((acc, t) => acc + t.amount, 0)),
                totalReinvested: myTransactions.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.amount, 0),
                theoreticalShare: Math.floor(totalProfitToShare * s.share)
            }
        })

    return (
        <div className="space-y-12">
            {/* En-tête de section simplifié pour la confidentialité */}
            <div className="space-y-2 text-center md:text-left pt-8 border-t border-white/5">
                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.5em] italic">Mon Compte Associé</p>
                <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Gestion de mes Parts.</h3>
                <p className="text-xs text-slate-500 font-bold italic tracking-tight uppercase">Historique personnel de mes dividendes</p>
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

                                {/* Preuve de Calcul - Transparence Absolue */}
                                {profitBreakdown && (
                                    <div className="py-6 border-y border-white/5 space-y-3 bg-white/[0.02] -mx-8 px-8 group-hover:bg-white/[0.04] transition-colors">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                            <Information size={10} /> Justificatif de ma part
                                        </p>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 italic">
                                                <span>Abonnements (Global)</span>
                                                <span>+{profitBreakdown.subs.toLocaleString()} F</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 italic">
                                                <span>Frais Prêts (Global)</span>
                                                <span>+{profitBreakdown.fees.toLocaleString()} F</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-blue-400/60 italic">
                                                <span>Commissions Agents</span>
                                                <span>-{profitBreakdown.commissions.toLocaleString()} F</span>
                                            </div>
                                            <div className="pt-2 flex justify-between items-center border-t border-white/5">
                                                <span className="text-[10px] font-black text-white italic">Bénéfice Net Global</span>
                                                <span className="text-[10px] font-black text-emerald-500 italic">
                                                    {(profitBreakdown.subs + profitBreakdown.fees - profitBreakdown.commissions + (profitBreakdown.penalties || 0)).toLocaleString()} F
                                                 </span>
                                            </div>
                                            <div className="pt-1 flex justify-between items-center italic">
                                                <span className="text-[8px] font-bold text-slate-500 tracking-tighter">Ma Part ({(s.share * 100).toFixed(1)}%)</span>
                                                <span className="text-[11px] font-black text-white tracking-widest">
                                                    = {s.theoreticalShare.toLocaleString()} F
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Relevé de compte détaillé */}
                            {s.transactions.length > 0 && (
                                <div className="pt-6 space-y-3 border-t border-white/5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                            <Time size={10} /> Journal des flux
                                        </p>
                                        <span className="text-[8px] font-bold text-slate-700 italic">{s.transactions.length} mouvements</span>
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                        {s.transactions.map((t: any) => (
                                            <div key={t.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1 group hover:border-white/10 transition-all">
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${t.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {t.type === 'withdrawal' ? 'RETRAIT DASH' : 'REMise CAISSE'}
                                                    </span>
                                                    <span className="text-[9px] font-black text-white italic tracking-tighter">
                                                        {t.amount.toLocaleString()} F
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold uppercase tracking-widest">
                                                    <span>{t.date ? new Date(t.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Date inconnue'}</span>
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">ID: {t.id?.slice(0, 5)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
