import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    // Fetch user role from public.users table
    const { data: initialProfile, error: profileError } = await supabase
        .from('users')
        .select('roles')
        .eq('id', user.id)
        .single()

    let profile = initialProfile

    if (profileError || !profile) {
        console.log('Profile missing or error for user:', user.id, profileError)

        // Attempt to create the profile from auth metadata
        const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                nom: user.user_metadata?.nom || '',
                prenom: user.user_metadata?.prenom || '',
                roles: ['client'] // Default role
            })
            .select('roles')
            .single()

        if (insertError) {
            console.error('CRITICAL: Failed to recover/create profile:', insertError)
            return redirect('/client/dashboard?warning=ProfileCreatedOnTheFlyFailed')
        }
        profile = newProfile
    }

    const roles = (profile?.roles || []) as string[]

    // Redirect based on priority roles
    if (roles.includes('owner') || roles.includes('superadmin')) {
        return redirect('/admin/super')
    }
    if (roles.includes('admin_kyc')) {
        return redirect('/admin/kyc')
    }
    if (roles.includes('admin_loan')) {
        return redirect('/admin/loans')
    }
    if (roles.includes('admin_repayment') || roles.includes('admin_comptable')) {
        return redirect('/admin/repayments')
    }

    // Default to client dashboard
    return redirect('/client/dashboard')
}
