import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin' | 'admin_comptable' | 'owner'

export async function requireAdminRole(allowedRoles: UserRole[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('roles')
        .eq('id', user.id)
        .single()

    const userRoles = (profile?.roles || []) as UserRole[]

    // OWNER has absolute power: they satisfy ANY admin check
    const isOwner = userRoles.includes('owner')

    // Check if user has at least one of the allowed roles
    const hasAccess = isOwner || userRoles.some(role => allowedRoles.includes(role))

    if (!hasAccess) {
        console.error(`Access Denied: User ${user.email} (Roles: ${userRoles.join(', ')}) attempted to access restricted area.`)

        // Logical redirect based on seniority/priority
        if (userRoles.includes('owner')) redirect('/admin/super')
        if (userRoles.includes('superadmin')) redirect('/admin/super')
        if (userRoles.includes('admin_comptable')) redirect('/admin/repayments')
        if (userRoles.includes('admin_repayment')) redirect('/admin/repayments')
        if (userRoles.includes('admin_loan')) redirect('/admin/loans')
        if (userRoles.includes('admin_kyc')) redirect('/admin/kyc')
        if (userRoles.includes('client')) redirect('/client/dashboard')

        redirect('/')
    }

    // Return the specific role matching or the highest seniority role
    const activeRole = isOwner ? 'owner' : (userRoles.find(role => allowedRoles.includes(role)) || userRoles[0])
    return { user, role: activeRole as UserRole, roles: userRoles }
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('users')
        .select('roles')
        .eq('id', user.id)
        .single()

    const roles = (profile?.roles || []) as UserRole[]
    if (roles.includes('owner')) return 'owner'
    if (roles.includes('superadmin')) return 'superadmin'
    if (roles.includes('admin_comptable')) return 'admin_comptable'
    if (roles.includes('admin_loan')) return 'admin_loan'
    if (roles.includes('admin_repayment')) return 'admin_repayment'
    if (roles.includes('admin_kyc')) return 'admin_kyc'

    return roles.length > 0 ? roles[0] : null
}

export async function getCurrentUserRoles(): Promise<UserRole[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('users')
        .select('roles')
        .eq('id', user.id)
        .single()

    return (profile?.roles || []) as UserRole[]
}
