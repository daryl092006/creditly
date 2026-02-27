'use client'
import React, { useState } from 'react'

import { activateSubscription, rejectSubscription } from '@/app/admin/actions'
import ConfirmModal from '@/app/components/ui/ConfirmModal'
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal'
import { Calendar, User, Identification, Checkmark, Close, View } from '@carbon/icons-react'
import { useRouter } from 'next/navigation'

interface Subscription {
    id: string
    user_id: string
    plan_id: string
    amount_paid: number
    proof_url: string
    created_at: string
    is_active: boolean
    status: 'pending' | 'active' | 'rejected' | 'expired'
    start_date?: string
    end_date?: string
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
    reviewer?: {
        nom: string
        prenom: string
        role: string
    }
}

export default function SubscriptionTable({ rows }: { rows: Subscription[] }) {
    const router = useRouter()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [confirmSub, setConfirmSub] = useState<Subscription | null>(null)
    const [rejectSub, setRejectSub] = useState<Subscription | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorAction, setErrorAction] = useState<{ title: string, message: string } | null>(null)
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'expired' | 'rejected'>('all')

    const filteredRows = rows.filter(sub => {
        const isExpired = (sub.status === 'active' && sub.end_date && new Date(sub.end_date) < new Date()) || sub.status === 'expired';
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return sub.status === 'pending';
        if (statusFilter === 'active') return sub.status === 'active' && !isExpired;
        if (statusFilter === 'expired') return isExpired;
        if (statusFilter === 'rejected') return sub.status === 'rejected';
        return true;
    });

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
            router.refresh()
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
            router.refresh()
        }
        setIsProcessing(false)
    }

    return (
        <div className="relative animate-fade-in">
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-8 bg-slate-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
                {[
                    { id: 'all', label: 'Tout', count: rows.length },
                    { id: 'pending', label: 'En attente', count: rows.filter(r => r.status === 'pending').length },
                    { id: 'active', label: 'Actifs', count: rows.filter(r => r.status === 'active' && (!r.end_date || new Date(r.end_date) >= new Date())).length },
                    { id: 'expired', label: 'Expirés', count: rows.filter(r => (r.status === 'active' && r.end_date && new Date(r.end_date) < new Date()) || r.status === 'expired').length },
                    { id: 'rejected', label: 'Refusés', count: rows.filter(r => r.status === 'rejected').length },
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id as any)}
                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${statusFilter === f.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                            : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                            }`}
                    >
                        {f.label}
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${statusFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {f.count}
                        </span>
                    </button>
                ))}
            </div>

            {filteredRows.length === 0 ? (
                <div className="glass-panel p-20 text-center bg-slate-900/50 border-slate-800">
                    <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Identification size={40} className="text-slate-700" />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Aucun abonnement trouvé</h3>
                    <p className="text-slate-500 font-bold italic mt-2">La liste est actuellement vide.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden xl:block">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/50 border-b border-white/5">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidat</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Offre</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Versements</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Échéance</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Preuve</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Traité Par</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredRows.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <p className="font-black text-white leading-tight italic">{sub.user.prenom} {sub.user.nom}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 tracking-tight lowercase">{sub.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-500/20 italic">
                                                {sub.plan.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Déclaré / Attendu</p>
                                                <div className="flex items-baseline gap-1">
                                                    <p className="font-black text-white text-lg tracking-tighter italic">
                                                        {sub.amount_paid?.toLocaleString()}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-slate-500 tracking-tighter italic">
                                                        / {sub.plan.price.toLocaleString()} F
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            {sub.status === 'active' && sub.end_date ? (
                                                <div className="flex flex-col">
                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic leading-none mb-1">Expire le</p>
                                                    <p className="text-sm font-black text-white italic">{new Date(sub.end_date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600 italic font-black uppercase tracking-widest opacity-30">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-6">
                                            <button
                                                onClick={() => setPreviewUrl(getFullUrl(sub.proof_url))}
                                                className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-600 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all shadow-lg active:scale-95 group/btn"
                                            >
                                                <View size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-6">
                                            {sub.user.whatsapp ? (
                                                <a
                                                    href={`https://wa.me/${sub.user.whatsapp.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95 shrink-0"
                                                >
                                                    <svg className="w-4 h-4 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                    <span className="text-[9px] font-black uppercase tracking-tight leading-none">WhatsApp</span>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-700 italic opacity-50">
                                                    <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Non renseigné</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 font-bold">
                                            {sub.reviewer ? (
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 group-hover:text-white transition-colors">{sub.reviewer.prenom} {sub.reviewer.nom}</span>
                                                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">{sub.reviewer.role}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">En attente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                {sub.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => setConfirmSub(sub)}
                                                            className="h-10 px-6 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                                        >
                                                            <span>Activer</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectSub(sub)}
                                                            className="h-10 w-10 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-transparent transition-all active:scale-95"
                                                        >
                                                            <Close size={20} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    (() => {
                                                        const isExpired = sub.status === 'active' && sub.end_date && new Date(sub.end_date) < new Date();
                                                        const displayStatus = isExpired ? 'expired' : sub.status;

                                                        return (
                                                            <span className={`text-[10px] font-black uppercase tracking-widest italic px-3 py-1 rounded-lg border ${displayStatus === 'active' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                displayStatus === 'expired' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
                                                                    displayStatus === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                        'bg-slate-800 text-slate-500 border-slate-700'
                                                                }`}>
                                                                {displayStatus === 'active' ? 'Activé' :
                                                                    displayStatus === 'expired' ? 'Expiré' :
                                                                        displayStatus === 'rejected' ? 'Refusé' :
                                                                            displayStatus}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="space-y-4 xl:hidden">
                        {filteredRows.map((sub) => (
                            <div key={sub.id} className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-black text-white text-lg uppercase italic leading-tight tracking-tighter">{sub.user.prenom} {sub.user.nom}</p>
                                        <p className="text-[10px] font-bold text-slate-500 lowercase leading-none">{sub.user.email}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest italic border border-blue-500/10">
                                        {sub.plan.name}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Paiement Déclaré</p>
                                        <p className="font-black text-white text-2xl tracking-tighter italic leading-none">
                                            {sub.amount_paid?.toLocaleString() || '0'} <span className="text-[10px] not-italic text-slate-600 tracking-normal uppercase">FCFA</span>
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Paiement Attendu</p>
                                        <p className="font-black text-slate-400 text-xl tracking-tighter italic leading-none">
                                            {sub.plan.price.toLocaleString()} <span className="text-[10px] not-italic text-slate-700 tracking-normal uppercase">FCFA</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                    <div className="flex gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Date demande</p>
                                            <p className="text-xs font-bold text-slate-400 italic">{new Date(sub.created_at).toLocaleDateString()}</p>
                                        </div>
                                        {sub.status === 'active' && sub.end_date && (
                                            <div className="space-y-1 px-4 border-l border-white/5">
                                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic leading-none">Échéance</p>
                                                <p className="text-xs font-black text-emerald-400 italic">{new Date(sub.end_date).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPreviewUrl(getFullUrl(sub.proof_url))}
                                            className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 shadow-lg"
                                        >
                                            <View size={24} />
                                        </button>
                                        {sub.user.whatsapp && (
                                            <a href={`https://wa.me/${sub.user.whatsapp.replace(/\D/g, '')}`} className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {sub.reviewer && (
                                    <div className="pt-6 border-t border-white/5">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none mb-2">Traité par</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-300 italic leading-none">{sub.reviewer.prenom} {sub.reviewer.nom}</p>
                                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">{sub.reviewer.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-6 border-t border-white/5">
                                    {sub.status === 'pending' ? (
                                        <>
                                            <button onClick={() => setConfirmSub(sub)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95">
                                                Activer
                                            </button>
                                            <button onClick={() => setRejectSub(sub)} className="w-16 h-16 bg-slate-800 text-red-500 rounded-2xl border border-white/5 flex items-center justify-center active:scale-95">
                                                <Close size={24} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic leading-none">
                                                {(() => {
                                                    const isExpired = sub.status === 'active' && sub.end_date && new Date(sub.end_date) < new Date();
                                                    if (isExpired) return 'Abonnement Expiré';
                                                    if (sub.status === 'active') return 'Abonnement Actif';
                                                    if (sub.status === 'rejected') return 'Paiement Refusé';
                                                    return sub.status;
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Image Preview Modal */}
            <DocumentPreviewModal
                isOpen={!!previewUrl}
                onClose={() => setPreviewUrl(null)}
                url={previewUrl}
                type="image"
                title="Preuve de Paiement"
            />

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmSub}
                onClose={() => setConfirmSub(null)}
                onConfirm={handleActivate}
                title="Activer l'Abonnement ?"
                message={confirmSub ? `Voulez-vous confirmer le paiement de ${(confirmSub.amount_paid || 0).toLocaleString()} FCFA et activer l'abonnement "${confirmSub.plan.name}" pour ${confirmSub.user.prenom} ${confirmSub.user.nom} ?` : ""}
                confirmText="Confirmer & Activer"
                variant="success"
                isLoading={isProcessing}
            />

            {/* Rejection Modal */}
            <ConfirmModal
                isOpen={!!rejectSub}
                onClose={() => setRejectSub(null)}
                onConfirm={handleReject}
                title="Refuser le Paiement ?"
                message={rejectSub ? `Indiquez la raison du refus pour ${rejectSub.user.prenom} ${rejectSub.user.nom}. Ce motif sera visible par l'utilisateur.` : ""}
                confirmText="Confirmer le Refus"
                variant="danger"
                isLoading={isProcessing}
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
