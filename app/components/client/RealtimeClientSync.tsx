'use client'

import { useRealtimeRefresh } from '@/app/hooks/useRealtimeRefresh'

export default function RealtimeClientSync({ userId }: { userId?: string }) {
    // Écouter les tables critiques pour ce client, désactivé si pas de userId
    // Note: On appelle les hooks INCONDITIONNELLEMENT pour respecter les règles de React.
    // L'option 'disabled' gère la logique de souscription.
    useRealtimeRefresh('user_subscriptions', `user_id=eq.${userId}`, !userId)
    useRealtimeRefresh('kyc_submissions', `user_id=eq.${userId}`, !userId)
    useRealtimeRefresh('prets', `user_id=eq.${userId}`, !userId)
    useRealtimeRefresh('remboursements', `user_id=eq.${userId}`, !userId)

    // Toujours écouter les abonnements (offres globales)
    useRealtimeRefresh('abonnements')

    return null // Composant invisible servant uniquement à la synchro via router.refresh()
}
