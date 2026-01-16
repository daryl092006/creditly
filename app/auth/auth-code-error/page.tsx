'use client'

import Link from 'next/link'
import { Warning, ArrowLeft } from '@carbon/icons-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    return (
        <div className="max-w-md w-full text-center space-y-8">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
                <Warning size={40} />
            </div>

            <div className="space-y-4">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    Lien <span className="text-red-500">Invalide</span>
                </h1>
                <p className="text-slate-400 font-medium">
                    Le lien de réinitialisation a expiré ou n&apos;est plus valide.
                </p>
                {error && (
                    <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-xs font-mono text-red-400 break-words">
                        Erreur technique: {error}
                    </div>
                )}
            </div>

            <Link
                href="/auth/forgot-password"
                className="premium-button w-full py-4 flex items-center justify-center gap-2 group"
            >
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                <span>Nouvelle demande</span>
            </Link>
        </div>
    )
}

export default function AuthCodeError() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <Suspense fallback={null}>
                <ErrorContent />
            </Suspense>
        </div>
    )
}
