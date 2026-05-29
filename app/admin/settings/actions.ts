'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'

export async function updateSystemSetting(key: string, value: any) {
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
    revalidatePath('/client/loans')
    return { success: true }
}

export async function getSystemSettings() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.from('system_settings').select('*')
    if (error) return []

    // Clés obsolètes ou purement techniques à masquer de l'UI de réglages
    const HIDDEN_KEYS = [
        'platform_fee',
        'operator_fee_reserve',
        'investor_ledger',
        'investor_transactions_ledger',
        'total_platform_capital'
    ]
    return data.filter((s: any) => !HIDDEN_KEYS.includes(s.key))
}

export async function getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single()

    if (error || !data) return defaultValue
    return data.value
}

export async function getGlobalQuotas() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.from('global_quotas').select('*, plan:abonnements(name, max_loan_amount)')
    if (error) return []
    return data
}

export async function updateGlobalQuota(planId: string, limit: number) {
    const { role } = await requireAdminRole(['owner'])
    if (role !== 'owner') return { error: "Accès strictement réservé au Propriétaire." }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('global_quotas')
        .update({ monthly_limit: limit })
        .eq('plan_id', planId)

    if (error) {
        console.error("Quota update error:", error)
        return { error: "Erreur lors de la mise à jour du quota." }
    }

    revalidatePath('/admin/super')
    revalidatePath('/admin/settings/quotas')
    return { success: true }
}
