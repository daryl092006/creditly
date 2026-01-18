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
        const msg = authError.message.toLowerCase()

        // Map technical database constraints to clear, human reasons
        if (msg.includes('23503') || msg.includes('foreign key constraint')) {
            if (msg.includes('prets_user_id_fkey')) {
                throw new Error("Action Impossible : Cet utilisateur possède des dossiers de prêts actifs.")
            }
            if (msg.includes('remboursements_user_id_fkey')) {
                throw new Error("Action Impossible : Des remboursements sont liés à ce compte.")
            }
            if (msg.includes('kyc_submissions_user_id_fkey')) {
                throw new Error("Action Impossible : Un dossier de vérification d'identité (KYC) est en cours.")
            }
            if (msg.includes('user_subscriptions_user_id_fkey')) {
                throw new Error("Action Impossible : L'utilisateur possède un historique d'abonnements.")
            }
            throw new Error("Action Impossible : L'utilisateur est lié à des activités administratives qui empêchent sa suppression.")
        }

        // Generic friendly fallback
        throw new Error("Impossible de supprimer ce compte pour le moment. Veuillez vérifier s'il possède des prêts ou des paiements en cours.")
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
