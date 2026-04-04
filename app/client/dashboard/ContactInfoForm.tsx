'use client'

import { useState } from 'react'
import { updateContactInfo } from '../user-actions'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { Warning, CheckmarkFilled } from '@carbon/icons-react'

interface ContactInfoProps {
    defaultWhatsapp?: string | null;
    defaultNom?: string | null;
    defaultPrenom?: string | null;
    defaultBirthDate?: string | null;
    defaultProfession?: string | null;
    defaultGuarantorNom?: string | null;
    defaultGuarantorPrenom?: string | null;
    defaultGuarantorWhatsapp?: string | null;
    defaultAddress?: string | null;
    defaultCity?: string | null;
}

export default function ContactInfoForm(props: ContactInfoProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<boolean>(false)

    return (
        <form action={async (formData) => {
            setIsSubmitting(true)
            setError(null)
            setSuccess(false)
            try {
                const res = await updateContactInfo(formData)
                if (res?.error) {
                    setError(res.error)
                } else {
                    setSuccess(true)
                }
            } catch (e: any) {
                setError(e.message || "Une erreur est survenue")
            } finally {
                setIsSubmitting(false)
            }
        }} className="space-y-4">

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3 text-xs font-bold animate-shake">
                    <Warning size={16} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-3 text-xs font-bold animate-fade-in">
                    <CheckmarkFilled size={16} className="shrink-0" />
                    <p>Profil mis à jour avec succès.</p>
                </div>
            )}

            {/* Informations personnelles */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom <span className="text-red-500">*</span></label>
                    <input name="prenom" required type="text" defaultValue={props.defaultPrenom || ''} placeholder="Prénom" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom (Identique CNI) <span className="text-red-500">*</span></label>
                    <input name="nom" required type="text" defaultValue={props.defaultNom || ''} placeholder="Nom de famille" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de naissance <span className="text-red-500">*</span></label>
                    <input name="birth_date" required type="date" defaultValue={props.defaultBirthDate || ''} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Profession <span className="text-red-500">*</span></label>
                    <input name="profession" required type="text" defaultValue={props.defaultProfession || ''} placeholder="Votre métier" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Ville <span className="text-red-500">*</span></label>
                    <input name="city" required type="text" defaultValue={props.defaultCity || ''} placeholder="Ex: Cotonou" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse <span className="text-red-500">*</span></label>
                    <input name="address" required type="text" defaultValue={props.defaultAddress || ''} placeholder="Quartier, Maison..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro WhatsApp Personnel <span className="text-red-500">*</span></label>
                <input name="whatsapp" required type="text" defaultValue={props.defaultWhatsapp || ''} placeholder="+229 00 00 00 00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
            </div>

            {/* Personne de référence */}
            <div className="pt-2 border-t border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 italic">Personne de référence</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom (Réf) <span className="text-red-500">*</span></label>
                        <input name="guarantor_prenom" required type="text" defaultValue={props.defaultGuarantorPrenom || ''} placeholder="Prénom" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom (Réf) <span className="text-red-500">*</span></label>
                        <input name="guarantor_nom" required type="text" defaultValue={props.defaultGuarantorNom || ''} placeholder="Nom" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp (Réf) <span className="text-red-500">*</span></label>
                    <input name="guarantor_whatsapp" required type="text" defaultValue={props.defaultGuarantorWhatsapp || ''} placeholder="+229 00 00 00 00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all" />
                </div>
            </div>

            <div className="pt-2">
                <ActionButton
                    type="submit"
                    loading={isSubmitting}
                    loadingText="Enregistrement..."
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-colors"
                >
                    Soumettre pour vérification
                </ActionButton>
                {(!props.defaultWhatsapp || !props.defaultNom || !props.defaultPrenom || !props.defaultBirthDate || !props.defaultGuarantorWhatsapp || !props.defaultAddress || !props.defaultCity) && (
                    <p className="text-[9px] text-center font-bold text-red-500 italic mt-3 uppercase tracking-tight">Veuillez remplir toutes vos informations pour obtenir un prêt</p>
                )}
            </div>
        </form>
    )
}

