
import { createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import Link from 'next/link'
import { Warning, ChevronRight, User, Time, WarningAlt, InformationSquare } from '@carbon/icons-react'

export const dynamic = 'force-dynamic'

export default async function FraudAlertsPage() {
    await requireAdminRole(['superadmin', 'owner'])
    const supabase = await createAdminClient()

    // Query audit_logs for fraud actions
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*, actor:actor_user_id(id, nom, prenom, email)')
        .in('action_type', ['FRAUD_DUPLICATE_PROOF_HASH', 'FRAUD_DUPLICATE_TRANSACTION_REF'])
        .order('created_at', { ascending: false })

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                                <Warning size={24} />
                            </span>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic">Centre de Vigilance</h1>
                        </div>
                        <p className="text-slate-500 font-bold italic">Gestion des tentatives de fraude et investigations</p>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black text-red-500 uppercase italic tracking-widest">{logs?.length || 0} Incident(s) détecté(s)</span>
                    </div>
                </header>

                <div className="space-y-4">
                    {logs?.map((log) => (
                        <Link
                            key={log.id}
                            href={`/admin/super/fraud-alerts/${log.id}`}
                            className="block group"
                        >
                            <div className="glass-panel p-6 bg-slate-900 border-slate-800 hover:border-red-500/40 transition-all group-hover:bg-slate-900/60 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    <ChevronRight size={20} className="text-red-500" />
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-5">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${log.action_type?.includes('REF') ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            <WarningAlt size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 italic">
                                                {log.action_type === 'FRAUD_DUPLICATE_PROOF_HASH' ? 'DOUBLON DE PREUVE (FILE HASH)' : 'DOUBLON DE RÉFÉRENCE (TXN REF)'}
                                            </p>
                                            <h2 className="text-lg font-black text-white italic uppercase tracking-tight group-hover:text-red-500 transition-colors">
                                                {log.actor?.prenom} {log.actor?.nom}
                                            </h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">{log.actor?.email}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                                                <span className="text-[10px] font-bold text-slate-400 italic">ID: {log.actor_user_id?.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:flex items-center gap-8 text-right">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-600 uppercase italic leading-none">Référence</p>
                                            <p className="text-sm font-black text-white italic tabular-nums">
                                                {log.new_value_json?.transaction_reference || log.new_value_json?.proof_hash?.substring(0, 10) || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-600 uppercase italic leading-none">Date détection</p>
                                            <p className="text-sm font-black text-slate-400 italic">
                                                {new Date(log.created_at).toLocaleDateString('fr-FR')} à {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {(!logs || logs.length === 0) && (
                        <div className="py-20 text-center glass-panel bg-slate-900 border-slate-800 border-dashed border-2">
                            <InformationSquare size={32} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 font-bold italic tracking-tighter uppercase">Aucun incident de fraude récent détecté.</p>
                            <p className="text-[10px] text-slate-600 italic mt-2 uppercase tracking-widest">Le système de vigilance est opérationnel.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
