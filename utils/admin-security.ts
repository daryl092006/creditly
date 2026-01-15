import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin'

export async function requireAdminRole(allowedRoles: UserRole[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    const userRole = profile?.role as UserRole

    if (!userRole || !allowedRoles.includes(userRole)) {
        console.error(`Access Denied: User ${user.email} (Role: ${userRole}) attempted to access restricted area.`)
        // Redirect to their appropriate dashboard if possible, or root
        if (userRole === 'client') redirect('/client/dashboard')
        if (userRole === 'admin_kyc') redirect('/admin/kyc')
        if (userRole === 'admin_loan') redirect('/admin/loans')
        if (userRole === 'admin_repayment') redirect('/admin/repayments')

        // Fallback for unauthorized/confusion
        redirect('/')
    }

    return { user, role: userRole }
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    return profile?.role as UserRole
}
