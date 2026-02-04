import ClientHeader from '../components/client/ClientHeader'
import NotificationBanner from '@/components/NotificationBanner'
import RealtimeClientSync from '../components/client/RealtimeClientSync'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950">
            <RealtimeClientSync />
            <NotificationBanner />
            <ClientHeader />
            <main>
                {children}
            </main>
        </div>
    )
}
