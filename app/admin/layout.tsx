import AdminNav from '@/app/components/admin/AdminNav'
import { getCurrentUserRoles } from '@/utils/admin-security'
import RealtimeAdminSync from '../components/admin/RealtimeAdminSync'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const roles = await getCurrentUserRoles()

    return (
        <div className="min-h-screen bg-slate-950">
            <RealtimeAdminSync />
            <AdminNav userRoles={roles} />
            <main className="page-transition">
                {children}
            </main>
        </div>
    )
}
