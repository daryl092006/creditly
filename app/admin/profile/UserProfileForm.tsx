'use client'

import { useState } from 'react'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { CheckmarkOutline, WarningFilled } from '@carbon/icons-react'
import { updateAdminProfile } from './actions'

export function UserProfileForm({ profile }: { profile: any }) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        setStatus(null)

        const result = await updateAdminProfile(formData)

        if (result.error) {
            setStatus({ type: 'error', message: result.error })
        } else {
            setStatus({ type: 'success', message: 'Profil mis à jour avec succès.' })
        }
        setIsSubmitting(false)
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-lg">
            {status?.type === 'success' && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                    <CheckmarkOutline size={16} /> {status.message}
                </div>
            )}
            {status?.type === 'error' && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-widest">
                    <WarningFilled size={16} /> {status.message}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email (Non modifiable)</label>
                <input
                    type="text"
                    defaultValue={profile.email}
                    disabled
                    className="w-full bg-slate-800/50 border border-slate-700 text-slate-400 font-bold px-4 py-3 rounded-xl cursor-not-allowed opacity-70"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Prénom</label>
                    <input
                        name="prenom"
                        type="text"
                        defaultValue={profile.prenom || ''}
                        required
                        className="w-full bg-slate-900 border border-slate-700 text-white font-bold px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nom de famille</label>
                    <input
                        name="nom"
                        type="text"
                        defaultValue={profile.nom || ''}
                        required
                        className="w-full bg-slate-900 border border-slate-700 text-white font-bold px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Numéro WhatsApp
                </label>
                <input
                    name="whatsapp"
                    type="tel"
                    defaultValue={profile.whatsapp || ''}
                    required
                    placeholder="+229 01020304"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-black px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 text-xl tracking-widest"
                />
            </div>

            <ActionButton
                type="submit"
                loading={isSubmitting}
                loadingText="Mise à jour..."
                className="w-full"
            >
                Sauvegarder le Profil
            </ActionButton>
        </form>
    )
}
