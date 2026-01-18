'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

import { redirect } from 'next/navigation'

export async function subscribeToPlan(formData: FormData) {
    const { createAdminClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié' }

    const planId = formData.get('planId') as string
    const amount = formData.get('amount') as string
    const file = formData.get('proof') as File

    if (!planId || !amount || !file || file.size === 0) {
        return { error: 'Données incomplètes' }
    }

    const adminSupabase = await createAdminClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/sub_${planId}_${Date.now()}.${fileExt}`

    try {
        // 1. Upload to Storage
        const { data: uploadData, error: uploadError } = await adminSupabase.storage
            .from('repayment-proofs')
            .upload(`subscriptions/${fileName}`, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            return { error: getUserFriendlyErrorMessage(uploadError) }
        }

        // 2. Cleanup old pending/rejected attempts
        await adminSupabase
            .from('user_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .in('status', ['pending', 'rejected'])

        // 3. Insert new record
        const { error } = await supabase
            .from('user_subscriptions')
            .insert({
                user_id: user.id,
                plan_id: planId,
                amount_paid: Number(amount),
                proof_url: uploadData.path,
                is_active: false,
                status: 'pending',
                rejection_reason: null
            })

        if (error) {
            return { error: getUserFriendlyErrorMessage(error) }
        }

        revalidatePath('/client/subscriptions')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Erreur lors de la souscription." }
    }
}
