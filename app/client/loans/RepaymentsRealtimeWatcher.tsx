'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

/**
 * Composant invisible qui écoute en temps réel les changements de statut
 * des remboursements de l'utilisateur connecté et rafraîchit la page automatiquement.
 */
export default function RepaymentsRealtimeWatcher({ userId }: { userId: string }) {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel(`repayments-watcher-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'remboursements',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    // Quand un remboursement change de statut (pending → verified/rejected)
                    // on rafraîchit la page automatiquement sans rechargement complet
                    router.refresh()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'prets',
                    filter: `user_id=eq.${userId}`
                },
                () => {
                    // Quand un prêt passe à "paid" ou "active", rafraîchir aussi
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    return null
}
