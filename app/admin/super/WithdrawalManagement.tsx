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

            <div className="glass-panel overflow-x-auto bg-slate-900/50 border-slate-800">
                <table className="w-full text-left min-w-[600px]">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Administrateur</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Montant</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase italic">Méthode & Détails</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-600 uppercase italic">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {withdrawals.map((w) => (
                            <tr key={w.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <p className="text-sm font-black text-white italic uppercase tracking-tight">{w.admin?.prenom} {w.admin?.nom}</p>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{w.admin?.roles?.[0]?.replace('admin_', '')}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <p className="text-xl font-black text-blue-500 italic tracking-tighter">{w.amount.toLocaleString('fr-FR')} F</p>
                                        <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1 uppercase italic">
                                            <Time size={10} /> {new Date(w.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black text-white uppercase italic tracking-widest">{w.method}</p>
                                        <p className="text-[11px] font-bold text-slate-400 font-mono tracking-widest">{w.payment_details}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            disabled={processingId === w.id}
                                            onClick={() => handleAction(w.id, 'rejected')}
                                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/10"
                                        >
                                            <CloseFilled size={20} />
                                        </button>
                                        <button
                                            disabled={processingId === w.id}
                                            onClick={() => handleAction(w.id, 'approved')}
                                            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase italic tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <CheckmarkFilled size={16} />
                                            {processingId === w.id ? '...' : 'Valider'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
