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
        .select('role')
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
                role: 'client' // Force client role for new recovery profiles
            })
            .select('role')
            .single()

        if (insertError) {
            console.error('CRITICAL: Failed to recover/create profile:', insertError)
            // If we can't create it, we are stuck, but let's try to assume 'client' for one last redirect 
            // to see if the client page can handle missing profiles better.
            return redirect('/client/dashboard?warning=ProfileCreatedOnTheFlyFailed')
        }
        profile = newProfile
    }

    console.log('User profile found/created, role:', profile?.role)

    if (!profile) {
        console.error('CRITICAL: Profile is null after recovery attempts')
        return redirect('/client/dashboard?error=ProfileRecoveryFailed')
    }

    // Redirect based on role
    switch (profile.role) {
        case 'superadmin':
            return redirect('/admin/super')
        case 'admin_kyc':
            return redirect('/admin/kyc')
        case 'admin_loan':
            return redirect('/admin/loans')
        case 'admin_repayment':
            return redirect('/admin/repayments')
        case 'client':
        default:
            return redirect('/client/dashboard')
    }
}
