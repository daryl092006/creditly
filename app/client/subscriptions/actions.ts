'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendAdminNotification } from '@/utils/email-service'

export async function subscribeToPlan(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié' }

    // 0. Input Validation
    const { SubscriptionSchema } = await import('@/utils/validation-schemas');

    const rawData = {
        planId: formData.get('planId'),
        amount: formData.get('amount'),
        proof: formData.get('proof')
    };

    const validationResult = SubscriptionSchema.safeParse(rawData);

    if (!validationResult.success) {
        return { error: validationResult.error.issues[0].message };
    }

    const { planId, amount: numAmount, proof: file } = validationResult.data;


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
                amount_paid: numAmount,
                proof_url: uploadData.path,
                is_active: false,
                status: 'pending',
                rejection_reason: null
            })

        if (error) {
            return { error: getUserFriendlyErrorMessage(error) }
        }

        // 4. Notify Admin
        try {
            const { data: profile } = await adminSupabase.from('users').select('nom, prenom').eq('id', user.id).single()
            const { data: plan } = await adminSupabase.from('abonnements').select('name').eq('id', planId).single()

            await sendAdminNotification('SUBSCRIPTION', {
                userEmail: user.email!,
                userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
                planName: plan?.name || 'Inconnu',
                amount: numAmount
            })
        } catch (notifErr) {
            console.error('Erreur notification admin (non-bloquant):', notifErr)
        }

        revalidatePath('/client/subscriptions')
        revalidatePath('/client/dashboard')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Erreur lors de la souscription." }
    }
}
