'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createStaffLoan } from '../actions'
import { ArrowLeft, Money, Calendar, List, CheckmarkFilled, Warning } from '@carbon/icons-react'
import Link from 'next/link'

export default function CreateStaffLoanPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const userId = searchParams.get('userId')
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    
    // Form State
    const [amount, setAmount] = useState('50000')
    const [type, setType] = useState<'lump_sum' | 'monthly'>('lump_sum')
    const [installments, setInstallments] = useState('3')
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [description, setDescription] = useState('Prêt Staff Interne (0%)')

    if (!userId) return <div className="p-20 text-center text-slate-500">Utilisateur non spécifié.</div>

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        
        const res = await createStaffLoan(
            userId,
            Number(amount),
            type,
            Number(installments),
            startDate,
            description
        )
        
        if (res?.error) {
            setError(res.error)
            setLoading(false)
        } else {
            setSuccess(true)
            setTimeout(() => router.push('/admin/super/users'), 2000)
        }
    }

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container max-w-2xl">
                <Link href="/admin/super/users" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors mb-8">
                    <ArrowLeft size={16} />
                    Retour à la gouvernance
                </Link>

                <div className="glass-panel p-8 md:p-12 bg-slate-900 border-white/5 shadow-2xl relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                            <Money size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Accord <span className="text-emerald-500">Staff.</span></h1>
                            <p className="text-slate-500 font-bold text-xs">Configuration d'un prêt interne à 0% d'intérêt.</p>
                        </div>
                    </div>

                    {success ? (
                        <div className="py-12 text-center space-y-6 animate-scale-in">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                                <CheckmarkFilled size={48} />
                            </div>
                            <h2 className="text-2xl font-black text-white italic">PRÊT ACCORDÉ !</h2>
                            <p className="text-slate-500">L'administrateur a été notifié et le prêt est désormais actif.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Montant */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Montant Total Capital (FCFA)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        required
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-xl font-black text-white italic focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                        placeholder="Ex: 100000"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black italic">XOF</div>
                                </div>
                            </div>

                            {/* Type de remboursement */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType('lump_sum')}
                                    className={`p-6 rounded-2xl border transition-all text-left group ${type === 'lump_sum' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-white/5 hover:border-white/10'}`}
                                >
                                    <Calendar size={24} className={type === 'lump_sum' ? 'text-emerald-500' : 'text-slate-600'} />
                                    <p className={`text-xs font-black uppercase italic tracking-widest mt-4 ${type === 'lump_sum' ? 'text-white' : 'text-slate-500'}`}>Échéance Unique</p>
                                    <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">Tout rembourser à une date fixe</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('monthly')}
                                    className={`p-6 rounded-2xl border transition-all text-left ${type === 'monthly' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-slate-950 border-white/5 hover:border-white/10'}`}
                                >
                                    <List size={24} className={type === 'monthly' ? 'text-blue-500' : 'text-slate-600'} />
                                    <p className={`text-xs font-black uppercase italic tracking-widest mt-4 ${type === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Mensualités</p>
                                    <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">Étalé sur plusieurs mois</p>
                                </button>
                            </div>

                            {/* Options Conditionnelles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">
                                        {type === 'monthly' ? 'Première Échéance' : 'Date de Remboursement'}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-white/20 transition-all"
                                    />
                                </div>

                                {type === 'monthly' && (
                                    <div className="space-y-3 animate-slide-up">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Nombre de mois</label>
                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-white/20 transition-all appearance-none"
                                        >
                                            {[2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} Mois ({Math.floor(Number(amount)/n).toLocaleString('fr-FR')} F / mois)</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Motif / Commentaire</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-white/20 transition-all min-h-[80px]"
                                    placeholder="Ex: Prêt social exceptionnel - Janvier"
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-shake">
                                    <Warning size={20} />
                                    <p className="text-xs font-black italic uppercase tracking-widest">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all ${loading ? 'bg-slate-800 text-slate-600 grayscale animate-pulse cursor-wait' : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-xl shadow-emerald-500/20 active:scale-95'}`}
                            >
                                {loading ? 'Traitement...' : 'Débloquer les fonds'}
                                {!loading && <CheckmarkFilled size={20} />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
