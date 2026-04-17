'use client'

import { useState } from 'react'
import { ArrowRight, View, ViewOff } from '@carbon/icons-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { Logo } from '@/app/components/ui/Logo'

import { Suspense } from 'react'

function SignupForm() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Form data
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        whatsapp: '',
        email: '',
        password: '',
        birth_date: '',
        profession: '',
        guarantor_prenom: '',
        guarantor_nom: '',
        guarantor_whatsapp: ''
    })

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 transition-colors duration-300 py-20">
            <div className="glass-panel p-8 md:p-12 w-full max-w-xl animate-fade-in relative overflow-hidden mt-10">
                <div className="flex flex-col items-center mb-12">
                    <Logo size="lg" className="scale-125 mb-6" />
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] text-center">
                        Rejoignez l&apos;Élite • Financement Instantané
                    </p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-black animate-shake">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={async (e) => {
                    e.preventDefault()
                    setIsSubmitting(true)

                    try {
                        const formDataValues = new FormData(e.currentTarget)
                        const response = await fetch('/api/auth/signup', {
                            method: 'POST',
                            body: formDataValues,
                        })

                        // Try to parse JSON response
                        let data
                        try {
                            data = await response.json()
                        } catch (jsonError) {
                            // If JSON parsing fails, show a generic error
                            window.location.href = `/auth/signup?error=${encodeURIComponent('Erreur de communication avec le serveur. Veuillez réessayer.')}`
                            return
                        }

                        if (!response.ok) {
                            // Show the specific error message from the server
                            const errorMessage = data.error || 'Une erreur est survenue lors de l\'inscription'
                            window.location.href = `/auth/signup?error=${encodeURIComponent(errorMessage)}`
                            return
                        }

                        // Success - redirect to login with message
                        window.location.href = `/auth/login?message=${encodeURIComponent(data.message)}`
                    } catch (error) {
                        // Network error or other unexpected error
                        const errorMessage = error instanceof Error && error.message
                            ? `Erreur de connexion: ${error.message}`
                            : 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
                        window.location.href = `/auth/signup?error=${encodeURIComponent(errorMessage)}`
                    } finally {
                        setIsSubmitting(false)
                    }
                }} className="space-y-8">
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] italic border-b border-white/5 pb-2">Mes Infos</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Prénom</label>
                                <input
                                    name="prenom"
                                    type="text"
                                    placeholder="Jean"
                                    required
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-200 bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Nom</label>
                                <input
                                    name="nom"
                                    type="text"
                                    placeholder="Dupont"
                                    required
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-200 bg-white/5"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Date de naissance</label>
                                <input
                                    name="birth_date"
                                    type="date"
                                    required
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-200 bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Profession</label>
                                <input
                                    name="profession"
                                    type="text"
                                    placeholder="Ex: Ingénieur, Commerçant"
                                    required
                                    value={formData.profession}
                                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-200 bg-white/5"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">WhatsApp <span className="text-blue-500 font-bold lowercase italic">(Indicatif obligatoire, ex: +229)</span></label>
                            <input
                                name="whatsapp"
                                type="text"
                                placeholder="+229 00 00 00 00"
                                required
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Votre e-mail</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="votre@email.com"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Mon mot de passe</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 pr-14"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2"
                                >
                                    {showPassword ? <ViewOff size={20} /> : <View size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic border-b border-white/5 pb-2">Ma personne de référence</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Prénom (Référence)</label>
                                <input
                                    name="guarantor_prenom"
                                    type="text"
                                    placeholder="Pierre"
                                    required
                                    value={formData.guarantor_prenom}
                                    onChange={(e) => setFormData({ ...formData, guarantor_prenom: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-200 bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Nom (Référence)</label>
                                <input
                                    name="guarantor_nom"
                                    type="text"
                                    placeholder="Martin"
                                    required
                                    value={formData.guarantor_nom}
                                    onChange={(e) => setFormData({ ...formData, guarantor_nom: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-white/5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-200 bg-white/5"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">WhatsApp (Référence)</label>
                            <input
                                name="guarantor_whatsapp"
                                type="text"
                                placeholder="+229 00 00 00 00"
                                required
                                value={formData.guarantor_whatsapp}
                                onChange={(e) => setFormData({ ...formData, guarantor_whatsapp: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5"
                            />
                        </div>
                    </div>

                    <ActionButton
                        type="submit"
                        loading={isSubmitting}
                        loadingText="Création en cours..."
                        className="w-full py-6 active:scale-95 group transition-all"
                    >
                        <span>Créer mon compte</span>
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </ActionButton>

                    <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest px-4 italic leading-relaxed">
                        En cliquant sur "Créer mon compte", vous acceptez nos{' '}
                        <Link href="/politiques" className="text-blue-500 hover:underline">Politiques de Confidentialité et de Remboursement</Link>.
                    </p>

                    <div className="text-center mt-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Déjà un compte ?{' '}
                            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 transition-colors">Se connecter</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={null}>
            <SignupForm />
        </Suspense>
    )
}
