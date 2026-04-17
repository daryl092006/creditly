'use client'

import { useRealtimeRefresh } from '@/app/hooks/useRealtimeRefresh'

export default function RealtimeAdminSync() {
    // Écouter toutes les tables critiques sans filtre pour les admins
    useRealtimeRefresh('user_subscriptions')
    useRealtimeRefresh('kyc_submissions')
    useRealtimeRefresh('prets')
    useRealtimeRefresh('remboursements')
    useRealtimeRefresh('users')
    useRealtimeRefresh('abonnements')

    return null
}
