'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CheckmarkFilled, Close } from '@carbon/icons-react'

const SUCCESS_MESSAGES: Record<string, { title: string, text: string }> = {
    'DossierSoumis': {
        title: 'Dossier Reçu',
        text: 'Vos documents KYC sont en cours d\'analyse par nos experts (24h max).'
    },
    'PretEngage': {
        title: 'Demande Envoyée',
        text: 'Félicitations ! Votre demande de prêt est en cours d\'étude.'
    },
    'PaiementEnvoye': {
        title: 'Reçu Transmis',
        text: 'Nous allons vérifier votre paiement. Vous recevrez une notification bientôt.'
    },
    'ProfileUpdated': {
        title: 'Profil Mis à Jour',
        text: 'Vos informations personnelles ont été enregistrées avec succès.'
    },
    'AbonnementSoumis': {
        title: 'Forfait en Attente',
        text: 'Votre paiement d\'abonnement est en cours de vérification par nos services.'
    }
}

export default function DashboardSuccessToast() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [visible, setVisible] = useState(false)
    const [message, setMessage] = useState<{ title: string, text: string } | null>(null)

    useEffect(() => {
        const success = searchParams.get('success')
        if (success && SUCCESS_MESSAGES[success]) {
            setMessage(SUCCESS_MESSAGES[success])
            setVisible(true)

            // Auto hide after 8 seconds
            const timer = setTimeout(() => {
                setVisible(false)
                // Clear the URL param without full page reload
                const newParams = new URLSearchParams(searchParams.toString())
                newParams.delete('success')
                router.replace(`/client/dashboard?${newParams.toString()}`, { scroll: false })
            }, 8000)

            return () => clearTimeout(timer)
        }
    }, [searchParams, router])

    if (!visible || !message) return null

    return (
        <div className="fixed bottom-10 right-10 z-[100] animate-slide-up">
            <div className="glass-panel p-6 bg-slate-900 border-emerald-500/30 flex items-start gap-5 shadow-2xl shadow-emerald-500/10 min-w-[320px] max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckmarkFilled size={24} />
                </div>
                <div className="flex-1 text-left">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-1">{message.title}</h4>
                    <p className="text-xs font-bold text-slate-500 italic leading-relaxed">{message.text}</p>
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="p-1 text-slate-700 hover:text-white transition-colors"
                >
                    <Close size={20} />
                </button>
            </div>

            {/* Progress bar at the bottom of toast */}
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/30 rounded-b-3xl animate-toast-progress"></div>
        </div>
    )
}
