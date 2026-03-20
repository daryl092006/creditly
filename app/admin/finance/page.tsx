/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { Currency, Wallet, Document, Time, ArrowUpRight, ArrowDownRight, UserMultiple, CheckmarkFilled, Warning, List, User } from '@carbon/icons-react'

export default async function FinanceAuditPage() {
    // 1. Security Check
    await requireAdminRole(['admin_comptable', 'superadmin', 'owner'])

    const supabase = await createClient()

    // 2. Fetch Data Sources (Totals)
    // Protection contre erreur table manquante
    const { data: subs, error: subsErr } = await supabase.from('user_subscriptions').select('*, plan:abonnements(price, name), user:user_id(prenom, nom)').eq('status', 'active')
    if (subsErr) console.error("Subs Error:", subsErr)

    const { data: loans, error: loansErr } = await supabase.from('prets').select('amount, status, amount_paid, service_fee, created_at, user:user_id(prenom, nom)')
    if (loansErr) console.error("Loans Error:", loansErr)
    const totalDisbursed = loans?.filter(l => ['active', 'paid', 'overdue'].includes(l.status)).reduce((acc, l) => acc + Number(l.amount), 0) || 0
    const realizedFees = (loans?.filter(l => l.status === 'paid').length || 0) * 500

    const { data: repayments, error: repErr } = await supabase.from('remboursements').select('amount_declared, status, surplus_amount, created_at, user:user_id(prenom, nom)')
    if (repErr) console.error("Repayments Error:", repErr)
    const totalPenaltiesCollected = repayments?.filter(r => r.status === 'verified').reduce((acc, r) => acc + (Number(r.surplus_amount) || 0), 0) || 0

    // Correction des JOINS : Utilisation de la colonne admin_id explicitement
    const { data: commissions, error: commErr } = await supabase.from('admin_commissions').select('*, admin:admin_id(prenom, nom), loan:loan_id(status)')
    if (commErr) console.error("Commissions Error:", commErr)

    const { data: withdrawals, error: withErr } = await supabase.from('admin_withdrawals').select('*, admin:admin_id(prenom, nom)')
    if (withErr) console.error("Withdrawals Error:", withErr)

    // 2.5. Admin Ledger
    const { data: admins } = await supabase.from('users').select('id, nom, prenom, roles').not('roles', 'cs', '{"client"}')
    const adminLedger = admins?.map((admin: any) => {
        const adminCommsRaw = commissions?.filter(c => c.admin_id === admin.id) || []
        const realized = adminCommsRaw.filter((c: any) => c.loan?.status === 'paid' || c.type === 'repayment_reward').reduce((acc, c) => acc + Number(c.amount), 0) || 0
        const provisions = adminCommsRaw.filter((c: any) => ['active', 'overdue', 'approved'].includes(c.loan?.status) && c.type !== 'repayment_reward').reduce((acc, c) => acc + Number(c.amount), 0) || 0
        const paid = withdrawals?.filter(w => w.admin_id === admin.id && w.status === 'approved').reduce((acc, w) => acc + Number(w.amount), 0) || 0
        const pending = withdrawals?.filter(w => w.admin_id === admin.id && w.status === 'pending').reduce((acc, w) => acc + Number(w.amount), 0) || 0
        return { ...admin, realized, provisions, paid, pending, balance: realized - paid - pending }
    }).sort((a: any, b: any) => b.realized - a.realized) || []

    const journal: any[] = []
    subs?.forEach(s => journal.push({ date: s.created_at, type: 'RECETTE', category: 'Abonnement', label: `Abonnement ${s.plan?.name}`, amount: s.plan?.price, person: s.user ? `${s.user.prenom} ${s.user.nom}` : 'Utilisateur Inconnu', color: 'text-emerald-500' }))
    repayments?.filter(r => r.status === 'verified').forEach(r => journal.push({ date: r.created_at, type: 'RECETTE', category: 'Remboursement', label: `Remboursement Prêt`, amount: r.amount_declared, person: r.user ? `${r.user.prenom} ${r.user.nom}` : 'Utilisateur Inconnu', color: 'text-emerald-500' }))
    withdrawals?.forEach(w => journal.push({ date: w.created_at, type: 'SORTIE', category: 'Retrait Admin', label: `Retrait Gains (${w.status})`, amount: -w.amount, person: w.admin ? `${w.admin.prenom} ${w.admin.nom}` : 'Admin Inconnu', color: w.status === 'approved' ? 'text-red-500' : 'text-slate-500' }))
    commissions?.forEach(c => journal.push({ date: c.created_at, type: 'EXPENSE', category: 'Commission', label: `Action ${c.type.replace('_reward', '')}`, amount: -c.amount, person: c.admin ? `${c.admin.prenom} ${c.admin.nom}` : 'Admin Inconnu', color: 'text-purple-400' }))

    const sortedJournal = journal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50)

    const totalRealizedCommissions = commissions?.filter((c: any) => c.loan?.status === 'paid' || c.type === 'repayment_reward').reduce((acc, c) => acc + Number(c.amount), 0) || 0
    const totalProvisions = commissions?.filter((c: any) => ['active', 'overdue', 'approved'].includes(c.loan?.status) && c.type !== 'repayment_reward').reduce((acc, c) => acc + Number(c.amount), 0) || 0
    const grossRevenue = (Number(subs?.reduce((acc, s: any) => acc + (Number(s.plan?.price) || 0), 0)) || 0) + realizedFees + totalPenaltiesCollected
    const netProfit = grossRevenue - totalRealizedCommissions

    if (withErr || commErr) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-2xl font-black text-red-500 mb-4">ERREUR DE SYNCHRONISATION</h1>
                <p className="text-slate-500 italic">Veuillez vérifier que les nouvelles tables système ont été créées.</p>
                <div className="mt-8 p-4 bg-slate-900 border border-white/5 inline-block rounded-xl text-left font-mono text-[10px] text-red-400">
                    {commErr?.message || withErr?.message}
                </div>
            </div>
        )
    }

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Currency size={20} />
                        </div>
                        <h1 className="text-4xl font-black premium-gradient-text tracking-tight uppercase italic">Comptabilité Générale</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Revenus Réels', val: grossRevenue, sub: 'Sommes déjà sécurisées (Paid)', icon: <CheckmarkFilled size={20} className="text-emerald-500" /> },
                        { label: 'Provision Gains (Out)', val: totalProvisions, sub: 'À payer post-remboursement', icon: <Time size={20} className="text-blue-500" /> },
                        { label: 'Sorties Cash (Prêts)', val: totalDisbursed, sub: 'Capital déboursé sur prêts actifs', icon: <ArrowDownRight size={20} className="text-red-500/50" /> },
                        { label: 'Marge Net Réalisée', val: netProfit, sub: 'Profit net après commissions payées', icon: <Wallet size={20} className="text-emerald-400" /> }
                    ].map((kpi, i) => (
                        <div key={i} className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-all shadow-xl">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-2 rounded-lg bg-slate-950/50 border border-white/5">{kpi.icon}</div>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-1">{kpi.label}</h4>
                            <p className="text-2xl font-black text-white italic tracking-tighter">
                                {kpi.val.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-700 ml-1 uppercase">FCFA</span>
                            </p>
                        </div>
                    ))}
                </div>

                <section className="mb-12">
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center text-xs font-black shadow-inner">L</span>
                        Balance des Comptes Administrateurs
                    </h3>
                    <div className="glass-panel overflow-x-auto bg-slate-900/50 border-slate-800 shadow-2xl">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-600 italic">
                                    <th className="px-6 py-4">Nom</th>
                                    <th className="px-6 py-4 text-emerald-500 font-bold">Gain Réalisé</th>
                                    <th className="px-6 py-4 text-blue-500 font-bold">Provision (Actifs)</th>
                                    <th className="px-6 py-4 text-emerald-600">Déjà Versé</th>
                                    <th className="px-6 py-4 text-right text-white">Solde Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {adminLedger?.map((ledger: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-blue-500 uppercase">
                                                {(ledger.prenom || '')[0]}{(ledger.nom || '')[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white italic uppercase">{ledger.prenom} {ledger.nom}</p>
                                                <p className="text-[9px] font-black text-slate-700 tracking-widest italic">{ledger.roles?.[0]?.replace('admin_', '')}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-black text-emerald-500/80 italic">{ledger.realized.toLocaleString('fr-FR')} F</td>
                                        <td className="px-6 py-4 text-[11px] font-black text-blue-500/80 italic">{ledger.provisions.toLocaleString('fr-FR')} F</td>
                                        <td className="px-6 py-4 text-[11px] font-black text-emerald-500/40 italic">{ledger.paid.toLocaleString('fr-FR')} F</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-lg font-black italic tracking-tighter ${ledger.balance > 0 ? 'text-blue-500 animate-pulse' : 'text-slate-700'}`}>
                                                {ledger.balance.toLocaleString('fr-FR')} F
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xs font-black shadow-inner">J</span>
                        Journal des Opérations Financières (50 derniers)
                    </h3>
                    <div className="glass-panel overflow-x-auto bg-slate-900/50 border-slate-800 shadow-2xl">
                        <table className="w-full text-left min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-600 italic">
                                    <th className="px-6 py-4 whitespace-nowrap">Date & Heure</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Type / Catégorie</th>
                                    <th className="px-6 py-4">Désignation</th>
                                    <th className="px-6 py-4">Tiers (Administrateur / Client)</th>
                                    <th className="px-6 py-4 text-right">Montant Flux</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {sortedJournal.map((entry, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-blue-500">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 italic">
                                                <Time size={12} /> {new Date(entry.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${entry.type === 'RECETTE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{entry.category}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[11px] font-bold text-slate-400 italic leading-tight">{entry.label}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-white uppercase italic truncate max-w-[150px]">{entry.person}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className={`text-sm font-black italic tracking-tighter ${entry.color}`}>
                                                {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('fr-FR')} <span className="text-[8px] not-italic opacity-50">F</span>
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}
