import ClientHeader from '../components/client/ClientHeader'
import NotificationBanner from '@/components/NotificationBanner'
import RealtimeClientSync from '../components/client/RealtimeClientSync'
import { createClient } from '@/utils/supabase/server'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
