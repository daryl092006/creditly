'use client'

import { useEffect } from 'react'
import { Warning, Restart } from '@carbon/icons-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application Runtime Error:', error)
    }, [error])

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full glass-panel p-10 bg-red-600/5 border-red-500/20 text-center space-y-8 animate-fade-in">
                <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30">
                    <Warning size={48} className="text-red-500 animate-pulse" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                        Système <span className="text-red-500">Interrompu.</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-sm leading-relaxed italic">
                        Une erreur inattendue est survenue dans l'interface. Nos ingénieurs ont été notifiés.
                    </p>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-mono text-slate-500 break-all">
                        {error.message || "Erreur de synchronisation ou de rendu."}
                    </p>
                </div>

                <button
                    onClick={() => reset()}
                    className="premium-button w-full py-5 !rounded-2xl group flex items-center justify-center gap-3 bg-white text-slate-950 hover:bg-red-500 hover:text-white transition-all transform active:scale-95 shadow-xl shadow-white/5"
                >
                    <Restart size={24} className="group-hover:rotate-180 transition-transform duration-700" />
                    <span className="font-black uppercase tracking-widest text-xs">Relancer l'application</span>
                </button>
            </div>
        </div>
    )
}
