'use client'

import Link from 'next/link'
import { Flash, Locked, ArrowRight, CheckmarkOutline, Warning } from '@carbon/icons-react'

export default function SubscribeButton({
    planId,
    disabled,
    isModification,
    isQuotaFull,
    hasUnpaidLoans,
    isExhausted,
    isLocked,
    lockReason,
    lockDetail,
    userLimit,
    planLimit
}: {
    planId: string
    disabled: boolean
    isModification?: boolean
    isQuotaFull?: boolean
    hasUnpaidLoans?: boolean
    isExhausted?: boolean
    isLocked?: boolean
    lockReason?: string | null
    lockDetail?: string | null
    userLimit?: number
    planLimit?: number
}) {
    if (isLocked) {
        return (
            <div className="space-y-4">
                {/* Bouton verrouillé */}
                <button
                    className="w-full py-4 rounded-2xl bg-slate-800/80 text-slate-500 border border-slate-700/50 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
                    disabled
                >
                    <Locked size={14} />
                    Non disponible pour mon profil
                </button>

                {/* Explication contextualisée */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/50 space-y-3 text-left">
                    <div className="flex items-start gap-2">
                        <Warning size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-relaxed">
                            {lockReason || 'Ce plan n\'est pas encore disponible pour votre profil.'}
                        </p>
                    </div>

                    {userLimit !== undefined && planLimit !== undefined && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <p className="text-[7px] font-black text-emerald-500 uppercase tracking-wider">Votre limite</p>
                                <p className="text-sm font-black text-white italic">{userLimit.toLocaleString('fr-FR')} F</p>
                            </div>
                            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                                <p className="text-[7px] font-black text-red-400 uppercase tracking-wider">Requis</p>
                                <p className="text-sm font-black text-red-400 italic">{planLimit.toLocaleString('fr-FR')} F</p>
                            </div>
                        </div>
                    )}

                    {/* Actions rapides */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        <Link
                            href="/client/kyc"
                            className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1"
                        >
                            <CheckmarkOutline size={10} /> Vérifier KYC
                        </Link>
                        <Link
                            href="/client/support?subject=réévaluation"
                            className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 border border-slate-600/30 text-[8px] font-black uppercase tracking-wider hover:bg-slate-600 hover:text-white transition-all flex items-center gap-1"
                        >
                            <ArrowRight size={10} /> Demander réévaluation
                        </Link>
                        <Link
                            href="/client/support"
                            className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 border border-slate-600/30 text-[8px] font-black uppercase tracking-wider hover:bg-slate-600 hover:text-white transition-all flex items-center gap-1"
                        >
                            Support
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {disabled ? (
                <button
                    className={`premium-button w-full py-5 !rounded-2xl shadow-none border ${isQuotaFull
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 font-black'
                        : hasUnpaidLoans
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-black'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                    disabled
                >
                    {isQuotaFull ? '❌ QUOTA MENSUEL ATTEINT' : hasUnpaidLoans ? '❌ Prêt en cours' : (isModification && !isExhausted) ? 'Déjà Actif' : 'Payé / En attente'}
                </button>
            ) : (
                <Link
                    href={`/client/subscriptions/payment?planId=${planId}`}
                    className="premium-button w-full py-5 !rounded-2xl group"
                >
                    <span>{isExhausted ? 'Renouveler ce forfait' : isModification ? 'Changer pour ce plan' : 'Choisir ce plan'}</span>
                    <Flash className="group-hover:rotate-12 transition-transform" />
                </Link>
            )}
        </div>
    )
}
