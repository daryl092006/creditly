'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

export async function subscribeToPlan(planId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // In a real app, this would redirect to payment gateway.
    // Here we just insert the record as 'active' or 'pending' if manual validation required.
    // The specs say: "Statut abonnement_actif = true si payé et activé par l’admin"
    // So we create it as inactive.

    const { error } = await supabase
        .from('user_subscriptions')
        .insert({
            user_id: user.id,
            plan_id: planId,
            is_active: false // Admin must activate
        })

    if (error) throw new Error(getUserFriendlyErrorMessage(error))

    revalidatePath('/client/subscriptions')
    // Maybe redirect to a confirmation page or show toast?
    // relying on UI update for now.
}
