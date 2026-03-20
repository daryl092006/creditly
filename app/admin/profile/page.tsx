import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UserProfileForm } from './UserProfileForm'
import { WithdrawalButton } from './WithdrawalButton'
import { Time, CheckmarkFilled, Wallet } from '@carbon/icons-react'

export default async function AdminProfilePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/auth/login')
    }

    // Admins only
    const roles = (profile.roles || []) as string[]
    const isAdmin = roles.some(r => r !== 'client')
    if (roles.length === 0 || !isAdmin) {
        return redirect('/client/dashboard')
    }

    // 1. Fetch Performance Metrics
    const FEE_START_DATE = new Date('2026-03-09T00:00:00')
    const { data: loans } = await supabase
        .from('prets')
        .select('id, status, created_at')
        .eq('admin_id', profile.id)
        .gte('created_at', FEE_START_DATE.toISOString())

    const totalApproved = loans?.filter(l => ['approved', 'active', 'paid', 'overdue'].includes(l.status)).length || 0
    const totalFullyPaid = loans?.filter(l => l.status === 'paid').length || 0

    // 2. Fetch Commissions & Realized Balance
    const { data: commissions } = await supabase
        .from('admin_commissions')
        .select('amount, type, loan:loan_id(status)')
        .eq('admin_id', profile.id)

    const { data: withdrawals } = await supabase
        .from('admin_withdrawals')
        .select('amount, status')
        .eq('admin_id', profile.id)
        .in('status', ['pending', 'approved'])

    // Distinction Gain Réalisé (Payé) vs Gain Potentiel (Actif/Overdue)
    const realizedGains = commissions?.filter((c: any) =>
        c.loan?.status === 'paid' || c.type === 'repayment_reward'
    ).reduce((acc, c) => acc + Number(c.amount), 0) || 0

    const unrealizedGains = commissions?.filter((c: any) =>
        ['active', 'overdue', 'approved'].includes(c.loan?.status) && c.type !== 'repayment_reward'
    ).reduce((acc, c) => acc + Number(c.amount), 0) || 0

    const totalWithdrawn = withdrawals?.reduce((acc, w) => acc + Number(w.amount), 0) || 0
    const withdrawableBalance = Math.max(0, realizedGains - totalWithdrawn)

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container max-w-6xl border-slate-800">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Dashboard Gestionnaire</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Situation financière et impact opérationnel.</p>
                    </div>
                </header>

                {/* Financial Overview - Detailed Logic */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="glass-panel p-6 bg-blue-600/10 border-blue-500/20 shadow-xl shadow-blue-500/5 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Wallet size={48} />
                        </div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic mb-2">Solde Retirable</p>
                        <p className="text-4xl font-black text-blue-500 italic tracking-tighter">
                            {withdrawableBalance.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-700 ml-1 uppercase">FCFA</span>
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold mt-3 italic leading-tight uppercase">
                            Argent prêt à être retiré. <br />(Dossiers clôturés)
                        </p>
                    </div>

                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2">En Attente (Provisions)</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">
                            {unrealizedGains.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-700 ml-1 uppercase">FCFA</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold mt-2 italic uppercase">Gains validés au remboursement</p>
                    </div>

                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2">Prêts Clôturés</p>
                        <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">
                            {totalFullyPaid} <span className="text-xs text-slate-700 not-italic uppercase ml-1">/ {totalApproved}</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold mt-2 italic uppercase">Dossiers remboursés à 100%</p>
                    </div>

                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex flex-col justify-center gap-3">
                        <WithdrawalButton balance={withdrawableBalance} />
                        <p className="text-[8px] text-center font-black text-slate-700 uppercase tracking-widest italic animate-pulse">
                            {withdrawableBalance > 0 ? 'Retrait disponible' : 'Solde nul'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2">
                        <div className="glass-panel p-8 md:p-12 bg-slate-900/50 border-slate-800">
                            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-6 rounded-2xl mb-10 flex items-start gap-5">
                                <div className="p-3 bg-blue-500/20 rounded-xl">
                                    <Time size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest italic mb-2">Règle des Commissions</h4>
                                    <p className="text-xs font-bold leading-relaxed text-slate-100">
                                        Les gains liés aux dossiers de prêt sont "provisoires" tant que l'emprunteur n'a pas soldé sa dette.
                                        Dès que le prêt passe en statut <span className="text-emerald-500 font-black">PAYÉ</span>, vos gains basculent dans votre
                                        solde retirable. Les gains sur remboursements sont eux immédiats.
                                    </p>
                                </div>
                            </div>

                            <UserProfileForm profile={profile} />
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest italic mb-6 flex items-center gap-2">
                                <CheckmarkFilled size={16} /> Historique des Gains
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase italic">Gains Bruts Cumulés</p>
                                    <p className="text-sm font-black text-white italic">{(realizedGains + unrealizedGains).toLocaleString('fr-FR')} F</p>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase italic">Retraits Effectués</p>
                                    <p className="text-sm font-black text-emerald-500 italic">-{totalWithdrawn.toLocaleString('fr-FR')} F</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/10 text-center space-y-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto text-blue-500">
                                <Wallet size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 italic">
                                Besoin d'aide sur vos paiements ? <br />
                                <span className="text-blue-500 border-b border-blue-500/30 cursor-pointer">Contacter le comptable</span>
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
