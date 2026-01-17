'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getUserFriendlyErrorMessage } from '@/utils/error-handler'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect(`/auth/login?error=${encodeURIComponent(getUserFriendlyErrorMessage(error))}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const nom = formData.get('nom') as string
    const prenom = formData.get('prenom') as string
    const whatsapp = formData.get('whatsapp') as string

    try {
        // 0. Check Blacklist
        const { data: isBlacklisted } = await supabase
            .from('email_blacklist')
            .select('id')
            .eq('email', email)
            .single()

        if (isBlacklisted) {
            throw new Error("Cet email est sur liste noire et ne peut plus être utilisé sur cette plateforme.")
        }

        // 1. Auth Signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            phone: whatsapp, // Add native phone field for better internal handling
            options: {
                data: {
                    nom,
                    prenom,
                    whatsapp,
                    role: 'client'
                }
            }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error("Erreur lors de la création de l'utilisateur")

        revalidatePath('/', 'layout')
        redirect('/auth/login?message=Un e-mail de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.')
    } catch (error) {
        // Check if this is a Next.js redirect (which is expected behavior, not an error)
        const isRedirect = error && typeof error === 'object' && 'digest' in error &&
            typeof (error as any).digest === 'string' &&
            (error as any).digest.startsWith('NEXT_REDIRECT')

        // If it's a redirect, re-throw it to allow Next.js to handle it properly
        if (isRedirect) {
            throw error
        }

        // Otherwise, it's a real error - show user-friendly message
        redirect(`/auth/signup?error=${encodeURIComponent(getUserFriendlyErrorMessage(error))}`)
    }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
}

export async function requestPasswordReset(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    let errorOccurred = null

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
        })

        if (error) {
            errorOccurred = error
        }
    } catch (error) {
        errorOccurred = error as Error
    }

    if (errorOccurred) {
        // Return state object instead of redirecting for errors if preferred, or keep redirect.
        // For consistency with the crash fix, we will keep redirect but ensure it's safe.
        // However, with useActionState, returning error in state is often better UI.
        // We will try returning state to avoid "redirect" from exploding if caught by client incorrectly.
        return { error: errorOccurred.message || 'Une erreur est survenue', message: null }
    }

    // Success - we can still redirect or return success message
    // Returning success message allows the UI to show the green banner without page reload/flicker
    return { error: null, message: 'Lien de réinitialisation envoyé par email.' }
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string

    // Verify session exists
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        // If session is missing despite being on this page, it means the magic link cookie wasn't found or expired.
        // We must redirect to login because we can't update a user without a session.
        redirect('/auth/login?error=Votre lien de réinitialisation a expiré ou est invalide. Veuillez en demander un nouveau.')
    }

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        redirect(`/auth/reset-password?error=${encodeURIComponent(getUserFriendlyErrorMessage(error))}`)
    }

    redirect('/auth/login?message=Mot de passe réinitialisé avec succès.')
}
