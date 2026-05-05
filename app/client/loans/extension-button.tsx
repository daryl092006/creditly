'use client'

import { useState } from 'react'
import { Time } from '@carbon/icons-react'
import { extendLoan } from './actions'
import { useRouter } from 'next/navigation'

interface ExtensionButtonProps {
    loanId: string;
    isExtended: boolean;
    status: string;
    hasOverdue: boolean;
    extensionFee: number;
}

export default function ExtensionButton({ loanId, isExtended, status, hasOverdue, extensionFee }: ExtensionButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    if (isExtended || (status !== 'active' && status !== 'approved')) return null

    const handleExtend = async () => {
        if (hasOverdue) {
            alert("Votre compte n'est pas en règle (dossier en retard). Impossible de prolonger.")
            return
        }

        if (!confirm(`Voulez-vous prolonger ce prêt de 5 jours pour ${extensionFee}F de frais ? Cette action est possible une seule fois.`)) {
            return
        }

        setLoading(true)
        try {
            const result = await extendLoan(loanId)
            if (result?.error) {
                alert(result.error)
            } else {
                alert("Votre prêt a été prolongé avec succès (+5 jours).")
                router.refresh()
            }
        } catch (err) {
            alert("Une erreur est survenue lors de la prolongation.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleExtend}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                loading 
                ? 'bg-purple-600/20 text-purple-400 animate-pulse cursor-not-allowed' 
                : 'bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white shadow-lg shadow-purple-600/5'
            }`}
        >
            <Time size={16} />
            {loading ? 'Traitement...' : 'Prolonger (+5j)'}
        </button>
    )
}
