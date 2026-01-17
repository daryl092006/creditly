import ClientHeader from '../components/client/ClientHeader'
import NotificationBanner from '@/components/NotificationBanner'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950">
            <NotificationBanner />
            <ClientHeader />
            <main>
                {children}
            </main>
        </div>
    )
}
