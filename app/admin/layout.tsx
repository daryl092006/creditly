import AdminNav from '@/app/components/admin/AdminNav'
import { getCurrentUserRole } from '@/utils/admin-security'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const role = await getCurrentUserRole()

    return (
        <div className="min-h-screen bg-slate-950">
            <AdminNav userRole={role} />
            <main className="page-transition">
                {children}
            </main>
        </div>
    )
}
