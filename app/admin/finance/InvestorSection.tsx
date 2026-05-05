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
    profitBreakdown,
    showAll
}: { 
    shareholders: any[]; 
    totalProfitToShare: number;
    ledger: any[];
    currentUserEmail: string;
    profitBreakdown?: any;
    showAll?: boolean;
}) {
    const [selectedName, setSelectedName] = useState<string | null>(null)

    const handleTransaction = async (type: 'withdrawal' | 'investment', amount: number, repayDebt: boolean = false) => {
        if (!selectedName) return
        const res = await recordInvestorTransaction(selectedName, type, amount, repayDebt)
        if (res?.error) {
            alert("Erreur: " + res.error)
            throw new Error(res.error) // Prevent modal closing in handleSubmit
        }
    }

    // Calculate final balances
    // Filter to hide everyone else's profit (Privacy Shield)
    const shareholdersWithBalance = shareholders
        .filter(s => {
            if (showAll) return true;
            return s.email && currentUserEmail && s.email.toLowerCase() === currentUserEmail.toLowerCase()
        })
        .map(s => {
            const myTransactions = ledger.filter(t => t.shareholder_name?.toLowerCase().includes(s.name.toLowerCase()))
            const approvedTransactions = myTransactions.filter(t => t.status === 'approved')
            const totalAdjustments = approvedTransactions.reduce((acc: number, t) => acc + t.amount, 0)
            return {
                ...s,
                transactions: myTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                balance: Math.floor(totalProfitToShare * s.share) + totalAdjustments + (s.realizedComms || 0),
                totalWithdrawn: Math.abs(approvedTransactions.filter(t => t.type === 'withdrawal').reduce((acc: number, t) => acc + t.amount, 0)),
                totalReinvested: approvedTransactions.filter(t => t.type === 'investment').reduce((acc: number, t) => acc + t.amount, 0),
                theoreticalShare: Math.floor(totalProfitToShare * s.share),
                realizedComms: s.realizedComms || 0,
                totalAdjustments: totalAdjustments,
                totalDebt: s.totalDebt || 0,
                currentCapital: s.currentCapital || 0,
                originalShare: s.originalShare || s.share
            }
        })

    return (
        <div className="space-y-12">
            {/* En-tête de section simplifié pour la confidentialité */}
            <div className="space-y-2 text-center md:text-left pt-8 border-t border-white/5">
                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.5em] italic">{showAll ? 'Répartition des Associés' : 'Mon Compte Associé'}</p>
                <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">{showAll ? 'Investissements de chacun.' : 'Gestion de mes Parts.'}</h3>
                <p className="text-xs text-slate-500 font-bold italic tracking-tight uppercase">{showAll ? 'Vue globale de la distribution des bénéfices' : 'Historique personnel de mes dividendes'}</p>
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
                                <div className="text-right">
                                    <span className="block text-[10px] font-black text-white uppercase tracking-widest italic">{(s.share * 100).toFixed(3)}%</span>
                                    <span className="block text-[7px] font-bold text-slate-600 uppercase tracking-tight">Initial: {(s.originalShare * 100).toFixed(1)}%</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-2xl font-black text-white italic tracking-tighter leading-none mb-1">{s.name}</h4>
                                <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Compte Associé</p>
                                    <p className="text-[9px] font-black text-blue-400 italic">Capital: {Math.floor(s.currentCapital).toLocaleString('fr-FR')} F</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Solde Disponible (Brut)</p>
                                    <p className={`text-2xl font-black italic tracking-tighter leading-none ${s.balance >= 0 ? 'text-white' : 'text-red-500'}`}>
                                        {s.balance.toLocaleString('fr-FR')} F
                                    </p>
                                </div>

                                {s.totalDebt > 0 && (
                                    <div className="space-y-1 pt-1">
                                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest leading-none italic">Dette à déduire</p>
                                        <p className="text-sm font-black text-red-500 italic tracking-tighter leading-none">
                                            - {s.totalDebt.toLocaleString('fr-FR')} F
                                        </p>
                                        <div className="pt-3 border-t border-white/5">
                                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Net Retirable</p>
                                            <p className="text-xl font-black text-emerald-500 italic tracking-tighter">
                                                {Math.max(0, s.balance - s.totalDebt).toLocaleString('fr-FR')} F
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    {s.email?.toLowerCase() === currentUserEmail.toLowerCase() ? (
                                        <button 
                                            onClick={() => setSelectedName(s.name)}
                                            className="h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-white text-[9px] font-black uppercase tracking-widest"
                                        >
                                            <Wallet size={14} /> Gérer
                                        </button>
                                    ) : (
                                        <div className="h-10 px-4 bg-slate-950/50 border border-white/5 rounded-xl flex items-center justify-center text-slate-600 text-[8px] font-black uppercase tracking-widest italic">
                                            Lecture seule
                                        </div>
                                    )}
                                    <div className="flex flex-col justify-center text-[8px] font-bold text-slate-500 uppercase italic">
                                        <p>+ {s.totalReinvested.toLocaleString('fr-FR')} R</p>
                                        <p>- {s.totalWithdrawn.toLocaleString('fr-FR')} W</p>
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
                                                <span>+{(profitBreakdown.subsRealized || 0).toLocaleString('fr-FR')} F</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 italic">
                                                <span>Frais Prêts (Global)</span>
                                                <span>+{(profitBreakdown.feesRealized || 0).toLocaleString('fr-FR')} F</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-blue-400/60 italic">
                                                <span>Commissions Agents</span>
                                                <span>-{(profitBreakdown.commissions || 0).toLocaleString('fr-FR')} F</span>
                                            </div>
                                            <div className="pt-2 flex justify-between items-center border-t border-white/5">
                                                <span className="text-[10px] font-black text-white italic">Bénéfice Net Retirable</span>
                                                <span className="text-[10px] font-black text-emerald-500 italic">
                                                    {(profitBreakdown.subsRealized + profitBreakdown.feesRealized + profitBreakdown.penaltiesRealized - profitBreakdown.commissions).toLocaleString('fr-FR')} F
                                                 </span>
                                            </div>
                                            <div className="pt-1 flex justify-between items-center italic">
                                                <span className="text-[8px] font-bold text-slate-500 tracking-tighter">Ma Part Dividende ({(s.share * 100).toFixed(3)}%)</span>
                                                <span className="text-[11px] font-black text-white tracking-widest">
                                                    = {(s.theoreticalShare || 0).toLocaleString('fr-FR')} F
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center italic">
                                                <span className="text-[8px] font-bold text-emerald-500 tracking-tighter">Mes Gains de Travail</span>
                                                <span className="text-[11px] font-black text-emerald-500 tracking-widest">
                                                    + {(s.realizedComms || 0).toLocaleString('fr-FR')} F
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center italic">
                                                <span className="text-[8px] font-bold text-blue-500 tracking-tighter">Mes Ajustements (W/R)</span>
                                                <span className="text-[11px] font-black text-blue-500 tracking-widest">
                                                    {s.totalAdjustments >= 0 ? '+' : ''} {s.totalAdjustments.toLocaleString('fr-FR')} F
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
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border italic uppercase tracking-widest ${
                                                            t.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                            t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                            {t.status || 'approved'}
                                                        </span>
                                                        <span className="text-[9px] font-black text-white italic tracking-tighter">
                                                            {t.amount.toLocaleString('fr-FR')} F
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold uppercase tracking-widest">
                                                    <span>{t.date ? new Date(t.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Date inconnue'}</span>
                                                    {showAll && t.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={async () => {
                                                                    const { updateInvestorTransactionStatus } = await import('./investor-actions')
                                                                    await updateInvestorTransactionStatus(t.id, 'rejected')
                                                                }}
                                                                className="text-red-500 hover:text-white transition-colors"
                                                            >
                                                                Rejeter
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    const { updateInvestorTransactionStatus } = await import('./investor-actions')
                                                                    await updateInvestorTransactionStatus(t.id, 'approved')
                                                                }}
                                                                className="text-emerald-500 hover:text-white transition-colors"
                                                            >
                                                                Approuver
                                                            </button>
                                                        </div>
                                                    )}
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
                debt={shareholdersWithBalance.find(s => s.name === selectedName)?.totalDebt || 0}
                onSuccess={handleTransaction}
            />
        </div>
    )
}
