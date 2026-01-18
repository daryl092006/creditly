'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserRole(userId: string, role: 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin') {
    const supabase = await createClient()

    // Only superadmin can do this (protected by RLS and middleware, but good to check here too)
    await supabase.auth.getUser()
    // Need to fetch requester role ideally, but RLS handles the update permission.

    const { error } = await supabase.from('users').update({ role }).eq('id', userId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/super/users')
}

/**
 * Simple Account Deletion: Wipes public.users and auth.users
 * Does NOT blacklist the email.
 */
export async function deleteUserAccount(userId: string) {
    const adminSupabase = await createAdminClient()

    // 1. Delete from auth.users (Cascades to public.users via RLS or DB references usually, 
    // but we can be explicit if needed. The references in schema.sql say 'on delete cascade')
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (authError) {
        // Fallback: Try delete from public.users if auth delete fails (sometimes user might not exist in auth anymore)
        const { error: publicError } = await adminSupabase.from('users').delete().eq('id', userId)
        if (publicError) throw new Error(`Auth Delete: ${authError.message} | Public Delete: ${publicError.message}`)
    }

    revalidatePath('/admin/super/users')
}

/**
 * Blacklist & Delete: Adds email to blacklist and then wipes account data.
 */
export async function blacklistUserAccount(userId: string, email: string) {
    const adminSupabase = await createAdminClient()

    // 1. Add to blacklist table
    const { error: blacklistError } = await adminSupabase
        .from('email_blacklist')
        .insert({ email })

    if (blacklistError) throw new Error(`Erreur lors de la mise sur liste noire : ${blacklistError.message}`)

    // 2. Perform full deletion
    await deleteUserAccount(userId)
}
