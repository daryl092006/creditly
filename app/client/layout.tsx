import ClientHeader from '../components/client/ClientHeader'
import NotificationBanner from '@/components/NotificationBanner'
import RealtimeClientSync from '../components/client/RealtimeClientSync'
import { createClient } from '@/utils/supabase/server'

import { redirect } from 'next/navigation'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // --- MAINTENANCE CHECK ---
    const { data: maintenanceSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single()

    if (maintenanceSetting?.value === 'true') {
        return redirect('/maintenance')
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <RealtimeClientSync userId={user?.id} />
            <NotificationBanner />
            <ClientHeader />
            <main>
                {children}
            </main>
        </div>
    )
}
