'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateContactInfo(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Non autorisé")

    const whatsapp = formData.get('whatsapp') as string

    const { error } = await supabase
        .from('users')
        .update({ whatsapp })
        .eq('id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath('/client/dashboard')
}
