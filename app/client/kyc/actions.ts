'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitKyc(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Vous devez être connecté pour soumettre votre dossier KYC.")
    }

    const idCard = formData.get('id_card') as File
    const selfie = formData.get('selfie') as File
    const proofOfResidence = formData.get('proof_of_residence') as File

    if (!idCard || !selfie || !proofOfResidence || idCard.size === 0 || selfie.size === 0 || proofOfResidence.size === 0) {
        throw new Error("Veuillez fournir les trois documents requis (ID, Selfie, Preuve de résidence).")
    }

    const userId = user.id

    // Utilisation d'un client admin pour l'upload car les permissions RLS sur Storage sont souvent restrictives
    const adminSupabase = await createAdminClient()

    const uploadDoc = async (file: File, type: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`

        console.log(`Tentative d'upload pour ${type}: bucket=kyc-documents, path=${fileName}`)

        const { data, error } = await adminSupabase.storage
            .from('kyc-documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) {
            console.error(`DÉTAIL ERREUR UPLOAD ${type}:`, error)
            if ((error as any).message?.includes('bucket not found')) {
                throw new Error(`Le dossier de stockage 'kyc-documents' n'existe pas sur Supabase.`)
            }
            throw new Error(`Échec de l'upload du document ${type} : ${error.message}`)
        }
        return data.path
    }

    const idCardPath = await uploadDoc(idCard, 'id_card')
    const selfiePath = await uploadDoc(selfie, 'selfie')
    const proofPath = await uploadDoc(proofOfResidence, 'proof_of_residence')

    // Insertion unique pour tout le dossier
    const { error: dbError } = await adminSupabase.from('kyc_submissions').insert([
        {
            user_id: userId,
            id_card_url: idCardPath,
            selfie_url: selfiePath,
            proof_of_residence_url: proofPath,
            status: 'pending'
        }
    ])

    if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Erreur lors de l'enregistrement du dossier : ${dbError.message}`)
    }

    revalidatePath('/client/dashboard')
    revalidatePath('/admin/kyc')
    redirect('/client/dashboard?success=DossierSoumis')
}
