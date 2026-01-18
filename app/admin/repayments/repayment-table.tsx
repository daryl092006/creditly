'use client'

import React, { useState } from 'react'
import { updateRepaymentStatus } from '../actions'
import ConfirmModal from '@/app/components/ui/ConfirmModal'

export default function AdminRepaymentTable({
    rows
}: {
    rows: Array<{
        id: string;
        user: string;
        loan_amount: number;
        loan_amount_paid: number;
        amount: number;
        proof_url: string;
        date: string;
        status: string;
        whatsapp?: string;
        admin: { name: string; role: string; whatsapp?: string } | null
    }>
}) {
    const [loading, setLoading] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string, status: 'verified' | 'rejected' } | null>(null)
    const [errorAction, setErrorAction] = useState<{ title: string, message: string } | null>(null)

    const handleAction = async () => {
        if (!confirmAction) return
        const { id, status } = confirmAction
        setLoading(id)

        const result = await updateRepaymentStatus(id, status)

        if (result?.error) {
            setErrorAction({
                title: status === 'verified' ? "Erreur de Validation" : "Erreur de Rejet",
                message: result.error
            })
            setLoading(null)
        } else {
            setConfirmAction(null)
            window.location.reload()
        }
    }

    const getFullUrl = (path: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        return `${baseUrl}/storage/v1/object/public/repayment-proofs/${path}`
    }

    return (
        <div className="relative">
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden xl:block">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-white/5">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Montant Déclaré</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contexte Prêt</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Preuve</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Validé Par</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <p className="font-black text-white leading-tight">{row.user.split('(')[0]}</p>
                                            <p className="text-[10px] font-bold text-slate-500 tracking-tight lowercase">{row.user.split('(')[1]?.replace(')', '')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="font-black text-emerald-400 text-lg tracking-tighter italic">{row.amount.toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white italic tracking-tighter">Prêt : {row.loan_amount.toLocaleString()} F</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden w-24">
                                                <div
                                                    className="h-full bg-blue-500 transition-all"
                                                    style={{ width: `${Math.min((row.loan_amount_paid / row.loan_amount) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[8px] font-black text-blue-400 italic">{(row.loan_amount_paid / row.loan_amount * 100).toFixed(0)}%</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                            Reste : <span className="text-emerald-500">{(row.loan_amount - row.loan_amount_paid).toLocaleString()} F</span>
                                        </p>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <button
                                        onClick={() => setPreviewUrl(getFullUrl(row.proof_url))}
                                        className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest italic border border-white/5 hover:border-blue-500/30 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        Voir
                                    </button>
                                </td>
                                <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                                    {new Date(row.date).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-6">
                                    {row.admin ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-300 group-hover:text-white transition-colors">{row.admin.name}</span>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{row.admin.role}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-600 italic">En attente / Système</span>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    {row.whatsapp ? (
                                        <a
                                            href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95"
                                        >
                                            <svg className="w-4 h-4 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-700 italic">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Non renseigné</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        {row.status === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => setConfirmAction({ id: row.id, status: 'verified' })}
                                                    disabled={loading === row.id}
                                                    className="h-10 px-6 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                                                >
                                                    Valider
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ id: row.id, status: 'rejected' })}
                                                    disabled={loading === row.id}
                                                    className="h-10 px-6 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-transparent transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    Rejeter
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-widest italic px-3 py-1 rounded-lg border ${row.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                row.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-slate-800 text-slate-500 border-slate-700'
                                                }`}>
                                                {row.status === 'verified' ? 'Validé' :
                                                    row.status === 'rejected' ? 'Rejeté' :
                                                        row.status}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-4 xl:hidden">
                {rows.map((row) => (
                    <div key={row.id} className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-black text-white text-lg uppercase italic leading-tight">{row.user.split('(')[0]}</p>
                                <p className="text-[10px] font-bold text-slate-500 lowercase">{row.user.split('(')[1]?.replace(')', '')}</p>
                            </div>
                            <button
                                onClick={() => setPreviewUrl(getFullUrl(row.proof_url))}
                                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Montant à valider</p>
                            <p className="font-black text-emerald-400 text-2xl tracking-tighter italic leading-none">{row.amount.toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-end">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Progression Prêt</p>
                                <span className="text-[10px] font-black text-blue-400 italic">{(row.loan_amount_paid / row.loan_amount * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${Math.min((row.loan_amount_paid / row.loan_amount) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reste à payer : <span className="text-emerald-500">{(row.loan_amount - row.loan_amount_paid).toLocaleString()} F</span></p>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-white/5">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Date transaction</p>
                                <p className="text-xs font-bold text-slate-400">{new Date(row.date).toLocaleDateString()}</p>
                            </div>
                            {row.whatsapp && (
                                <a href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`} className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                </a>
                            )}
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-white/5">
                            {row.status === 'pending' ? (
                                <>
                                    <button onClick={() => setConfirmAction({ id: row.id, status: 'verified' })} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                        Valider
                                    </button>
                                    <button onClick={() => setConfirmAction({ id: row.id, status: 'rejected' })} className="w-16 h-16 bg-slate-800 text-red-500 rounded-2xl border border-white/5 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </>
                            ) : (
                                <div className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Statut : {row.status === 'verified' ? 'Payé' : row.status}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPreviewUrl(null)}></div>
                    <div className="glass-panel w-full max-w-4xl max-h-full overflow-hidden flex flex-col relative z-10 animate-slide-up bg-slate-900 border-slate-800">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Preuve de paiement</h3>
                            <button onClick={() => setPreviewUrl(null)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-black/40 p-4 flex items-center justify-center">
                            <img src={previewUrl} alt="Preuve" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl" />
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-4">
                            <a href={previewUrl} download target="_blank" className="px-6 py-3 bg-white text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors">
                                Télécharger
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleAction}
                title={confirmAction?.status === 'verified' ? 'Valider le paiement ?' : 'Rejeter le paiement ?'}
                message={confirmAction?.status === 'verified'
                    ? "Souhaitez-vous confirmer la réception de ce paiement ? Cette action mettra à jour le solde du prêt."
                    : "Êtes-vous sûr de vouloir rejeter cette preuve de paiement ?"}
                confirmText={confirmAction?.status === 'verified' ? 'Valider' : 'Rejeter'}
                variant={confirmAction?.status === 'verified' ? 'success' : 'danger'}
                isLoading={loading === confirmAction?.id}
            />

            {/* Error Feedback Modal */}
            <ConfirmModal
                isOpen={!!errorAction}
                onClose={() => setErrorAction(null)}
                onConfirm={() => setErrorAction(null)}
                title={errorAction?.title || "Action Impossible"}
                message={errorAction?.message || ""}
                confirmText="Fermer"
                cancelText="OK"
                variant="danger"
            />
        </div>
    )
}
