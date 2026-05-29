'use client'

import React, { useState } from 'react'
import { updateRepaymentStatus, getSignedProofUrl, deleteRepayment } from '../actions'
import ConfirmModal from '@/app/components/ui/ConfirmModal'
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal'
import { useRouter } from 'next/navigation'
import DoubleValidationModal from '@/app/components/admin/DoubleValidationModal'
import Link from 'next/link'

export default function AdminRepaymentTable({
    rows
}: {
    rows: Array<{
        id: string;
        user: string;
        loan_id: string;
        user_id: string;
        loan_initial_total: number;
        loan_total_due: number;
        loan_amount_paid: number;
        amount_declared: number;
        proof_url: string;
        date: string;
        status: string;
        whatsapp?: string;
        requires_double_validation?: boolean;
        first_validated_by?: string;
        admin: { name: string; role: string; whatsapp?: string } | null
    }>
}) {
    const [loading, setLoading] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ url: string, type: 'image' | 'pdf' } | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string, status: 'verified' | 'rejected' } | null>(null)
    const [doubleConfirm, setDoubleConfirm] = useState<{ id: string, admin_first?: string } | null>(null)
    const [doubleConfirmProofUrl, setDoubleConfirmProofUrl] = useState<string | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, user: string, status: string } | null>(null)
    const [errorAction, setErrorAction] = useState<{ title: string, message: string } | null>(null)
    const [validationPreview, setValidationPreview] = useState<{
        id: string;
        amount: number;
        loanTotalDue: number;
        loanPaid: number;
        user: string;
        isExtension: boolean;
    } | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const router = useRouter()

    const startValidation = async (id: string, status: 'verified' | 'rejected') => {
        const row = rows.find(r => r.id === id)
        if (!row) return

        if (status === 'verified') {
            setValidationPreview({
                id,
                amount: row.amount_declared,
                loanTotalDue: row.loan_total_due,
                loanPaid: row.loan_amount_paid,
                user: row.user,
                isExtension: row.proof_url?.includes('extension_') || false
            })
        } else {
            setConfirmAction({ id, status })
        }
    }

    const confirmValidationPreview = async () => {
        if (!validationPreview) return
        const { id } = validationPreview

        // Logique de double validation intégrée
        const row = rows.find(r => r.id === id)
        if (row && row.amount_declared >= 50000) {
            setLoading(id)
            const res = await getSignedProofUrl(row.proof_url, 'repayment-proofs')
            setDoubleConfirmProofUrl(res.url || null)
            setDoubleConfirm({ id, admin_first: row.first_validated_by })
            setLoading(null)
            setValidationPreview(null)
            return
        }

        // Sinon validation directe
        setValidationPreview(null)
        setConfirmAction({ id, status: 'verified' })
    }

    const handleAction = async () => {
        if (!confirmAction) return
        const { id, status } = confirmAction
        setLoading(id)
        setIsProcessing(true)

        const result = await updateRepaymentStatus(id, status)

        if (result?.error) {
            setErrorAction({
                title: status === 'verified' ? "Erreur de Validation" : "Erreur de Rejet",
                message: result.error
            })
            setLoading(null)
            setIsProcessing(false)
        } else {
            setConfirmAction(null)
            setIsProcessing(false)
            router.refresh()
        }
    }

    const handleDelete = async () => {
        if (!deleteConfirm) return
        setLoading(deleteConfirm.id)

        const result = await deleteRepayment(deleteConfirm.id)

        if (result?.error) {
            setErrorAction({
                title: "Erreur de suppression",
                message: result.error
            })
            setLoading(null)
        } else {
            setDeleteConfirm(null)
            router.refresh()
        }
    }

    const handlePreview = async (path: string) => {
        const res = await getSignedProofUrl(path, 'repayment-proofs')
        if (res.url) {
            const isPdf = path.toLowerCase().endsWith('.pdf')
            setPreview({ url: res.url, type: isPdf ? 'pdf' : 'image' })
        } else {
            alert("Impossible d'ouvrir le document.")
        }
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
                                            <Link href={`/admin/super/users/${row.user_id}`} className="group/name">
                                                <p className="font-black text-white leading-tight group-hover:text-blue-400 transition-colors uppercase italic">{row.user.split('(')[0]}</p>
                                                <p className="text-[10px] font-bold text-slate-500 tracking-tight group-hover:text-slate-400 transition-colors lowercase tabular-nums">{row.user.split('(')[1]?.replace(')', '')}</p>
                                            </Link>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-2">
                                        <p className="font-black text-emerald-400 text-lg tracking-tighter italic leading-none">{row.amount_declared.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                                        {row.proof_url?.includes('extension_') && (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest border border-purple-500/20 rounded-md">
                                                <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></div>
                                                Prolongation (+5j)
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <Link href={`/admin/loans?q=${row.loan_id}`} className="group/loan block">
                                            <p className="text-[10px] font-black text-white italic tracking-tighter uppercase mb-2 group-hover:text-blue-400 transition-all">Total : {row.loan_initial_total.toLocaleString('fr-FR')} F</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden w-24">
                                                    <div
                                                        className={`h-full transition-all ${row.loan_initial_total <= 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${row.loan_initial_total <= 0 ? 0 : Math.min((row.loan_amount_paid / row.loan_initial_total) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[8px] font-black text-blue-400 italic">
                                                    {row.loan_initial_total <= 0 ? '0%' : ((row.loan_amount_paid / row.loan_initial_total) * 100).toFixed(0) + '%'}
                                                </span>
                                            </div>
                                        </Link>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                Déjà payé : <span className="text-white italic">{row.loan_amount_paid.toLocaleString('fr-FR')} F</span>
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                Reste : <span className="text-emerald-500 italic">{(row.loan_total_due).toLocaleString('fr-FR')} F</span>
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <button
                                        onClick={() => handlePreview(row.proof_url)}
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
                                                    onClick={() => startValidation(row.id, 'verified')}
                                                    disabled={loading === row.id}
                                                    className="h-10 px-6 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                                                >
                                                    Valider
                                                </button>
                                                <button
                                                    onClick={() => startValidation(row.id, 'rejected')}
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
                                        {/* Delete button — always visible */}
                                        <button
                                            onClick={() => setDeleteConfirm({ id: row.id, user: row.user.split('(')[0].trim(), status: row.status })}
                                            disabled={loading === row.id}
                                            title="Supprimer ce remboursement"
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-slate-600 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all active:scale-95"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
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
                                onClick={() => handlePreview(row.proof_url)}
                                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Montant à valider</p>
                            <div className="flex items-center gap-4">
                                <p className="font-black text-emerald-400 text-2xl tracking-tighter italic leading-none">{row.amount_declared.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-600">FCFA</span></p>
                                {row.proof_url?.includes('extension_') && (
                                    <div className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest border border-purple-500/20 rounded-md">
                                        Prolongation
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-end">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Progression Prêt</p>
                                <span className="text-[10px] font-black text-blue-400 italic">
                                    {row.loan_initial_total <= 0 ? '0%' : ((row.loan_amount_paid / row.loan_initial_total) * 100).toFixed(0) + '%'}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${row.loan_initial_total <= 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${row.loan_initial_total <= 0 ? 0 : Math.min((row.loan_amount_paid / row.loan_initial_total) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Reste à payer : <span className="text-emerald-500">{(row.loan_total_due).toLocaleString('fr-FR')} F</span>
                            </p>
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
                                    <button onClick={() => startValidation(row.id, 'verified')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                        Valider
                                    </button>
                                    <button onClick={() => startValidation(row.id, 'rejected')} className="w-16 h-16 bg-slate-800 text-red-500 rounded-2xl border border-white/5 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </>
                            ) : (
                                <div className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Statut : {row.status === 'verified' ? 'Payé' : row.status}</span>
                                </div>
                            )}
                            {/* Delete button — always visible on mobile */}
                            <button
                                onClick={() => setDeleteConfirm({ id: row.id, user: row.user.split('(')[0].trim(), status: row.status })}
                                disabled={loading === row.id}
                                title="Supprimer"
                                className="w-16 h-16 bg-slate-900 border border-white/5 text-slate-600 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview Modal */}
            <DocumentPreviewModal
                isOpen={!!preview}
                onClose={() => setPreview(null)}
                url={preview?.url || null}
                type={preview?.type || 'image'}
                title="Preuve de paiement"
            />
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

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title="Supprimer ce remboursement ?"
                message={`Vous allez supprimer définitivement le remboursement de ${deleteConfirm?.user || ''}.${deleteConfirm?.status === 'verified'
                    ? ' ⚠️ Ce remboursement est VALIDÉ : son montant sera automatiquement déduit du solde payé du prêt correspondant, et la commission associée sera supprimée.'
                    : ''
                    } Cette action est irréversible.`}
                confirmText="Supprimer définitivement"
                variant="danger"
                isLoading={loading === deleteConfirm?.id}
            />

            {/* Double Validation Modal */}
            {doubleConfirm && (
                <DoubleValidationModal
                    isOpen={!!doubleConfirm}
                    onClose={() => setDoubleConfirm(null)}
                    isLoading={!!loading}
                    proofUrl={doubleConfirmProofUrl}
                    repayment={rows.find(r => r.id === doubleConfirm.id)!}
                    onConfirm={async (status) => {
                        setLoading(doubleConfirm.id)
                        const result = await updateRepaymentStatus(doubleConfirm.id, status)
                        if (result?.error) {
                            setErrorAction({ title: "Erreur", message: result.error })
                        } else {
                            setDoubleConfirm(null)
                            router.refresh()
                        }
                        setLoading(null)
                    }}
                />
            )}
            {/* Error Feedback Modal */}
            <ConfirmModal
                isOpen={!!errorAction}
                onClose={() => setErrorAction(null)}
                title={errorAction?.title || "Action Impossible"}
                message={errorAction?.message || ""}
                cancelText="Fermer"
                variant="danger"
            />
            {/* Validation Preview Modal */}
            {validationPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-8 bg-slate-900 border-slate-800 shadow-2xl space-y-8 animate-scale-in">
                        <header className="space-y-2">
                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Prévisualisation Financière</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic text-left">Analyse du remboursement pour {validationPreview.user}</p>
                        </header>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase italic text-left">Montant à Valider</p>
                                    <p className="text-xl font-black text-emerald-400 italic tabular-nums text-left">{validationPreview.amount.toLocaleString('fr-FR')} F</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase italic text-left">Dette Actuelle (Due)</p>
                                    <p className="text-xl font-black text-red-500 italic tabular-nums text-left">{validationPreview.loanTotalDue.toLocaleString('fr-FR')} F</p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Résultat après validation</p>
                                    {validationPreview.amount >= validationPreview.loanTotalDue && !validationPreview.isExtension ? (
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase italic tracking-widest">Solde Complet</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 text-[8px] font-black uppercase italic tracking-widest">Paiement Partiel</span>
                                    )}
                                </div>

                                <div className="flex justify-between items-baseline pt-2">
                                    <p className="text-sm font-bold text-slate-400 italic">Nouveau Reste à Payer :</p>
                                    <p className={`text-2xl font-black italic tabular-nums ${validationPreview.amount >= validationPreview.loanTotalDue ? 'text-emerald-500' : 'text-white'}`}>
                                        {Math.max(0, validationPreview.loanTotalDue - validationPreview.amount).toLocaleString('fr-FR')} FCFA
                                    </p>
                                </div>

                                {validationPreview.amount > (validationPreview.loanTotalDue + 50) && (
                                    <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-orange-500 uppercase italic tracking-widest">Surplus détecté : {(validationPreview.amount - validationPreview.loanTotalDue).toLocaleString('fr-FR')} F</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmValidationPreview}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] italic shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isProcessing ? 'Traitement...' : 'Confirmer & Valider'}
                            </button>
                            <button
                                onClick={() => setValidationPreview(null)}
                                className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest italic hover:text-white transition-colors"
                            >
                                Abandonner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
