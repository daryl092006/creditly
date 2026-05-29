'use client'

import { useState } from 'react'
import { Add, Send, Close, CheckmarkFilled } from '@carbon/icons-react'
import { createSupportTicket } from '../actions'

const CATEGORIES = [
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

const PRIORITY_MAP: Record<string, string> = {
    'Problème de paiement': 'urgent',
    'Problème de remboursement': 'urgent',
    'Compte bloqué ou restreint': 'high',
    'Problème de demande de prêt': 'high',
    'Problème d\'abonnement': 'high',
    'Problème de limite de prêt': 'medium',
    'Problème de vérification KYC': 'medium',
    'Erreur technique': 'medium',
    'Autre': 'low'
}

export default function NewTicketForm() {
    const [open, setOpen] = useState(false)
    const [category, setCategory] = useState(CATEGORIES[0])
    const [subject, setSubject] = useState('')
    const [description, setDescription] = useState('')
    const [isPending, setIsPending] = useState(false)
    const [success, setSuccess] = useState(false)
    const [ticketRef, setTicketRef] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) return
        setIsPending(true)
        try {
            const ticket = await createSupportTicket({
                subject: `[${category}] ${subject}`,
                description,
                priority: PRIORITY_MAP[category] || 'medium',
                category
            })
            setTicketRef(ticket?.id || null)
            setSuccess(true)
        } catch {
            //
        } finally {
            setIsPending(false)
        }
    }

    if (success) {
        return (
            <div className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
                <CheckmarkFilled size={20} className="text-emerald-500" />
                <div>
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest italic">Ticket créé avec succès</p>
                    {ticketRef && (
                        <p className="text-[10px] font-bold text-slate-500 italic">Référence : #{ticketRef.slice(0, 8)}</p>
                    )}
                </div>
            </div>
        )
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="premium-button px-10 flex items-center gap-2"
            >
                <Add size={20} /> Nouveau Ticket
            </button>
        )
    }

    return (
        <div className="glass-panel p-8 bg-blue-600/5 border-blue-500/20 space-y-6 animate-fade-in w-full md:max-w-xl">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Nouveau Ticket</h3>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <Close size={20} />
                </button>
            </div>

            {/* Catégorie */}
            <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Type de problème</label>
                <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-blue-500 transition-colors outline-none"
                >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-[8px] font-bold text-slate-600 ml-1 italic">
                    Priorité auto : <span className="text-white">{PRIORITY_MAP[category] || 'medium'}</span>
                </p>
            </div>

            {/* Sujet */}
            <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sujet (résumé court)</label>
                <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: Mon abonnement n'est pas activé"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-blue-500 transition-colors outline-none placeholder:text-slate-700"
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Description complète</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Décrivez votre situation en détail..."
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-blue-500 transition-colors outline-none resize-none placeholder:text-slate-700"
                />
            </div>

            <div className="flex gap-3">
                <button
                    onClick={handleSubmit}
                    disabled={!subject.trim() || !description.trim() || isPending}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Send size={14} />
                    {isPending ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                    Annuler
                </button>
            </div>
        </div>
    )
}
