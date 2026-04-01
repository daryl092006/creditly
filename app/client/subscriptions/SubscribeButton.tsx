'use client'

// Button, Tag removed as Carbon CSS is disabled
import Link from 'next/link'
import { Flash } from '@carbon/icons-react'

export default function SubscribeButton({
    planId,
    disabled,
    isModification,
    isQuotaFull
}: {
    planId: string,
    disabled: boolean,
    isModification?: boolean,
    isQuotaFull?: boolean
}) {
    return (
        <div className="space-y-3">
            {disabled ? (
                <button
                    className={`premium-button w-full py-5 !rounded-2xl shadow-none border ${
                        isQuotaFull 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 font-black' 
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                    disabled
                >
                    {isQuotaFull ? '❌ QUOTA MENSUEL ATTEINT' : isModification ? 'Déjà Actif' : 'Payé / En attente'}
                </button>
            ) : (
                <Link
                    href={`/client/subscriptions/payment?planId=${planId}`}
                    className="premium-button w-full py-5 !rounded-2xl group"
                >
                    <span>{isModification ? 'Changer pour ce plan' : 'Choisir ce plan'}</span>
                    <Flash className="group-hover:rotate-12 transition-transform" />
                </Link>
            )}
        </div>
    )
}
