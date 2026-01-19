'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface DocumentPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    url: string | null
    type: string
    title: string
    subtitle?: string
}

export function DocumentPreviewModal({
    isOpen,
    onClose,
    url,
    type,
    title,
    subtitle
}: DocumentPreviewModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted || !isOpen || !url) return null

    const isPdf = type === 'pdf' || url.toLowerCase().endsWith('.pdf')

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="glass-panel w-full max-w-6xl max-h-[95vh] flex flex-col relative z-50 animate-scale-in bg-slate-900 border-slate-800 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">{title}</h3>
                        {subtitle && <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-black/40 relative p-4 flex items-center justify-center">
                    {isPdf ? (
                        <iframe src={url} className="w-full h-[75vh] rounded-xl border-none" />
                    ) : (
                        <img src={url} alt="Document preview" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" />
                    )}
                </div>
                <div className="p-4 md:p-6 bg-white/5 border-t border-white/10 flex justify-end shrink-0">
                    <a href={url} download target="_blank" className="px-6 py-3 bg-white text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-lg active:scale-95">
                        Télécharger l'original
                    </a>
                </div>
            </div>
        </div>,
        document.body
    )
}
