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
}
