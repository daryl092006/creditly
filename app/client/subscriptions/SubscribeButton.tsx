'use client'

// Button, Tag removed as Carbon CSS is disabled
import { subscribeToPlan } from './actions'
import { useTransition, useState } from 'react'

export default function SubscribeButton({ planId, disabled }: { planId: string, disabled: boolean }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleSubscribe = async () => {
        setError(null)
        startTransition(async () => {
            try {
                await subscribeToPlan(planId)
            } catch (err) {
                setError((err as Error).message || 'Une erreur est survenue')
            }
        })
    }

    return (
        <div className="space-y-3">
            <button
                className={`premium-button w-full py-5 !rounded-2xl ${disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                    : ''}`}
                disabled={disabled || isPending}
                onClick={handleSubscribe}
            >
                {isPending ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Traitement...
                    </span>
                ) : disabled ? 'Statut : Payé / En attente' : 'Choisir ce plan'}
            </button>
            {error && (
                <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter text-center animate-bounce">
                    ❌ {error}
                </p>
            )}
        </div>
    )
}
