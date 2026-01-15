'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckmarkFilled, Information, WarningAlt, Close } from '@carbon/icons-react'

export default function NotificationBanner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [isVisible, setIsVisible] = useState(false)
    const [message, setMessage] = useState('')
    const [type, setType] = useState<'success' | 'info' | 'error'>('success')

    useEffect(() => {
        const success = searchParams.get('success')
        const error = searchParams.get('error')
        const info = searchParams.get('info')

        if (success || error || info) {
            let msg = ''
            if (success) {
                setType('success')
                msg = decodeURIComponent(success)
                // Business logic translations for common codes if needed
                if (success === 'DossierSoumis') msg = "Votre dossier KYC a été soumis avec succès pour analyse."
                if (success === 'PaiementEnvoye') msg = "Preuve de paiement reçue. Un administrateur validera votre solde sous peu."
                if (success === 'PretEngage') msg = "Votre demande de financement est en cours d'audit de sécurité."
                if (success === 'AbonnementAttribue') msg = "Votre demande d'abonnement a été transmise. Un agent l'activera après réception du paiement."
            } else if (error) {
                setType('error')
                msg = decodeURIComponent(error)
            } else if (info) {
                setType('info')
                msg = decodeURIComponent(info)
            }

            setMessage(msg)
            setIsVisible(true)

            // Auto-hide after 6 seconds
            const timer = setTimeout(() => {
                handleClose()
            }, 6000)

            return () => clearTimeout(timer)
        }
    }, [searchParams])

    const handleClose = () => {
        setIsVisible(false)
        // Clean up URL params without refreshing
        const params = new URLSearchParams(searchParams.toString())
        params.delete('success')
        params.delete('error')
        params.delete('info')
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
        router.replace(newUrl, { scroll: false })
    }

    if (!isVisible) return null

    const config = {
        success: {
            bg: 'bg-emerald-500',
            icon: <CheckmarkFilled size={20} />,
            label: 'Opération Réussie'
        },
        error: {
            bg: 'bg-red-500',
            icon: <WarningAlt size={20} />,
            label: 'Erreur Système'
        },
        info: {
            bg: 'bg-blue-600',
            icon: <Information size={20} />,
            label: 'Information'
        }
    }

    const current = config[type]

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-lg animate-slideDown">
            <div className={`${current.bg} p-1 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}>
                <div className="bg-slate-900 rounded-[calc(1rem-2px)] p-4 flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb' }}></div>

                    <div className={`${type === 'success' ? 'text-emerald-500' : type === 'error' ? 'text-red-500' : 'text-blue-500'} shrink-0`}>
                        {current.icon}
                    </div>

                    <div className="flex-grow">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mb-1">{current.label}</p>
                        <p className="text-xs font-bold text-white leading-tight">{message}</p>
                    </div>

                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-600 hover:text-white transition-colors"
                    >
                        <Close size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}
