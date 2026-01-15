'use client'

import { useState } from 'react'
import { updateContactInfo } from '../user-actions'

export default function ContactInfoForm({ defaultWhatsapp }: { defaultWhatsapp?: string }) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    return (
        <form action={async (formData) => {
            setIsSubmitting(true)
            try {
                await updateContactInfo(formData)
            } finally {
                setIsSubmitting(false)
            }
        }} className="space-y-4">
            <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro WhatsApp</label>
                <div className="flex gap-2">
                    <input
                        name="whatsapp"
                        type="text"
                        defaultValue={defaultWhatsapp || ''}
                        placeholder="+229 00 00 00 00"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50 min-w-[60px]"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        ) : (
                            'OK'
                        )}
                    </button>
                </div>
                {!defaultWhatsapp && (
                    <p className="text-[8px] font-bold text-amber-500/80 italic mt-1 uppercase tracking-tight">Veuillez renseigner votre numéro</p>
                )}
            </div>
        </form>
    )
}
