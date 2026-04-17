'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'

export async function updateSystemSetting(key: string, value: string) {
    const { role } = await requireAdminRole(['owner'])
    if (role !== 'owner') return { error: "Accès strictement réservé au Propriétaire." }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('system_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)

    if (error) {
        console.error("Setting update error:", error)
        return { error: "Erreur lors de la mise à jour du paramètre." }
    }

    revalidatePath('/admin/settings')
    revalidatePath('/client/subscriptions/payment')
    // We might need to revalidate more if these are used elsewhere
    return { success: true }
}

export async function getSystemSettings() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.from('system_settings').select('*')
    if (error) return []

    // Clés obsolètes depuis que les frais sont définis par plan d'abonnement
    const OBSOLETE_KEYS = ['platform_fee', 'operator_fee_reserve']
    return data.filter((s: any) => !OBSOLETE_KEYS.includes(s.key))
}
