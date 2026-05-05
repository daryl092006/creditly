'use client'

import { useState } from 'react'
import { Time } from '@carbon/icons-react'
import { extendLoan } from './actions'
import { useRouter } from 'next/navigation'

interface ExtensionButtonProps {
    loanId: string;
    isExtended: boolean;
    status: string;
    hasOverdue: boolean;
    extensionFee: number;
}

export default function ExtensionButton({ loanId, isExtended, status, hasOverdue, extensionFee }: ExtensionButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)

    if (isExtended || (status !== 'active' && status !== 'approved')) return null

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmitExtension = async () => {
        if (!file) {
            alert("Veuillez sélectionner une preuve de paiement.")
            return
        }

        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('loanId', loanId)
            formData.append('amount', extensionFee.toString())
            formData.append('proof', file)
            formData.append('isExtension', 'true') // Flag pour identifier la demande

            const result = await submitRepayment(formData)

            if (result?.error) {
                alert(result.error)
            } else {
                alert("Votre demande de prolongation a été envoyée. Elle sera effective dès que l'administrateur aura validé votre paiement de " + extensionFee + "F.")
                setShowModal(false)
                setFile(null)
                router.refresh()
            }
        } catch (err) {
            alert("Erreur lors de l'envoi de la demande.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    loading 
                    ? 'bg-purple-600/20 text-purple-400 animate-pulse cursor-not-allowed' 
                    : 'bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white shadow-lg shadow-purple-600/5'
                }`}
            >
                <Time size={16} />
                Prolonger (+5j)
            </button>

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6">
                        <div className="space-y-2 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center mx-auto mb-4">
                                <Time size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Prolonger mon prêt</h3>
                            <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                Pour repousser votre échéance de <span className="text-white">5 jours</span>, vous devez régler les frais de <span className="text-purple-400 font-black">{extensionFee.toLocaleString('fr-FR')} F</span>.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Instructions de paiement</p>
                                <p className="text-[11px] text-slate-300 font-bold italic leading-relaxed">
                                    Veuillez effectuer le transfert sur l'un de nos numéros officiels et joindre la capture d'écran ci-dessous.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Capture d'écran du paiement</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-xs text-slate-400 font-bold italic focus:border-purple-500/50 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all italic"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmitExtension}
                                disabled={submitting || !file}
                                className={`flex-2 px-8 py-4 rounded-2xl bg-purple-600 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 italic disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {submitting ? 'Envoi...' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
