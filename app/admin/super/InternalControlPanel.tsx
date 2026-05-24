'use client'

import React, { useState } from 'react'
import { Warning, Security, Renew } from '@carbon/icons-react'
import { batchRecalculateRiskScores } from '@/app/admin/risk-actions'

interface RiskStats {
    exposureRate: number
    decisionStatus: string
    fraudSuspicionCount: number
    riskDistribution: { label: string, count: number, color: string }[]
    recentAuditLogs: any[]
}

export function InternalControlPanel({ stats }: { stats: RiskStats }) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ updated?: number, errors?: number, error?: string } | null>(null)

    const statusColors: any = {
        'NORMAL': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        'CAUTION': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        'RESTRICTED': 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        'PAUSED': 'text-red-500 bg-red-500/10 border-red-500/20'
    }

    const handleRecalculate = async () => {
        setLoading(true)
        setResult(null)
        try {
            const res = await batchRecalculateRiskScores()
            setResult(res)
        } catch {
            setResult({ error: 'Erreur inattendue.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center text-xs font-black shadow-inner">R</span>
                    Contrôle Interne & Risques
                </h3>
                <button
                    onClick={handleRecalculate}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed italic"
                >
                    <Renew size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Calcul...' : 'Recalculer'}
                </button>
            </div>

            {result && (
                <div className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${result.error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {result.error ? result.error : `✓ ${result.updated} utilisateurs mis à jour${result.errors ? ` · ${result.errors} erreurs` : ''}`}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {/* Exposure Card */}
                <div className="glass-panel p-6 bg-slate-900 border-slate-800 border-t-2 border-t-orange-500 shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Taux d'Exposition Plateforme</p>
                            <p className="text-4xl font-black text-white italic tracking-tighter">{stats.exposureRate.toFixed(1)}%</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[stats.decisionStatus] || statusColors['NORMAL']}`}>
                            {stats.decisionStatus}
                        </div>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div
                            className={`h-full transition-all duration-1000 ${stats.exposureRate > 85 ? 'bg-red-500' : stats.exposureRate > 70 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(stats.exposureRate, 100)}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-bold text-slate-600 mt-2 italic uppercase">Ratio Encours / Fonds Propres</p>
                </div>

                {/* Risk Distribution List */}
                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-4">Répartition des Scores de Confiance</p>
                    <div className="space-y-3">
                        {stats.riskDistribution.map((r, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }}></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase italic">{r.label}</span>
                                </div>
                                <span className="text-sm font-black text-white italic">{r.count}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] font-bold text-slate-600 mt-4 italic">
                        Total: {stats.riskDistribution.reduce((a, b) => a + b.count, 0)} utilisateurs
                    </p>
                </div>

                {/* Fraud Alerts */}
                {stats.fraudSuspicionCount > 0 && (
                    <div className="glass-panel p-4 bg-red-500/5 border-red-500/20 border-l-4 border-l-red-500">
                        <div className="flex items-center gap-3 text-red-500 mb-1">
                            <Warning size={16} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Alertes Fraude</p>
                        </div>
                        <p className="text-sm font-black text-white italic leading-tight">
                            {stats.fraudSuspicionCount} utilisateur(s) sous investigation
                        </p>
                    </div>
                )}

                {/* Audit Logs Quick View */}
                <div className="glass-panel p-6 bg-slate-900/30 border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Journal d'Audit Récent</p>
                        <Security size={16} className="text-slate-600" />
                    </div>
                    <div className="space-y-4">
                        {stats.recentAuditLogs.slice(0, 5).map((log, i) => (
                            <div key={i} className="border-l border-white/5 pl-4 pb-1">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">{log.action_type?.replace(/_/g, ' ')}</span>
                                    <span className="text-[8px] font-bold text-slate-600 italic">
                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 italic">
                                    Par {(log.actor as any)?.prenom ? `${(log.actor as any).prenom}` : log.actor_role || '—'}
                                </p>
                            </div>
                        ))}
                        {stats.recentAuditLogs.length === 0 && (
                            <p className="text-[9px] font-bold text-slate-600 italic">Aucune action enregistrée.</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
