import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KYCFormClient from './kyc-form'

export default async function KYCPageServer() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

    const missingFields = []
    if (!profile?.nom) missingFields.push('nom')
    if (!profile?.prenom) missingFields.push('prenom')
    if (!profile?.birth_date) missingFields.push('birth_date')
    if (!profile?.profession) missingFields.push('profession')
    if (!profile?.whatsapp) missingFields.push('whatsapp')
    if (!profile?.guarantor_nom) missingFields.push('guarantor_nom')
    if (!profile?.guarantor_prenom) missingFields.push('guarantor_prenom')
    if (!profile?.guarantor_whatsapp) missingFields.push('guarantor_whatsapp')

    return <KYCFormClient missingFields={missingFields} />
}
