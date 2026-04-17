'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAdminProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Non authentifié' }
    }

    const nom = formData.get('nom') as string
    const prenom = formData.get('prenom') as string
    const whatsapp = formData.get('whatsapp') as string

    if (!nom || !prenom || !whatsapp) {
        return { error: 'Tous les champs sont requis.' }
    }

    const { error } = await supabase
        .from('users')
        .update({ nom, prenom, whatsapp })
        .eq('id', user.id)

    if (error) {
        return { error: `Erreur lors de la mise à jour: ${error.message}` }
    }

    revalidatePath('/admin/profile')
    return { success: true }
}
