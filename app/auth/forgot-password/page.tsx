'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '../actions'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Email, Warning, CheckmarkFilled } from '@carbon/icons-react'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { Suspense } from 'react'

const initialState: { message: string | null; error: string | null } = {
    message: null,
    error: null,
}

function ForgotPasswordForm() {
    const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState)

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 transition-colors duration-300">
            <div className="glass-panel p-8 md:p-12 w-full max-w-xl animate-fade-in relative overflow-hidden">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black gradient-text tracking-tighter mb-2 uppercase italic">Creditly</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                        Récupération de compte
                    </p>
                </div>

                {state.error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest italic animate-shake">
                        <Warning size={20} className="shrink-0" />
                        {state.error}
                    </div>
                )}

                {state.message && (
                    <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest italic animate-fade-in">
                        <CheckmarkFilled size={20} className="shrink-0" />
                        {state.message}
                    </div>
                )}

                <p className="text-slate-500 font-bold text-sm text-center mb-8 italic">
                    Saisissez votre adresse email pour recevoir un lien de réinitialisation de votre mot de passe.
                </p>

                <form action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Email</label>
                        <div className="relative">
                            <Email className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                name="email"
                                type="email"
                                placeholder="votre@email.com"
                                required
                                className="w-full pl-12 pr-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white bg-slate-950 placeholder:text-slate-800"
                            />
                        </div>
                    </div>

                    <ActionButton
                        type="submit"
                        loading={isPending}
                        loadingText="Envoi en cours..."
                        className="w-full py-5 flex items-center justify-center gap-3 active:scale-95 group transition-all"
                    >
                        <span className="font-black uppercase tracking-widest text-xs">Envoyer le lien</span>
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </ActionButton>

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
