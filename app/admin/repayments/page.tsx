import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import AdminRepaymentTable from './repayment-table'
import AdminCreateRepaymentWrapper from './AdminCreateRepaymentWrapper'
import Link from 'next/link'

export default async function AdminRepaymentPage({
    searchParams
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const params = await searchParams
    const statusFilter = params.status || 'pending'

    // Security Check
    const { role } = await requireAdminRole(['admin_repayment', 'superadmin', 'admin_comptable'])

    const supabase = await createClient()

    const { data: repayments } = await supabase
        .from('remboursements')
        .select(`
            *,
            loan:prets(amount, amount_paid),
            user:users!remboursements_user_id_fkey(email, nom, prenom, whatsapp, telephone),
            admin:users!remboursements_admin_id_fkey(email, nom, prenom, roles, whatsapp)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })

    const rows = repayments?.map(r => ({
        id: r.id,
        loan_id: r.loan_id,
        user_id: r.user_id,
        user: `${r.user?.prenom} ${r.user?.nom} (${r.user?.email})`,
        whatsapp: r.user?.whatsapp || r.user?.telephone,
        loan_amount: r.loan?.amount || 0,
        loan_amount_paid: r.loan?.amount_paid || 0,
        amount_declared: r.amount_declared,
        surplus_amount: r.surplus_amount || 0,
        proof_url: r.proof_url,
        date: r.created_at,
        status: r.status,
        admin: r.admin ? {
            name: `${r.admin.prenom} ${r.admin.nom}`,
            role: r.admin.roles?.[0],
            whatsapp: r.admin.whatsapp
        } : null
    })) || []

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
                        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl">
                            {[
                                { label: 'En attente', val: 'pending' },
                                { label: 'Validés', val: 'verified' },
                                { label: 'Rejetés', val: 'rejected' }
                            ].map(tab => (
                                <Link
                                    key={tab.val}
                                    href={`/admin/repayments?status=${tab.val}`}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === tab.val ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {tab.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass-panel overflow-hidden bg-slate-900/50 border-slate-800">
                    <AdminRepaymentTable rows={rows} />
                </div>
            </div>
        </div>
    )
}
