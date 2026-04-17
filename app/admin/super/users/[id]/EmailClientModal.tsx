'use client'

import { useState } from 'react'
import { Email, Close } from '@carbon/icons-react'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { sendEmailToClient } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'

export default function EmailClientModal({ userId, userEmail, userName }: { userId: string, userEmail: string, userName: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            setError("L'objet et le message sont requis.")
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(false)

        const res = await sendEmailToClient(userId, subject, message)

        if (res?.error) {
            setError(res.error)
            setLoading(false)
        } else {
            setSuccess(true)
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(false)
                setSubject('')
                setMessage('')
                setLoading(false)
            }, 2000)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-6 py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-500 hover:bg-blue-600 hover:text-white transition-all group"
            >
                <Email size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest italic">Envoyer un email</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Contacter {userName}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{userEmail}</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <Close size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {success ? (
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-center">
                                    <p className="font-bold">Email envoyé avec succès !</p>
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold">
                                            {error}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objet</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Ex: Action requise sur votre dossier"
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            rows={5}
                                            placeholder="Rédigez votre e-mail ici..."
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans resize-none"
                                        ></textarea>
                                    </div>

                                    <ActionButton
                                        onClick={handleSend}
                                        loading={loading}
                                        variant="premium"
                                        className="w-full mt-4"
                                    >
                                        Envoyer l'e-mail
                                    </ActionButton>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
