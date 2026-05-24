import ClientHeader from '../components/client/ClientHeader'
import NotificationBanner from '@/components/NotificationBanner'
import RealtimeClientSync from '../components/client/RealtimeClientSync'
import { createClient } from '@/utils/supabase/server'
import BottomNav from '../components/client/BottomNav'

import { redirect } from 'next/navigation'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Fetch user profile and roles
    const { data: profile } = await supabase.from('users').select('roles').eq('id', user?.id || '').maybeSingle()
    const roles = (profile?.roles || []) as string[]
    const isAdmin = roles.some((r: string) => r.startsWith('admin_') || r === 'owner' || r === 'superadmin')

    // 2. Maintenance Check
    const { data: maintenanceSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle()

    if (maintenanceSetting?.value === 'true') {
        if (!isAdmin) {
            return redirect('/maintenance')
        }
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <RealtimeClientSync userId={user?.id} />
            <NotificationBanner />
            <ClientHeader roles={roles} />
            <main>
                {children}
            </main>
            <BottomNav />
        </div>
    )
}
