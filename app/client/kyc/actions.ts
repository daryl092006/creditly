'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'
import { sendAdminNotification } from '@/app/utils/email-service'

export async function submitKyc(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Vous devez être connecté pour soumettre votre dossier KYC." }
    }

    const idCard = formData.get('id_card') as File
    const selfie = formData.get('selfie') as File
    const proofOfResidence = formData.get('proof_of_residence') as File

    if (!idCard || !selfie || !proofOfResidence || idCard.size === 0 || selfie.size === 0 || proofOfResidence.size === 0) {
        return { error: "Veuillez fournir les trois documents requis (ID, Selfie, Preuve de résidence)." }
    }

    const userId = user.id

    // Utilisation d'un client admin pour l'upload car les permissions RLS sur Storage sont souvent restrictives
    const adminSupabase = await createAdminClient()

    const uploadDoc = async (file: File, type: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`

        if (file.size > 10 * 1024 * 1024) {
            throw new Error(`Le fichier ${file.name} est trop volumineux (max 10MB).`)
        }

        const { data, error } = await adminSupabase.storage
            .from('kyc-documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type
            })

        if (error) {
            throw new Error(getUserFriendlyErrorMessage(error))
        }
        return data.path
    }

    try {
        const idCardPath = await uploadDoc(idCard, 'id_card')
        const selfiePath = await uploadDoc(selfie, 'selfie')
        const proofPath = await uploadDoc(proofOfResidence, 'proof_of_residence')

        // Insertion ou Mise à jour du dossier (Upsert sur user_id)
        const { error: dbError } = await adminSupabase.from('kyc_submissions').upsert(
            {
                user_id: userId,
                id_card_url: idCardPath,
                selfie_url: selfiePath,
                proof_of_residence_url: proofPath,
                status: 'pending',
                admin_notes: null,
                reviewed_at: null,
                admin_id: null
            },
            { onConflict: 'user_id' }
        )

        if (dbError) {
            return { error: getUserFriendlyErrorMessage(dbError) }
        }

        // 3. Notify Admin (Async)
        const { data: profile } = await adminSupabase.from('users').select('nom, prenom').eq('id', user.id).single()
        sendAdminNotification('KYC_SUBMISSION', {
            userEmail: user.email!,
            userName: profile ? `${profile.prenom} ${profile.nom}` : user.email!,
        }).catch((err: any) => console.error('Notification Error:', err))

        revalidatePath('/client/dashboard')
        revalidatePath('/admin/kyc')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Une erreur est survenue lors du téléversement." }
    }
}
