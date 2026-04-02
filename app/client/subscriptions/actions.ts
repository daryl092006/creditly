'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendAdminNotification, sendUserEmail } from '@/utils/email-service'
import { checkGlobalQuotasStatus } from '@/utils/quotas-server'

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

    // Verify Global Quotas
    const quotasStatus = await checkGlobalQuotasStatus()
    if (quotasStatus[planId]?.reached) {
        return { error: "Désolé, la capacité maximale d'abonnements pour cette offre ce mois-ci a été atteinte." }
    }

    // Verify User has no active/overdue loans
    const { data: activeLoans } = await supabase
        .from('prets')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['active', 'overdue'])

    if (activeLoans && activeLoans.length > 0) {
        return { error: "Vous devez solder votre prêt en cours avant de changer ou renouveler votre abonnement." }
    }

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

        // Fetch plan details to snapshot them
        const { data: planToSnapshot } = await adminSupabase.from('abonnements').select('*').eq('id', planId).single()

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
                rejection_reason: null,
                snapshot_name: planToSnapshot?.name,
                snapshot_price: planToSnapshot?.price,
                snapshot_max_loans_per_month: planToSnapshot?.max_loans_per_month,
                snapshot_max_loan_amount: planToSnapshot?.max_loan_amount,
                snapshot_repayment_delay_days: planToSnapshot?.repayment_delay_days,
                snapshot_duration_days: planToSnapshot?.duration_days ?? 30,
                snapshot_service_fee: planToSnapshot?.service_fee
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

            await sendUserEmail('SUBSCRIPTION_RECEIVED', {
                email: user.email!,
                name: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
                planName: plan?.name || 'Inconnu',
                amount: numAmount
            })
        } catch (notifErr) {
            console.error('Erreur notification (non-bloquant):', notifErr)
        }

        revalidatePath('/client/subscriptions')
        revalidatePath('/client/dashboard')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Erreur lors de la souscription." }
    }
}
