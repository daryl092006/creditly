'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdminRole } from '@/utils/admin-security'

export async function updateUserRoles(userId: string, roles: Array<'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin' | 'admin_comptable' | 'owner'>) {
    await requireAdminRole(['superadmin', 'owner'])
    const supabase = await createClient()

    const { error } = await supabase.from('users').update({ roles }).eq('id', userId)

    if (error) return { error: error.message }
    revalidatePath('/admin/super/users')
    return { success: true }
}

/**
 * Simple Account Deletion: Wipes public.users and auth.users
 * Does NOT blacklist the email.
 */
export async function deleteUserAccount(userId: string) {
    await requireAdminRole(['superadmin', 'owner'])
    const adminSupabase = await createAdminClient()

    try {
        // 1. Manually cleanup children in order of dependency
        // Remboursements first (they depend on loans and users)
        await adminSupabase.from('remboursements').delete().eq('user_id', userId)

        // Loans next
        await adminSupabase.from('prets').delete().eq('user_id', userId)

        // KYC next
        await adminSupabase.from('kyc_submissions').delete().eq('user_id', userId)

        // Subscriptions next
        await adminSupabase.from('user_subscriptions').delete().eq('user_id', userId)

        // 2. Delete from auth.users (Cascades to public.users via 'on delete cascade' on public.users table)
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)

        if (authError) {
            console.error('Auth deletion error:', authError)
            return { error: "Erreur lors de la suppression du compte d'authentification." }
        }

        revalidatePath('/admin/super/users')
        return { success: true }
    } catch (e: any) {
        console.error('Full wipe error:', e)
        return { error: "Une erreur critique est survenue lors du nettoyage des données." }
    }
}

/**
 * Blacklist & Delete: Adds email to blacklist and then wipes account data.
 */
export async function blacklistUserAccount(userId: string, email: string) {
    await requireAdminRole(['superadmin', 'owner'])
    const adminSupabase = await createAdminClient()

    // 1. Add to blacklist table
    const { error: blacklistError } = await adminSupabase
        .from('email_blacklist')
        .insert({ email })

    if (blacklistError) return { error: `Erreur lors de la mise sur liste noire : ${blacklistError.message}` }

    // 2. Perform full deletion
    return await deleteUserAccount(userId)
}
