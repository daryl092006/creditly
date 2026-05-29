'use client'

import { useState } from 'react'
import { Warning, ArrowRight, Chat, Renew, Close, Send, CheckmarkFilled } from '@carbon/icons-react'
import { createSupportTicketFromError } from '@/app/client/support/actions'

type Priority = 'urgent' | 'high' | 'medium' | 'low'
type Category =
    | 'Problème de paiement'
    | 'Problème d\'abonnement'
    | 'Problème de limite de prêt'
    | 'Problème de demande de prêt'
    | 'Problème de vérification KYC'
    | 'Problème de remboursement'
    | 'Compte bloqué ou restreint'
    | 'Erreur technique'
    | 'Autre'

interface SupportableErrorProps {
    title?: string
    message: string
    detail?: string
    onRetry?: () => void
    retryLabel?: string
    category?: Category
    priority?: Priority
    // Contexte automatique injecté dans le ticket
    context?: {
        page?: string
        action?: string
        errorCode?: string
        userId?: string
        planId?: string
        planName?: string
        loanId?: string
        repaymentId?: string
        userLimit?: number
        planLimit?: number
        kycStatus?: string
        riskClass?: string
    }
}

const CATEGORIES: Category[] = [
    'Problème de paiement',
    'Problème d\'abonnement',
    'Problème de limite de prêt',
    'Problème de demande de prêt',
    'Problème de vérification KYC',
    'Problème de remboursement',
    'Compte bloqué ou restreint',
    'Erreur technique',
    'Autre'
]

const PRIORITY_COLORS: Record<Priority, string> = {
    urgent: 'border-red-500/30 bg-red-500/5',
    high: 'border-amber-500/30 bg-amber-500/5',
    medium: 'border-blue-500/20 bg-blue-500/5',
    low: 'border-slate-700 bg-slate-900/50'
}

export function SupportableError({
    title = 'Une erreur est survenue',
    message,
    detail,
    onRetry,
    retryLabel = 'Réessayer',
    category,
    priority = 'medium',
    context
}: SupportableErrorProps) {
    const [showForm, setShowForm] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category>(category || 'Erreur technique')
    const [userMessage, setUserMessage] = useState('')
    const [isPending, setIsPending] = useState(false)
    const [success, setSuccess] = useState(false)
    const [ticketId, setTicketId] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!userMessage.trim()) return
        setIsPending(true)
        try {
            const result = await createSupportTicketFromError({
                subject: `[${selectedCategory}] ${title}`,
                userMessage,
                category: selectedCategory,
                priority,
                context: {
                    ...context,
                    errorMessage: message,
                    errorDetail: detail,
                    timestamp: new Date().toISOString(),
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                    currentUrl: typeof window !== 'undefined' ? window.location.href : context?.page
                }
            })
            setTicketId(result?.id || null)
            setSuccess(true)
        } catch {
            // fallback silencieux
        } finally {
            setIsPending(false)
        }
    }

    if (success) {
        return (
            <div className={`rounded-2xl border p-6 space-y-4 ${PRIORITY_COLORS[priority]} animate-fade-in`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                        <CheckmarkFilled size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-emerald-400 uppercase tracking-widest italic">Ticket envoyé</p>
                        <p className="text-[10px] font-bold text-slate-500 italic">
                            Notre équipe vous répondra dans les plus brefs délais.
                            {ticketId && <> Référence : <span className="text-white font-black">#{ticketId.slice(0, 8)}</span></>}
                        </p>
                    </div>
                </div>
                <a
                    href="/client/support"
                    className="inline-flex items-center gap-2 text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
                >
                    Suivre mes tickets <ArrowRight size={12} />
                </a>
            </div>
        )
    }

    return (
        <div className={`rounded-2xl border p-6 space-y-4 ${PRIORITY_COLORS[priority]} animate-fade-in`}>
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Warning size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-black text-white uppercase tracking-widest italic mb-1">{title}</p>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">{message}</p>
                    {detail && (
                        <p className="text-[10px] font-bold text-slate-600 mt-1 leading-relaxed italic">{detail}</p>
                    )}
                </div>
            </div>

            {/* Actions principales */}
            {!showForm && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all"
                        >
                            <Renew size={12} /> {retryLabel}
                        </button>
                    )}
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                    >
                        <Chat size={12} /> Ouvrir un ticket
                    </button>
                </div>
            )}

            {/* Formulaire ticket */}
            {showForm && (
                <div className="border-t border-white/5 pt-4 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest italic">Ouvrir un ticket</p>
                        <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                            <Close size={16} />
                        </button>
                    </div>

                    {/* Catégorie */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Catégorie</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value as Category)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:border-blue-500 transition-colors outline-none"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Votre message</label>
                        <textarea
                            value={userMessage}
                            onChange={e => setUserMessage(e.target.value)}
                            placeholder="Décrivez votre problème en quelques mots..."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 transition-colors outline-none resize-none placeholder:text-slate-700"
                        />
                    </div>

                    <p className="text-[8px] font-bold text-slate-700 italic">
                        Le contexte technique (page, action, erreur, profil) sera automatiquement inclus dans le ticket.
                    </p>

                    {/* Bouton d'envoi */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={!userMessage.trim() || isPending}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Send size={12} />
                            {isPending ? 'Envoi...' : 'Envoyer le ticket'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
