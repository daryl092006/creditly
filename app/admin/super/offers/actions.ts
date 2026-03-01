'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

export async function updateOffer(formData: FormData) {
    const supabase = await createAdminClient()

    const id = formData.get('id') as string
    if (!id) return;

    const name = formData.get('name') as string
    const price = parseInt(formData.get('price') as string) || 0
    const max_loans_per_month = parseInt(formData.get('max_loans_per_month') as string) || 0
    const max_loan_amount = parseFloat(formData.get('max_loan_amount') as string) || 0
    const repayment_delay_days = parseInt(formData.get('repayment_delay_days') as string) || 0

    console.log('Updating offer:', id, { name, price });

    const updates = {
        name,
        price,
        max_loans_per_month,
        max_loan_amount,
        repayment_delay_days
    }

    const { error } = await supabase
        .from('abonnements')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error('CRITICAL: Offer update failed for', id, ':', error);
        throw new Error(`Erreur de modification du plan : ${getUserFriendlyErrorMessage(error)} (ID: ${id})`);
    }
}

export async function createOffer(formData: FormData) {
    const supabase = await createAdminClient()

    const name = formData.get('name') as string
    const price = parseInt(formData.get('price') as string)
    const max_loans_per_month = parseInt(formData.get('max_loans_per_month') as string)
    const max_loan_amount = parseFloat(formData.get('max_loan_amount') as string)
    const repayment_delay_days = parseInt(formData.get('repayment_delay_days') as string)

    const newItem = {
        name,
        price,
        max_loans_per_month,
        max_loan_amount,
        repayment_delay_days
    }

    const { error } = await supabase
        .from('abonnements')
        .insert([newItem])

    if (error) {
        throw new Error(getUserFriendlyErrorMessage(error))
    }

    revalidatePath('/admin/super/offers')
    revalidatePath('/client/subscriptions')
    revalidatePath('/')
}

export async function deleteOffer(formData: FormData) {
    const supabase = await createAdminClient()
    const id = formData.get('id') as string

    const { error } = await supabase
        .from('abonnements')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(`Désolé, cette offre ne peut pas être supprimée car elle est probablement liée à des abonnements existants. ${getUserFriendlyErrorMessage(error)}`)
    }

    revalidatePath('/admin/super/offers')
    revalidatePath('/admin/super')
    revalidatePath('/client/subscriptions')
    revalidatePath('/')
}

export async function updateOfferAndQuotas(formData: FormData) {
    try {
        await updateOffer(formData)
        await updateQuotas(formData)

        // Consolidate revalidation
        revalidatePath('/admin/super/offers')
        revalidatePath('/admin/super')
    } catch (e: any) {
        console.error('Critical failure in updateOfferAndQuotas:', e);
        // We throw a descriptive error that will be caught by error.tsx
        throw new Error(e.message || "Erreur de mise à jour système.");
    }
}

export async function updateQuotas(formData: FormData) {
    const supabase = await createAdminClient()

    // Extract all keys that look like quota_XXXX
    const entries = Array.from(formData.entries());
    const quotaUpdates = entries
        .filter(([key]) => key.startsWith('quota_'))
        .map(([key, value]) => {
            const val = parseInt(value as string);
            return {
                plan_id: key.replace('quota_', ''),
                monthly_limit: isNaN(val) ? 0 : val
            };
        });

    console.log('Final quota updates to apply:', quotaUpdates);

    for (const update of quotaUpdates) {
        const { error } = await supabase
            .from('global_quotas')
            .upsert(update, { onConflict: 'plan_id' });

        if (error) {
            console.error('CRITICAL: Quota update failed for plan', update.plan_id, ':', error);
            throw new Error(`Erreur lors de la mise à jour du quota: ${getUserFriendlyErrorMessage(error)} (Plan: ${update.plan_id})`);
        }
    }
}
