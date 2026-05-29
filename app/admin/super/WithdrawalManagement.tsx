'use client'

import { useState } from 'react'
import { CheckmarkFilled, CloseFilled, Wallet, Time } from '@carbon/icons-react'
import { updateWithdrawalStatus } from '../actions'

export function AdminWithdrawalsManagement({ initialWithdrawals }: { initialWithdrawals: any[] }) {
    const [withdrawals, setWithdrawals] = useState(initialWithdrawals)
    const [processingId, setProcessingId] = useState<string | null>(null)

    async function handleAction(id: string, status: 'approved' | 'rejected') {
        const confirmMsg = status === 'approved'
            ? "Confirmez-vous le paiement effectif de ce montant à l'administrateur ?"
            : "Voulez-vous rejeter cette demande de retrait ?"

        if (!confirm(confirmMsg)) return

        setProcessingId(id)
        const res = await updateWithdrawalStatus(id, status)
        if (res.error) {
            alert(res.error)
        } else {
            setWithdrawals(prev => prev.filter(w => w.id !== id))
        }
        setProcessingId(null)
    }

    if (!withdrawals || withdrawals.length === 0) return (
        <div className="glass-panel p-12 text-center bg-slate-900/50 border-slate-800">
            <div className="w-16 h-16 bg-slate-950/50 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                <Wallet size={32} />
            </div>
            <p className="text-xs font-black text-slate-600 uppercase italic tracking-widest">Aucune demande de retrait en attente</p>
        </div>
    )

    return (
        <section className="space-y-6">
            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-xs font-black shadow-inner">W</span>
                Demandes de Retrait Admin ({withdrawals.length})
            </h3>

            <div className="grid grid-cols-1 gap-4">
                {withdrawals.map((w) => (
                    <div key={w.id} className="relative group/w">
                        {/* Subtle hover glow */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 rounded-3xl blur opacity-0 group-hover/w:opacity-100 transition-opacity" />

                        <div className="relative glass-panel bg-slate-900/40 border-white/5 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 overflow-hidden">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                    <Wallet size={24} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <p className="text-lg font-black text-white italic tracking-tight uppercase leading-none">{w.admin?.prenom} {w.admin?.nom}</p>
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest italic">
                                            {w.admin?.roles?.[0]?.replace('admin_', '')}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2 italic">
                                        <span className="text-white opacity-80 uppercase tracking-wider">{w.method}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span className="font-mono text-slate-500 tracking-tighter">{w.payment_details}</span>
                                    </p>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">
                                        <Time size={10} /> {new Date(w.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-10 border-t lg:border-t-0 border-white/5 pt-4 lg:pt-0">
                                <div className="text-left lg:text-right">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1 leading-none">Montant Demandé</p>
                                    <p className="text-3xl font-black text-white italic tracking-tighter">
                                        {w.amount.toLocaleString('fr-FR')} <span className="text-sm opacity-50 not-italic">F</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={processingId === w.id}
                                        onClick={() => handleAction(w.id, 'rejected')}
                                        className="w-12 h-12 rounded-2xl bg-slate-800/50 text-slate-500 border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all active:scale-90"
                                    >
                                        <CloseFilled size={20} />
                                    </button>
                                    <button
                                        disabled={processingId === w.id}
                                        onClick={() => handleAction(w.id, 'approved')}
                                        className="h-12 px-6 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 italic"
                                    >
                                        <CheckmarkFilled size={16} />
                                        {processingId === w.id ? 'Traitement...' : 'Approuver'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
