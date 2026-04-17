'use client'

import { Warning, Restart } from '@carbon/icons-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="fr" className="dark">
            <body className="antialiased bg-slate-950">
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className="max-w-md w-full glass-panel p-10 bg-red-600/5 border-red-500/20 text-center space-y-8">
                        <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30">
                            <Warning size={48} className="text-red-500" />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                                Erreur <span className="text-red-500">Fatale.</span>
                            </h1>
                            <p className="text-slate-400 font-bold text-sm leading-relaxed italic">
                                Le système a rencontré une erreur critique au niveau de sa structure de base.
                            </p>
                        </div>

                        <button
                            onClick={() => reset()}
                            className="premium-button w-full py-5 !rounded-2xl flex items-center justify-center gap-3 bg-white text-slate-950 shadow-xl"
                        >
                            <Restart size={24} />
                            <span className="font-black uppercase tracking-widest text-xs">Tenter de Rafraîchir</span>
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
