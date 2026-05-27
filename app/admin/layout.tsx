import AdminNav from '@/app/components/admin/AdminNav'
import { getCurrentUserRoles } from '@/utils/admin-security'
import RealtimeAdminSync from '../components/admin/RealtimeAdminSync'
import { createClient } from '@/utils/supabase/server'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const roles = await getCurrentUserRoles()
    const supabase = await createClient()

    // Fetch pending counts for notification badges
    const [
        { count: pendingKyc },
        { count: pendingLoans },
        { count: pendingReps },
        { count: pendingWithdrawals },
        { count: pendingInvestorTxs }
    ] = await Promise.all([
        supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('prets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('remboursements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('admin_withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('investor_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ])

    const notificationCounts = {
        kyc: pendingKyc || 0,
        loans: pendingLoans || 0,
        repayments: pendingReps || 0,
        withdrawals: (pendingWithdrawals || 0) + (pendingInvestorTxs || 0)
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <RealtimeAdminSync />
            <AdminNav userRoles={roles} notificationCounts={notificationCounts} />
            <main className="page-transition">
                {children}
            </main>
        </div>
    )
}
