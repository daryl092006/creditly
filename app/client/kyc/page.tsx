'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Identification, Camera, ArrowRight, ArrowLeft, CheckmarkFilled, Warning } from '@carbon/icons-react'
import { submitKyc } from './actions'

export default function KYCPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [files, setFiles] = useState<{ idCard: string | null, selfie: string | null, residence: string | null }>({
        idCard: null,
        selfie: null,
        residence: null
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'selfie' | 'residence') => {
        const file = e.target.files?.[0]
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file.name }))
            setError(null)
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true)
        setError(null)
        try {
            await submitKyc(formData)
        } catch (error) {
            setError((error as Error).message || "Une erreur est survenue lors de l&apos;envoi.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container">
                {/* Header Context */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-20 text-left">
                    <div className="space-y-6">
                        <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Operations Center
                        </Link>
                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                            Vérification <br /><span className="premium-gradient-text uppercase">Identité.</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-lg max-w-xl italic">
                            La sécurité de votre patrimoine commence par une vérification rigoureuse.
                        </p>
                    </div>

                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex items-center gap-6 animate-fade-in group hover:border-blue-500/30 transition-all">
                        <div className="w-14 h-14 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                            <Identification size={32} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Traitement</p>
                            <p className="text-xl font-black text-white uppercase italic tracking-tighter">24 Heures <span className="text-[10px] not-italic text-slate-600 tracking-normal ml-1">MAX</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-stretch">
                    {/* Information Context */}
                    <div className="space-y-12">
                        <div className="space-y-10">
                            {[
                                { t: 'Confidentialité Totale', d: 'Vos données sont chiffrées selon les protocoles bancaires les plus stricts.', icon: <CheckmarkFilled size={24} />, c: 'blue' },
                                { t: 'Support Prioritaire', d: 'Une équipe dédiée assiste chaque soumission pour éviter tout délai.', icon: <CheckmarkFilled size={24} />, c: 'blue' },
                                { t: 'Historique Inaltérable', d: 'Chaque document est stocké avec une empreinte numérique sécurisée.', icon: <CheckmarkFilled size={24} />, c: 'blue' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-8 group text-left">
                                    <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-500 shrink-0 shadow-xl`}>
                                        {item.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-black text-white uppercase italic tracking-wider leading-none mb-2">{item.t}</h4>
                                        <p className="text-slate-500 font-bold text-sm leading-relaxed italic">{item.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="glass-panel p-10 bg-slate-900 border-slate-800 text-left relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[60px] group-hover:bg-blue-600/10 transition-colors"></div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 italic">Note de l&apos;Expert</p>
                            <p className="text-lg font-black text-white leading-relaxed italic opacity-80 tracking-tight">
                                &quot;La clarté des documents est la clé d&apos;une validation <span className="text-blue-500">instantanée</span>. Assurez-vous d&apos;un éclairage suffisant.&quot;
                            </p>
                        </div>
                    </div>

                    {/* Form Submission */}
                    <div className="glass-panel p-10 md:p-16 text-left bg-slate-900/50 border-slate-800">
                        {error && (
                            <div className="mb-10 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center gap-4 text-xs font-black uppercase tracking-widest animate-shake">
                                <Warning size={24} />
                                {error}
                            </div>
                        )}

                        <form action={handleSubmit} className="space-y-10">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Pièce d&apos;Identité Officielle</label>
                                <div className="relative group">
                                    <input
                                        name="id_card"
                                        type="file"
                                        accept="image/*"
                                        required
                                        onChange={(e) => handleFileChange(e, 'idCard')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    <div className={`border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-500 bg-white/5 ${files.idCard ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-600/5'}`}>
                                        {files.idCard ? (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-xl">
                                                    <CheckmarkFilled size={24} />
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">{files.idCard}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Identification size={32} className="text-slate-600 group-hover:text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                                                <span className="text-[10px] font-black text-slate-500 group-hover:text-white uppercase tracking-[0.3em] transition-colors italic">Téléverser ID</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Selfie Haute Définition</label>
                                <div className="relative group">
                                    <input
                                        name="selfie"
                                        type="file"
                                        accept="image/*"
                                        required
                                        onChange={(e) => handleFileChange(e, 'selfie')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    <div className={`border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-500 bg-white/5 ${files.selfie ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-600/5'}`}>
                                        {files.selfie ? (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-xl">
                                                    <CheckmarkFilled size={24} />
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">{files.selfie}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={32} className="text-slate-600 group-hover:text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                                                <span className="text-[10px] font-black text-slate-500 group-hover:text-white uppercase tracking-[0.3em] transition-colors italic">Capturer Selfie</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Preuve de Résidence</label>
                                <div className="relative group">
                                    <input
                                        name="proof_of_residence"
                                        type="file"
                                        accept="image/*,application/pdf"
                                        required
                                        onChange={(e) => handleFileChange(e, 'residence')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    <div className={`border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-500 bg-white/5 ${files.residence ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-600/5'}`}>
                                        {files.residence ? (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-xl">
                                                    <CheckmarkFilled size={24} />
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">{files.residence}</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-8 h-8 text-slate-600 group-hover:text-blue-500 mb-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                                <span className="text-[10px] font-black text-slate-500 group-hover:text-white uppercase tracking-[0.3em] transition-colors italic">Téléverser Preuve</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !files.idCard || !files.selfie || !files.residence}
                                className="premium-button w-full py-6 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Traitement sécurisé...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>Procéder à la soumission</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
