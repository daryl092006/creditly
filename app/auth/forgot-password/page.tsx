'use client'

import { useState } from 'react'
import { requestPasswordReset } from '../actions'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Email } from '@carbon/icons-react'

import { Suspense } from 'react'

function ForgotPasswordForm() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    const [isSubmitting, setIsSubmitting] = useState(false)

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="glass-panel p-8 md:p-12 w-full max-w-xl animate-fade-in relative overflow-hidden">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black gradient-text tracking-tighter mb-2 uppercase italic">Creditly</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                        Récupération de compte
                    </p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-shake">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-fade-in">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        {message}
                    </div>
                )}

                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm text-center mb-8">
                    Saisissez votre adresse email pour recevoir un lien de réinitialisation de votre mot de passe.
                </p>

                <form action={requestPasswordReset} onSubmit={() => setIsSubmitting(true)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                            <Email className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                name="email"
                                type="email"
                                placeholder="votre@email.com"
                                required
                                className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="premium-button w-full py-5 flex items-center justify-center gap-3 active:scale-95 group transition-all"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="font-black uppercase tracking-widest text-xs">Envoyer le lien</span>
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                            <ArrowLeft size={16} />
                            Retour à la connexion
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ForgotPasswordForm />
        </Suspense>
    )
}

