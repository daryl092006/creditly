'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateContactInfo(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Non autorisé")

    const whatsapp = formData.get('whatsapp') as string
    const nom = formData.get('nom') as string
    const prenom = formData.get('prenom') as string
    const birth_date = formData.get('birth_date') as string || null
    const profession = formData.get('profession') as string
    const guarantor_nom = formData.get('guarantor_nom') as string
    const guarantor_prenom = formData.get('guarantor_prenom') as string
    const guarantor_whatsapp = formData.get('guarantor_whatsapp') as string

    // Validate WhatsApp uniqueness
    if (whatsapp) {
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('whatsapp', whatsapp)
            .neq('id', user.id)
            .maybeSingle()
        if (existingUser) {
            throw new Error("Ce numéro WhatsApp est déjà utilisé par un autre compte.")
        }
    }

    const { error } = await supabase
        .from('users')
        .update({ 
            whatsapp, 
            nom, 
            prenom,
            birth_date,
            profession,
            guarantor_nom,
            guarantor_prenom,
            guarantor_whatsapp
        })
        .eq('id', user.id)

    if (error) throw new Error(error.message)

    // Auto-resubmit rejected KYC if they update their profile
    const { data: kyc } = await supabase.from('kyc_submissions').select('id, status').eq('user_id', user.id).single()
    if (kyc && kyc.status === 'rejected') {
        await supabase.from('kyc_submissions').update({
            status: 'pending',
            admin_notes: 'Dossier remis en attente suite à la mise à jour du profil (Nom/Prénom) par le client.',
            reviewed_at: null,
            admin_id: null
        }).eq('id', kyc.id)
    }

    revalidatePath('/client/dashboard')
}
