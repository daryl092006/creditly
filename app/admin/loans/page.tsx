import { createClient } from '@/utils/supabase/server'
import { requireAdminRole, getCurrentUserRole } from '@/utils/admin-security'
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
    await requireAdminRole(['admin_loan', 'superadmin', 'admin_comptable', 'owner'])

    const supabase = await createClient()

    // LAZY-CRON: Auto-Nettoyage des statuts pour la vue Admin Prêts
    await supabase.rpc('auto_update_system_statuses')

    // Fetch loans with user and snapshot info
    const { data: loans } = await supabase
        .from('prets')
        .select(`
            *,
            user:users!prets_user_id_fkey(email, nom, prenom, whatsapp, telephone, birth_date, address, city, profession),
            plan:subscription_snapshot_id(name),
            admin:users!prets_admin_id_fkey(email, nom, prenom, roles, whatsapp),
            repayments:remboursements(status)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })

    // Fetch repayment numbers once
    const { data: rawSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['repayment_phone_mtn', 'repayment_phone_moov', 'repayment_phone_celtiis'])

    const settingsMap = Object.fromEntries(rawSettings?.map((s: any) => [s.key, s.value]) || [])
    const repaymentPhones = {
        MTN: settingsMap['repayment_phone_mtn'] || '+229 01 53 32 44 90',
        Moov: settingsMap['repayment_phone_moov'] || '+229 01 58 69 14 05',
        Celtiis: settingsMap['repayment_phone_celtiis'] || '+229 01 44 14 00 67'
    }

    const { calculateLoanDebt } = await import('@/utils/loan-utils')

    const rows = loans?.map(loan => {
        const { principle, fee, totalDebt, latePenalties, daysLate } = calculateLoanDebt(loan as any)
        
        return {
            id: loan.id,
            user: `${loan.user?.prenom} ${loan.user?.nom} (${loan.user?.email})`,
            profile: loan.user,
            whatsapp: loan.user?.whatsapp || loan.user?.telephone,
            amount: principle,
            service_fee: fee,
            late_penalties: latePenalties,
            total_due: totalDebt,
            days_late: daysLate,
            amount_paid: Number(loan.amount_paid) || 0,
            plan: loan.plan?.name || 'N/A',
            date: loan.request_date,
            due_date: loan.due_date,
            status: (loan.status === 'active' || loan.status === 'overdue') && (loan as any).repayments?.some((r: any) => r.status === 'pending')
                ? 'Vérification'
                : loan.status,
            payout_phone: loan.payout_phone,
            payout_name: loan.payout_name,
            payout_network: loan.payout_network,
            borrower_birth_date: loan.borrower_birth_date,
            borrower_address: loan.borrower_address,
            borrower_city: loan.borrower_city,
            borrower_profession: loan.borrower_profession,
            borrower_id_details: loan.borrower_id_details,
            waiver_signed_at: loan.waiver_signed_at,
            admin: loan.admin ? {
                name: `${loan.admin.prenom} ${loan.admin.nom}`,
                role: loan.admin.roles?.[0],
                whatsapp: loan.admin.whatsapp
            } : null
        }
    }) || []

    // Get Current User Role for UI logic
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
                    <AdminLoanTable rows={rows as any} currentUserRole={currentUserRole} repaymentPhones={repaymentPhones} />
                </div>
            </div>
        </div>
    )
}
