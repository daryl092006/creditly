'use client'

import React, { useState } from 'react'
import { activateSubscription, rejectSubscription } from '@/app/admin/actions'
import ConfirmModal from '@/app/components/ui/ConfirmModal'
import { Rocket, Flash, Star, User, Calendar, Money, Image, CheckmarkFilled, InformationFilled, Misuse } from '@carbon/icons-react'

interface Subscription {
    id: string
    user_id: string
    plan_id: string
    amount_paid: number
    proof_url: string
    created_at: string
    is_active: boolean
    plan: {
        name: string
        price: number
    }
    user: {
        nom: string
        prenom: string
        email: string
        whatsapp?: string
    }
}

export default function SubscriptionTable({ rows }: { rows: Subscription[] }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [confirmSub, setConfirmSub] = useState<Subscription | null>(null)
    const [rejectSub, setRejectSub] = useState<Subscription | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorAction, setErrorAction] = useState<{ title: string, message: string } | null>(null)

    const getFullUrl = (path: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        return `${baseUrl}/storage/v1/object/public/repayment-proofs/${path}`
    }

    const handleActivate = async () => {
        if (!confirmSub) return
        setIsProcessing(true)
        const result = await activateSubscription(confirmSub.id)
        if (result?.error) {
            setErrorAction({
                title: "Erreur d'Activation",
                message: result.error
            })
        } else {
            setConfirmSub(null)
        }
        setIsProcessing(false)
    }

    const handleReject = async () => {
        if (!rejectSub || !rejectionReason.trim()) return
        setIsProcessing(true)
        const result = await rejectSubscription(rejectSub.id, rejectionReason)
        if (result?.error) {
            setErrorAction({
                title: "Erreur de Refus",
                message: result.error
            })
        } else {
            setRejectSub(null)
            setRejectionReason('')
        }
        setIsProcessing(false)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {rows.length === 0 ? (
                <div className="glass-panel p-20 text-center bg-slate-900/50 border-slate-800">
                    <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckmarkFilled size={40} className="text-slate-700" />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Aucune demande en attente</h3>
                    <p className="text-slate-500 font-bold italic mt-2">Tous les paiements ont été traités.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {rows.map((sub) => (
                        <div key={sub.id} className="glass-panel p-6 flex flex-col lg:flex-row items-center justify-between gap-8 bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all group">

                            {/* User & Plan Info */}
                            <div className="flex items-center gap-6 flex-1 w-full lg:w-auto">
                                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform shadow-xl">
                                    <User size={32} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                                        <h4 className="text-xl font-black text-white italic tracking-tighter tabular-nums leading-none">
                                            {sub.user.prenom} {sub.user.nom}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20 italic">
                                                Plan {sub.plan.name}
                                            </span>
                                            {sub.user.whatsapp && (
                                                <a
                                                    href={`https://wa.me/${sub.user.whatsapp.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-7 h-7 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 italic flex items-center gap-2">
                                        <Calendar size={12} />
                                        Demandé le {new Date(sub.created_at).toLocaleDateString()} – {sub.user.email}
                                    </p>
                                </div>
                            </div>

                            {/* Payment Comparison */}
                            <div className="flex items-center gap-8 w-full lg:w-auto overflow-x-auto lg:overflow-visible py-2 no-scrollbar">
                                <div className="space-y-1 shrink-0">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Attendu</p>
                                    <p className="text-xl font-black text-slate-300 italic tracking-tighter leading-none">
                                        {sub.plan.price.toLocaleString()} F
                                    </p>
                                </div>
                                <div className="space-y-1 shrink-0 px-6 border-x border-white/5">
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic leading-none">Déclaré</p>
                                    <p className="text-2xl font-black text-blue-400 italic tracking-tighter leading-none tabular-nums">
                                        {sub.amount_paid?.toLocaleString() || '0'} F
                                    </p>
                                </div>

                                {/* Proof Preview Button */}
                                <div className="shrink-0">
                                    <button
                                        onClick={() => setPreviewUrl(getFullUrl(sub.proof_url))}
                                        className="w-12 h-12 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-600 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all shadow-xl group/proof"
                                    >
                                        <Image size={24} className="group-hover/proof:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 w-full lg:w-auto pt-4 lg:pt-0 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setRejectSub(sub)}
                                    className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 group/reject"
                                >
                                    <Misuse size={20} className="group-hover/reject:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Refuser</span>
                                </button>
                                <button
                                    onClick={() => setConfirmSub(sub)}
                                    className="premium-button w-full lg:w-auto py-4 px-10 active:scale-95 shadow-2xl flex items-center justify-center gap-2"
                                >
                                    <CheckmarkFilled size={20} />
                                    <span>Activer</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPreviewUrl(null)}></div>
                    <div className="glass-panel w-full max-w-4xl max-h-full overflow-hidden flex flex-col relative z-20 animate-slide-up bg-slate-900/90 border-slate-800">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                <InformationFilled size={24} className="text-blue-500" />
                                Preuve de Paiement
                            </h3>
                            <button onClick={() => setPreviewUrl(null)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-black/40 p-8 flex items-center justify-center min-h-[400px]">
                            <img src={previewUrl} alt="Preuve" className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/5" />
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-4">
                            <a href={previewUrl} download target="_blank" className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-colors active:scale-95">
                                Télécharger
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmSub && (
                <ConfirmModal
                    isOpen={!!confirmSub}
                    onClose={() => setConfirmSub(null)}
                    onConfirm={handleActivate}
                    title="Activer l'Abonnement ?"
                    message={`Voulez-vous confirmer le paiement de ${(confirmSub.amount_paid || 0).toLocaleString()} FCFA et activer l'abonnement "${confirmSub.plan.name}" pour ${confirmSub.user.prenom} ${confirmSub.user.nom} ?`}
                    confirmText="Confirmer & Activer"
                    variant="success"
                    isLoading={isProcessing}
                />
            )}

            {/* Rejection Modal */}
            {rejectSub && (
                <ConfirmModal
                    isOpen={!!rejectSub}
                    onClose={() => setRejectSub(null)}
                    onConfirm={handleReject}
                    title="Refuser le Paiement ?"
                    message={`Indiquez la raison du refus pour ${rejectSub.user.prenom} ${rejectSub.user.nom}. Ce motif sera visible par l'utilisateur.`}
                    confirmText="Confirmer le Refus"
                    variant="danger"
                    isLoading={isProcessing}
                    disabled={!rejectionReason.trim()}
                >
                    <div className="mt-6">
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Image illisible, Montant incorrect..."
                            className="w-full h-32 bg-slate-950 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:border-red-500/50 outline-none transition-all resize-none font-bold italic"
                        />
                    </div>
                </ConfirmModal>
            )}

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
