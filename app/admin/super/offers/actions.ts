'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

export async function updateOffer(formData: FormData) {
    const supabase = await createClient()

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const price = parseInt(formData.get('price') as string)
    const max_loans_per_month = parseInt(formData.get('max_loans_per_month') as string)
    const max_loan_amount = parseFloat(formData.get('max_loan_amount') as string)
    const repayment_delay_days = parseInt(formData.get('repayment_delay_days') as string)

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
        throw new Error(getUserFriendlyErrorMessage(error))
    }

    revalidatePath('/admin/super/offers')
    revalidatePath('/client/subscriptions')
    revalidatePath('/')
}

export async function createOffer(formData: FormData) {
    const supabase = await createClient()

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

export async function updateQuotas(formData: FormData) {
    const supabase = await createClient()

    // Extract all keys that look like quota_XXXX
    const entries = Array.from(formData.entries());
    const quotaUpdates = entries
        .filter(([key]) => key.startsWith('quota_'))
        .map(([key, value]) => ({
            amount: parseInt(key.replace('quota_', '')),
            monthly_limit: parseInt(value as string)
        }));

    for (const update of quotaUpdates) {
        const { error } = await supabase
            .from('global_quotas')
            .upsert(update, { onConflict: 'amount' });

        if (error) {
            throw new Error(`Erreur lors de la mise à jour du quota ${update.amount}: ${getUserFriendlyErrorMessage(error)}`);
        }
    }

    revalidatePath('/admin/super/offers')
    revalidatePath('/admin/super')
    revalidatePath('/client/subscriptions')
}
