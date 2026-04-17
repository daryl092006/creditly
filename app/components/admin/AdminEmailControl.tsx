'use client'

import { useState } from 'react'
import { Email, CheckmarkFilled, Warning, Rocket, Activity, Send } from '@carbon/icons-react'
import { ActionButton } from '@/app/components/ui/ActionButton'

export default function AdminEmailControl({ stats }: { stats: any }) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    const handleTestEmail = async () => {
        setLoading(true)
        setStatus(null)
        try {
            const res = await fetch('/api/admin/audit?action=test-email')
            const data = await res.json()
            if (data.emailTest?.success) {
                setStatus({ type: 'success', message: 'Email de test envoyé avec succès !' })
            } else {
                setStatus({ type: 'error', message: 'Échec : ' + (data.emailTest?.error || 'Erreur inconnue') })
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'Erreur réseau lors du test.' })
        }
        setLoading(false)
    }

    return (
        <section className="space-y-6">
            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xs font-black shadow-inner">E</span>
                Infrastructure Email
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Cards */}
                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Service Resend (Admin)</p>
                            <p className="text-lg font-black text-white italic tracking-tighter">ALERTS SYSTÈME</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <CheckmarkFilled size={12} /> Live
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold italic">Utilisé pour : Inscriptions, demandes de prêt, KYC.</p>
                </div>

                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Service Gmail (Client)</p>
                            <p className="text-lg font-black text-white italic tracking-tighter">RELANCES & AUTO</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <CheckmarkFilled size={12} /> Prêt
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold italic">Utilisé pour : Relances J-3/J-1, Approbations.</p>
                </div>
            </div>

            {/* Test Action */}
            <div className="glass-panel p-6 bg-blue-600/5 border-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4">
                    <Rocket size={80} />
                </div>
                <div className="relative z-10 text-center md:text-left">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-tight">Vérifier la délivrabilité</h4>
                    <p className="text-[10px] text-slate-500 font-bold italic">Envoie un email de diagnostic à creditly001@gmail.com</p>
                </div>
                
                <div className="flex flex-col items-center gap-3 relative z-10">
                    <ActionButton 
                        onClick={handleTestEmail} 
                        loading={loading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Send size={16} /> Lancer le Test
                    </ActionButton>
                    {status && (
                        <p className={`text-[9px] font-black uppercase italic ${status.type === 'success' ? 'text-emerald-500' : 'text-red-500 animate-shake'}`}>
                            {status.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Logs/Stats Activity */}
            <div className="glass-panel bg-slate-900/50 border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Activity size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Dernières Activités Automatisées</span>
                    </div>
                </div>
                <div className="divide-y divide-white/5">
                    {stats?.lastReminders?.length > 0 ? (
                        stats.lastReminders.map((log: any, i: number) => (
                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                                        <Email size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white italic">{log.user_email}</p>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                            {log.type.replace(/_/g, ' ')} — {new Date(log.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                    ENVOYÉ
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-[10px] font-black text-slate-700 uppercase italic">Aucune relance automatique envoyée aujourd'hui.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
