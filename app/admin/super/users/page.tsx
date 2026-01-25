import { createClient } from '@/utils/supabase/server'
import UserManagementTable from './user-table'
import Link from 'next/link'
import { ChevronLeft } from '@carbon/icons-react'

export default async function UserManagementPage() {
    const supabase = await createClient()

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching users:', error)
    }

    const rows = users?.map(u => ({
        id: u.id,
        email: u.email,
        name: `${u.prenom || ''} ${u.nom || ''}`,
        whatsapp: u.whatsapp,
        role: u.role,
        is_active: u.is_account_active,
        has_active_loans: false // Temporarily disabled join
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
                            <p className="text-white font-black text-xl italic leading-none">{rows.length}</p>
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
                    <UserManagementTable rows={rows} />
                </div>
            </div>
        </div>
    )
}
