'use client'

import { useState } from 'react'
import { Copy, CheckmarkFilled } from '@carbon/icons-react'

export default function CopyablePhone({ label, phone }: { label: string; phone: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(phone.replace(/\s/g, ''))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for mobile
            const el = document.createElement('textarea')
            el.value = phone.replace(/\s/g, '')
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-blue-500/20 transition-all">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
            <div className="flex items-center gap-3">
                <span className="text-sm font-black text-white tracking-widest">{phone}</span>
                <button
                    onClick={handleCopy}
                    title="Copier le numéro"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                        copied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                    }`}
                >
                    {copied ? (
                        <>
                            <CheckmarkFilled size={12} />
                            Copié !
                        </>
                    ) : (
                        <>
                            <Copy size={12} />
                            Copier
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
