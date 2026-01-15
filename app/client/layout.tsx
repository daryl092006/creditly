import ClientHeader from '../components/client/ClientHeader'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <ClientHeader />
            <main>
                {children}
            </main>
        </div>
    )
}
