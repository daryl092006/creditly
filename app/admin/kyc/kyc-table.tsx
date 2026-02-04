'use client'

import React, { useState } from 'react'
import { updateKycStatus, activateUserAccount, deactivateUserAccount, getSignedProofUrl } from '../actions'
import { createClient } from '@/utils/supabase/client'
import ConfirmModal from '@/app/components/ui/ConfirmModal'
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal'

export default function AdminKycClientTable({ submissions }: {
    submissions: Array<{
        id: string;
        user_id: string;
        name: string;
        email: string;
        whatsapp?: string;
        date: string;
        docs: Array<{ url: string; type: string }>
    }>
}) {
    const [loading, setLoading] = useState<string | null>(null)
    const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string; name: string } | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string, userId?: string, status: 'approved' | 'rejected' } | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [errorAction, setErrorAction] = useState<{ title: string, message: string } | null>(null)
    const supabase = createClient()

    const handleAction = async () => {
        if (!confirmAction) return
        const { id, userId, status } = confirmAction

        if (status === 'rejected' && !rejectionReason) return

        setLoading(id)

        try {
            let result: any = { success: true }

            if (status === 'approved' && userId) {
                // Step 1: Update KYC Status
                const kycRes = await updateKycStatus(id, 'approved')
                if (kycRes?.error) {
                    result = kycRes
                } else {
                    // Step 2: Activate Account
                    const actRes = await activateUserAccount(userId)
                    if (actRes?.error) result = actRes
                }
            } else if (status === 'rejected') {
                // STRICT DEACTIVATION ON REJECTION
                if (userId) {
                    await deactivateUserAccount(userId)
                }
                result = await updateKycStatus(id, 'rejected', rejectionReason)
            }

            if (result?.error) {
                setErrorAction({
                    title: "Erreur de Dossier",
                    message: typeof result.error === 'string' ? result.error : JSON.stringify(result.error)
                })
                setLoading(null)
            } else {
                // Give a small delay for DB consistency before reload
                setTimeout(() => {
                    window.location.reload()
                }, 500)
            }
        } catch (err) {
            console.error("KYC Action Error:", err)
            setErrorAction({
                title: "Erreur Critique",
                message: "Une erreur inattendue est survenue lors de la validation."
            })
            setLoading(null)
        }
    }

    const handlePreview = async (path: string, type: string, name: string) => {
        const res = await getSignedProofUrl(path, 'kyc-documents')
        if (res.url) {
            setPreviewDoc({ url: res.url, type, name })
        } else {
            alert("Impossible d'ouvrir le document.")
        }
    }

    return (
        <div className="relative">
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden xl:block">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-white/5">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidat</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date Soumission</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documents</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Décision</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-bold">
                        {submissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6">
                                    <p className="text-white text-lg tracking-tight font-black">{sub.name}</p>
                                    <p className="text-slate-500 text-xs font-bold leading-tight">{sub.email}</p>
                                </td>
                                <td className="px-8 py-6 text-slate-400 font-bold text-sm italic">
                                    {new Date(sub.date).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-6">
                                    {sub.whatsapp ? (
                                        <a
                                            href={`https://wa.me/${sub.whatsapp.replace(/\D/g, '')}`}
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
                                    <div className="flex gap-2">
                                        {sub.docs.map((doc, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handlePreview(doc.url, doc.type, sub.name)}
                                                className="px-3 py-2 bg-slate-800 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-blue-500/50 hover:text-white hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
                                            >
                                                {doc.type.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center gap-3">
                                        <button
                                            disabled={loading === sub.id}
                                            onClick={() => setConfirmAction({ id: sub.id, userId: sub.user_id, status: 'approved' })}
                                            className="h-12 px-6 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            Approuver
                                        </button>
                                        <button
                                            disabled={loading === sub.id}
                                            onClick={() => setConfirmAction({ id: sub.id, status: 'rejected' })}
                                            className="h-12 w-12 bg-slate-800 text-slate-400 rounded-2xl border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-4 xl:hidden">
                {submissions.map((sub) => (
                    <div key={sub.id} className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white text-lg font-black italic tracking-tighter uppercase">{sub.name}</p>
                                <p className="text-[10px] font-bold text-slate-500 lowercase">{sub.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Documents de vérification</p>
                            <div className="flex flex-wrap gap-2">
                                {sub.docs.map((doc, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handlePreview(doc.url, doc.type, sub.name)}
                                        className="px-4 py-3 bg-slate-800 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300"
                                    >
                                        {doc.type.split('_')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-white/5">
                            <button
                                onClick={() => setConfirmAction({ id: sub.id, userId: sub.user_id, status: 'approved' })}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest"
                            >
                                Approuver
                            </button>
                            <button
                                onClick={() => setConfirmAction({ id: sub.id, status: 'rejected' })}
                                className="w-16 h-16 bg-slate-800 text-red-500 rounded-2xl border border-white/5 flex items-center justify-center"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                url={previewDoc?.url || null}
                type={previewDoc?.type || 'image'}
                title={previewDoc?.type.replace(/_/g, ' ') || 'Document'}
                subtitle={previewDoc?.name}
            />

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => {
                    setConfirmAction(null)
                    setRejectionReason('')
                }}
                onConfirm={handleAction}
                title={confirmAction?.status === 'approved' ? 'Approuver le dossier ?' : 'Rejeter le dossier ?'}
                message={confirmAction?.status === 'approved'
                    ? "Voulez-vous valider ce dossier et ACTIVER ce compte client ? L'utilisateur aura accès à ses privilèges."
                    : "Veuillez indiquer le motif du rejet :"}
                confirmText={confirmAction?.status === 'approved' ? 'Approuver & Activer' : 'Confirmer Rejet'}
                variant={confirmAction?.status === 'approved' ? 'success' : 'danger'}
                isLoading={loading === confirmAction?.id}
            >
                {confirmAction?.status === 'rejected' && (
                    <div className="w-full mt-4">
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Document illisible, informations incorrectes..."
                            className="w-full h-32 p-4 bg-black/40 border border-white/10 rounded-2xl text-white text-xs font-bold italic focus:border-red-500/50 outline-none transition-all placeholder:text-slate-700 resize-none"
                        />
                    </div>
                )}
            </ConfirmModal>

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
