'use client'

import { useState } from 'react'
import { ArrowRight } from '@carbon/icons-react'
import { signup } from '../actions'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { Suspense } from 'react'

function SignupForm() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form data
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        whatsapp: '',
        email: '',
        password: ''
    })

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="glass-panel p-8 md:p-12 w-full max-w-xl animate-fade-in relative overflow-hidden">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black premium-gradient-text tracking-tighter mb-2 uppercase italic">Creditly</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] text-center w-full">
                        Accédez à l&apos;excellence financière
                    </p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-black animate-shake">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                <form action={signup} onSubmit={() => setIsSubmitting(true)} className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 text-left block">Prénom</label>
                            <input
                                name="prenom"
                                type="text"
                                placeholder="Jean"
                                required
                                value={formData.prenom}
                                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 text-left block">Nom</label>
                            <input
                                name="nom"
                                type="text"
                                placeholder="Dupont"
                                required
                                value={formData.nom}
                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block">WhatsApp <span className="text-blue-500 font-bold lowercase italic">(Indicatif obligatoire, ex: +229)</span></label>
                        <input
                            name="whatsapp"
                            type="text"
                            placeholder="+229 00 00 00 00"
                            required
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block">Email Professionnel</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="votre@email.com"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block">Mot de passe de sécurité</label>
                        <input
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="premium-button w-full py-6 active:scale-95 group transition-all"
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Créer mon Espace</span>
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Déjà membre ?{' '}
                            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 transition-colors">Se connecter</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={null}>
            <SignupForm />
        </Suspense>
    )
}
