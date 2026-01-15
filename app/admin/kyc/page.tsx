import { createClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import AdminKycClientTable from './kyc-table'
import { CheckmarkFilled, CloseFilled } from '@carbon/icons-react'

export default async function AdminKycPage() {
    // Security Check
    await requireAdminRole(['admin_kyc', 'superadmin'])

    const supabase = await createClient()

    // 1. Fetch Pending Submissions (For Action)
    const { data: submissions } = await supabase
        .from('kyc_submissions')
        .select(`*, user:users!kyc_submissions_user_id_fkey(id, email, nom, prenom, whatsapp, telephone)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    // 2. Fetch History (Read-Only: Approved/Rejected)
    const { data: history } = await supabase
        .from('kyc_submissions')
        .select(`*, user:users!kyc_submissions_user_id_fkey(id, email, nom, prenom, whatsapp, telephone), admin:users!kyc_submissions_admin_id_fkey(email, nom, prenom, role, whatsapp)`)
        .in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false })
        .limit(50) // Limit history for performance

    const pendingRows = (submissions || []).map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        email: sub.user?.email,
        name: `${sub.user?.prenom} ${sub.user?.nom}`,
        whatsapp: sub.user?.whatsapp || sub.user?.telephone,
        date: sub.created_at,
        docs: [
            { type: 'id_card', url: sub.id_card_url },
            { type: 'selfie', url: sub.selfie_url },
            { type: 'proof_of_residence', url: sub.proof_of_residence_url }
        ]
    }))

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="admin-container">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Validation KYC</h1>
                    <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Contrôle de conformité et activation des comptes clients</p>
                </div>

                <div className="space-y-16">
                    {/* Pending Section */}
                    <section>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Dossiers en Attente ({pendingRows.length})
                        </h2>
                        {pendingRows.length === 0 ? (
                            <div className="glass-panel p-12 text-center text-slate-500 font-bold italic text-sm">Aucun dossier en attente</div>
                        ) : (
                            <AdminKycClientTable submissions={pendingRows} />
                        )}
                    </section>

                    {/* History Section (Read Only) */}
                    <section>
                        <h2 className="text-xl font-black text-slate-500 uppercase italic tracking-widest mb-6">Historique Récent</h2>
                        <div className="glass-panel overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900/50 text-xs uppercase font-black text-slate-500 tracking-widest">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Utilisateur</th>
                                            <th className="p-4 uppercase tracking-widest text-[10px]">Contact</th>
                                            <th className="p-4">Statut</th>
                                            <th className="p-4">Validé par</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {(history || []).map((item) => (
                                            <tr key={item.id} className="text-sm font-bold text-slate-300 hover:bg-white/5 transition-all group">
                                                <td className="p-4 italic text-slate-500">{new Date(item.reviewed_at || item.created_at).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-200 group-hover:text-white transition-colors">{item.user?.prenom} {item.user?.nom}</span>
                                                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">{item.user?.email}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {(item.user?.whatsapp || item.user?.telephone) ? (
                                                        <a
                                                            href={`https://wa.me/${(item.user.whatsapp || item.user.telephone).replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95"
                                                        >
                                                            <svg className="w-3.5 h-3.5 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                            <span className="text-[9px] font-black uppercase tracking-tight">WhatsApp</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest leading-none italic">Non renseigné</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {item.status === 'approved' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[9px] font-black tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                                            <CheckmarkFilled /> Approuvé
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 uppercase text-[9px] font-black tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                            <CloseFilled /> Rejeté
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {item.admin ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-300 group-hover:text-white transition-colors">{item.admin.prenom} {item.admin.nom}</span>
                                                                <span className="text-[10px] text-slate-600 uppercase tracking-wider">{item.admin.role}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-600 italic">Système</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!history || history.length === 0) && (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-600 italic text-xs uppercase tracking-widest">Aucun historique disponible</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
