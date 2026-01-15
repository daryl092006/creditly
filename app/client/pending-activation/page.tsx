'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Identification, Hourglass, ArrowRight, Logout } from '@carbon/icons-react'
import Link from 'next/link'

export default function PendingActivationPage() {
    const [hasDocs, setHasDocs] = useState<boolean | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function checkKyc() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('kyc_submissions')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1)
                setHasDocs(data && data.length > 0)
            }
        }
        checkKyc()
    }, [])

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="max-w-2xl w-full text-center space-y-12 animate-fade-in relative">
                {/* Background Decor */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

                {/* Visual Cue */}
                <div className="relative inline-block z-10">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center relative group">
                        <div className="absolute inset-0 bg-blue-600/20 rounded-[2.5rem] blur-xl group-hover:bg-blue-600/30 transition-all duration-700 animate-pulse-slow"></div>
                        {hasDocs === false ? (
                            <Identification size={48} className="text-blue-500 relative z-10" />
                        ) : (
                            <Hourglass size={48} className="text-emerald-500 animate-spin-slow relative z-10" />
                        )}
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] uppercase italic">
                        {hasDocs === false ? (
                            <>Vérification <br /><span className="premium-gradient-text uppercase">Requise.</span></>
                        ) : (
                            <>Analyse <br /><span className="premium-gradient-text uppercase">En cours.</span></>
                        )}
                    </h1>
                    <p className="text-slate-500 font-bold text-lg max-w-lg mx-auto leading-relaxed italic">
                        {hasDocs === false
                            ? "Pour activer votre compte et accéder aux services de prêt, vous devez d'abord soumettre vos pièces justificatives."
                            : "Nos analystes vérifient actuellement la conformité de vos documents d'identité pour garantir la sécurité du réseau."
                        }
                    </p>
                </div>

                {hasDocs === false ? (
                    <div className="pt-8 relative z-10">
                        <Link
                            href="/client/kyc"
                            className="premium-button px-12 py-6 flex items-center justify-center gap-3 mx-auto active:scale-95"
                        >
                            <span className="font-black uppercase tracking-widest text-xs">Soumettre mon dossier</span>
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left relative z-10">
                        {[
                            { label: 'Dossier', status: 'Reçu', color: 'text-emerald-400' },
                            { label: 'File d\'attente', status: 'Prioritaire', color: 'text-blue-400' },
                            { label: 'Délai Max', status: '< 24h', color: 'text-white' }
                        ].map((step, i) => (
                            <div key={i} className="glass-panel p-6 bg-slate-900/50 border-slate-800 hover:border-white/10 transition-colors">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic leading-none">Statut {step.label}</p>
                                <p className={`text-xl font-black italic tracking-tight ${step.color}`}>{step.status}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-8 flex flex-col items-center gap-6 relative z-10">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic group hover:text-blue-500 transition-colors cursor-help underline underline-offset-4 decoration-slate-800 hover:decoration-blue-500/30">
                        Besoin d'assistance ? Conciergerie WhatsApp disponible 24/7.
                    </p>
                    <form action="/auth/actions" method="POST">
                        <input type="hidden" name="action" value="signout" />
                        <button
                            type="submit"
                            className="flex items-center gap-2 text-slate-600 hover:text-red-500 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        >
                            <Logout size={16} />
                            Quitter la session sécurisée
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
