'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRealtimeRefresh } from '@/app/hooks/useRealtimeRefresh'

export default function RealtimeClientSync() {
    const [userId, setUserId] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        getUser()
    }, [supabase])

    // Se désabonner de tout si on n'a pas l'ID, sinon écouter les tables critiques pour ce client
    if (userId) {
        useRealtimeRefresh('user_subscriptions', `user_id=eq.${userId}`)
        useRealtimeRefresh('kyc_submissions', `user_id=eq.${userId}`)
        useRealtimeRefresh('prets', `user_id=eq.${userId}`)
        useRealtimeRefresh('remboursements', `user_id=eq.${userId}`)
    }

    useRealtimeRefresh('abonnements')

    return null // Composant invisible servant uniquement à la synchro via router.refresh()
}
