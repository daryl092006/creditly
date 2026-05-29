import { createClient } from '@/utils/supabase/server'
import UserManagementTable from './user-table'
import Link from 'next/link'
import { ChevronLeft } from '@carbon/icons-react'
import { requireAdminRole } from '@/utils/admin-security'
import { calculateLoanDebt } from '@/utils/loan-utils'
import { getShareholdersConfig } from '@/utils/finance-utils'

export default async function UserManagementPage({
    searchParams
}: {
    searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string }>
}) {
    const params = await searchParams
    const queryStr = params.q || ''
    const statusFilter = params.status || 'all'
    const page = parseInt(params.page || '1')
    const sort = params.sort || 'newest'
    const pageSize = 25

    const { roles: currentUserRoles } = await requireAdminRole(['superadmin', 'owner', 'admin_comptable', 'support_n1'])
    const isSupport = currentUserRoles.includes('support_n1') && !currentUserRoles.includes('superadmin') && !currentUserRoles.includes('owner') && !currentUserRoles.includes('admin_comptable');

    const supabase = await createClient()

    // Build Users Query
    let usersQuery = supabase
        .from('users')
        .select('*', { count: 'exact' })

    // Apply Filters
    if (queryStr) {
        usersQuery = usersQuery.or(`email.ilike.%${queryStr}%,nom.ilike.%${queryStr}%,prenom.ilike.%${queryStr}%,id.ilike.%${queryStr}%`)
    }

    if (statusFilter === 'active') {
        usersQuery = usersQuery.eq('is_account_active', true)
    } else if (statusFilter === 'inactive') {
        usersQuery = usersQuery.eq('is_account_active', false)
    }

    // Apply Sort
    if (sort === 'oldest') {
        usersQuery = usersQuery.order('created_at', { ascending: true })
    } else {
        usersQuery = usersQuery.order('created_at', { ascending: false })
    }

    // Apply Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data: users, count } = await usersQuery.range(from, to)

    const { data: activeLoans } = await supabase
        .from('prets')
        .select('user_id, amount, amount_paid, service_fee, created_at, status, due_date')
        .in('status', ['active', 'overdue'])

    const userDebts = new Map<string, number>()
    activeLoans?.forEach(l => {
        const { totalDebt } = calculateLoanDebt(l as any)
        userDebts.set(l.user_id, (userDebts.get(l.user_id) || 0) + totalDebt)
    })

    const shareholders = await getShareholdersConfig(supabase)

    const rows = users?.map(u => ({
        id: u.id,
        email: u.email,
        name: isSupport ? (u.prenom || '') : `${u.prenom || ''} ${u.nom || ''}`,
        whatsapp: isSupport ? '***' : u.whatsapp,
        roles: u.roles || [],
        is_active: u.is_account_active,
        has_active_loans: userDebts.has(u.id) && userDebts.get(u.id)! > 0,
        debt: userDebts.get(u.id) || 0,
        risk_class: u.risk_class
    })) || []

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <Link href="/admin/super" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/10 transition-all mb-8 group">
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Centre de Contrôle
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Gouvernance.</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed max-w-xl">
                            Accès critique et administration des privilèges de la plateforme Creditly.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-slate-900/50 border border-white/5 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1 italic">Membres</p>
                            <p className="text-white font-black text-xl italic leading-none">{count || 0}</p>
                        </div>

                        <Link href="/admin/super/users/active-loans" className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all group">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1 italic group-hover:scale-105 transition-transform">Prêts Actifs</p>
                            <p className="text-white font-black text-xl italic leading-none">
                                {rows.filter(r => r.has_active_loans).length}
                            </p>
                        </Link>
                    </div>
                </div>

                <div className="glass-panel overflow-hidden bg-slate-900/50 border-white/5 shadow-2xl">
                    <UserManagementTable rows={rows} currentUserRoles={currentUserRoles as any} initialShareholders={shareholders} />
                </div>
            </div>
        </div>
    )
}
