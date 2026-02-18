import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import AdminLoanTable from './loan-table'
import Link from 'next/link'

export default async function AdminLoanPage({
    searchParams
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const params = await searchParams
    const statusFilter = params.status || 'pending'

    // Security Check
    await requireAdminRole(['admin_loan', 'superadmin'])

    const supabase = await createClient()

    // Fetch loans with user and snapshot info
    const { data: loans } = await supabase
        .from('prets')
        .select(`
            *,
            user:users!prets_user_id_fkey(email, nom, prenom, whatsapp, telephone),
            plan:subscription_snapshot_id(name),
            admin:users!prets_admin_id_fkey(email, nom, prenom, role, whatsapp)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })

    const rows = loans?.map(loan => ({
        id: loan.id,
        user: `${loan.user?.prenom} ${loan.user?.nom} (${loan.user?.email})`,
        whatsapp: loan.user?.whatsapp || loan.user?.telephone,
        amount: loan.amount,
        amount_paid: loan.amount_paid || 0,
        plan: loan.plan?.name || 'N/A',
        date: loan.request_date,
        status: loan.status,
        payout_phone: loan.payout_phone,
        payout_name: loan.payout_name,
        payout_network: loan.payout_network,
        admin: loan.admin ? {
            name: `${loan.admin.prenom} ${loan.admin.nom}`,
            role: loan.admin.role,
            whatsapp: loan.admin.whatsapp
        } : null
    })) || []

    // Get Current User Role for UI logic
    const { getCurrentUserRole } = await import('@/utils/admin-security')
    const currentUserRole = await getCurrentUserRole()

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="admin-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Surveillance des Prêts</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Analyse des demandes et validation des décaissements</p>
                    </div>

                    <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl">
                        {[
                            { label: 'En attente', val: 'pending' },
                            { label: 'Actifs', val: 'active' },
                            { label: 'Payés', val: 'paid' },
                            { label: 'Retard', val: 'overdue' }
                        ].map(tab => (
                            <Link
                                key={tab.val}
                                href={`/admin/loans?status=${tab.val}`}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === tab.val ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="glass-panel overflow-hidden bg-slate-900/50 border-slate-800">
                    <AdminLoanTable rows={rows} currentUserRole={currentUserRole} />
                </div>
            </div>
        </div>
    )
}
