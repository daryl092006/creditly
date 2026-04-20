'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { revalidatePath } from 'next/cache'

export async function recordInvestorTransaction(name: string, type: 'withdrawal' | 'investment', amount: number) {
    await requireAdminRole(['owner', 'superadmin'])
    const supabase = await createClient()

    // Get current ledger
    const { data: current } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'investor_ledger')
        .single()

    const ledger = current?.value || []
    const transactions = Array.isArray(ledger) ? ledger : []

    const newTransaction = {
        id: crypto.randomUUID(),
        name,
        type,
        amount: type === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount),
        date: new Date().toISOString()
    }

    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key: 'investor_ledger',
            value: [...transactions, newTransaction],
            description: 'Grand Livre des transactions associés (investissements et retraits)'
        })

    if (error) return { error: error.message }
    
    revalidatePath('/admin/finance')
    return { success: true }
}
