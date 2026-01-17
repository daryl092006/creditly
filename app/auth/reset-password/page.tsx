'use client'

import { useState } from 'react'
import { resetPassword } from '../actions'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Password } from '@carbon/icons-react'

import { Suspense } from 'react'

import { useActionState } from 'react'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const initialState: { message: string | null; error: string | null } = {
    message: null,
    error: null,
}

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const urlError = searchParams.get('error')
    const [state, formAction, isPending] = useActionState(resetPassword, initialState)

    // Combine URL errors (if any, from stale redirects) with state errors
    const displayError = state.error || urlError

    useEffect(() => {
        if (state.message) {
            router.push('/auth/login?message=' + encodeURIComponent(state.message))
        }
    }, [state.message, router])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 transition-colors duration-300">
            <div className="glass-panel p-8 md:p-12 w-full max-w-xl animate-fade-in relative overflow-hidden">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black gradient-text tracking-tighter mb-2 uppercase italic">Creditly</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                        Nouveau mot de passe
                    </p>
                </div>

                {displayError && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest italic animate-shake">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {displayError}
                    </div>
                )}

                <p className="text-slate-500 font-bold text-sm text-center mb-8 italic">
                    Définissez votre nouveau mot de passe de sécurité.
                </p>

                <form action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nouveau mot de passe</label>
                        <div className="relative">
                            <Password className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full pl-12 pr-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white bg-slate-950 placeholder:text-slate-800"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="premium-button w-full py-5 flex items-center justify-center gap-3 active:scale-95 group transition-all"
                    >
                        {isPending ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Réinitialisation en cours...</span>
                            </div>
                        ) : (
                            <>
                                <span className="font-black uppercase tracking-widest text-xs">Mettre à jour</span>
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    )
}
