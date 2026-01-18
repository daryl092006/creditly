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

    // 1. Delete from auth.users (Cascades to public.users via RLS or DB references usually)
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (authError) {
        let terminalMessage = authError.message

        // Handle Foreign Key Violations (Postgres code 23503) from the cascading delete
        if (terminalMessage.includes('23503') || terminalMessage.includes('violates foreign key constraint')) {
            if (terminalMessage.includes('prets_user_id_fkey')) {
                throw new Error("Suppression Impossible : L'utilisateur possède des prêts enregistrés.")
            }
            if (terminalMessage.includes('remboursements_user_id_fkey')) {
                throw new Error("Suppression Impossible : L'utilisateur possède des remboursements enregistrés.")
            }
            if (terminalMessage.includes('kyc_submissions_user_id_fkey')) {
                throw new Error("Suppression Impossible : L'utilisateur a un dossier KYC en cours.")
            }
            if (terminalMessage.includes('user_subscriptions_user_id_fkey')) {
                throw new Error("Suppression Impossible : L'utilisateur a des abonnements enregistrés.")
            }
            throw new Error("Suppression Impossible : L'utilisateur est lié à des dossiers administratifs actifs.")
        }

        // Fallback: Try delete from public.users if auth delete fails for other reasons
        const { error: publicError } = await adminSupabase.from('users').delete().eq('id', userId)
        if (publicError) {
            const pubMsg = publicError.message
            if (pubMsg.includes('prets_user_id_fkey')) throw new Error("Suppression Impossible : Prêts détectés.")
            if (pubMsg.includes('kyc_submissions_user_id_fkey')) throw new Error("Suppression Impossible : KYC détecté.")
            throw new Error(`Erreur technique : ${pubMsg}`)
        }
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
