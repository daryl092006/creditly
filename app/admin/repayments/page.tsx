import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import AdminRepaymentTable from './repayment-table'
import AdminCreateRepaymentWrapper from './AdminCreateRepaymentWrapper'
import Link from 'next/link'
import AdminTableFilters from '@/app/components/admin/AdminTableFilters'

export default async function AdminRepaymentPage({
    searchParams
}: {
    searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
    const params = await searchParams
    const statusFilter = params.status || 'pending'
    const queryStr = params.q || ''
    const page = parseInt(params.page || '1')
    const pageSize = 25

    // Security Check
    const { role } = await requireAdminRole(['admin_repayment', 'superadmin', 'admin_comptable'])

    const supabase = await createClient()

    // Build Query
    let repQuery = supabase
        .from('remboursements')
        .select(`
            *,
            loan:prets(id, amount, amount_paid, service_fee, created_at, status, due_date),
            user:users!remboursements_user_id_fkey(id, email, nom, prenom, whatsapp, telephone),
            admin:users!remboursements_admin_id_fkey(email, nom, prenom, roles, whatsapp)
        `, { count: 'exact' })

    if (statusFilter !== 'all') {
        repQuery = repQuery.eq('status', statusFilter)
    }

    let matchedUserIds: string[] = []
    if (queryStr) {
        const { data: matchedUsers } = await supabase
            .from('users')
            .select('id')
            .or(`nom.ilike.%${queryStr}%,prenom.ilike.%${queryStr}%,email.ilike.%${queryStr}%`)
        matchedUserIds = matchedUsers?.map(u => u.id) || []
    }

    if (queryStr) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryStr.trim())
        const orConditions: string[] = []
        if (isUuid) {
            orConditions.push(`id.eq.${queryStr.trim()}`, `loan_id.eq.${queryStr.trim()}`, `user_id.eq.${queryStr.trim()}`)
        }
        matchedUserIds.forEach(uid => {
            orConditions.push(`user_id.eq.${uid}`)
        })
        if (orConditions.length > 0) {
            repQuery = repQuery.or(orConditions.join(','))
        } else {
            repQuery = repQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
    }

    repQuery = repQuery.order('created_at', { ascending: false })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data: repayments, count } = await repQuery.range(from, to)

    const { calculateLoanDebt } = await import('@/utils/loan-utils')

    const rows = repayments?.map(r => {
        const { totalDebt, principle, fee, extensionFee, latePenalties, paid } = calculateLoanDebt(r.loan as any)
        const initialTotal = principle + fee + (extensionFee || 0) + (latePenalties || 0)

        return {
            id: r.id,
            loan_id: r.loan_id,
            user_id: r.user_id,
            user: `${r.user?.prenom} ${r.user?.nom} (${r.user?.email})`,
            whatsapp: r.user?.whatsapp || r.user?.telephone,
            loan_initial_total: initialTotal,
            loan_total_due: totalDebt,
            loan_amount_paid: paid,
            amount_declared: r.amount_declared,
            proof_url: r.proof_url,
            date: r.created_at,
            status: r.status,
            admin: r.admin ? {
                name: `${r.admin.prenom} ${r.admin.nom}`,
                role: r.admin.roles?.[0],
                whatsapp: r.admin.whatsapp
            } : null
        }
    }) || []

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="admin-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Surveillance Remboursements</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Vérification des preuves de paiement et clôture des dossiers</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <AdminCreateRepaymentWrapper isAdmin={true} />
                    </div>
                </div>

                <div className="space-y-8">
                    <AdminTableFilters
                        placeholder="Chercher par transaction, nom ou ID..."
                        statusOptions={[
                            { label: 'En attente', value: 'pending' },
                            { label: 'Validés', value: 'verified' },
                            { label: 'Rejetés', value: 'rejected' }
                        ]}
                    />

                    <div className="glass-panel overflow-hidden bg-slate-900/50 border-slate-800 shadow-2xl">
                        <AdminRepaymentTable rows={rows as any} />
                    </div>

                    {count && count > pageSize && (
                        <div className="p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                            Nombre total de remboursements : {count}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
