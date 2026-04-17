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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto" onClick={onClose}>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-fade-in pointer-events-none"></div>

            <div
                className="glass-panel w-full max-w-6xl max-h-[90vh] h-auto flex flex-col relative z-50 animate-slide-up bg-slate-900 border-slate-800 shadow-2xl shadow-black/50 overflow-hidden rounded-[2.5rem]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0 relative">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{title}</h3>
                        {subtitle && <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 italic">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-sm"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-black/40 relative p-4 flex flex-col items-center">
                    {isPdf ? (
                        <div className="w-full h-full min-h-[50vh] flex flex-col items-center">
                            <iframe
                                src={url}
                                title="Visualisation PDF"
                                className="w-full flex-grow rounded-xl border-none mb-4 min-h-[400px]"
                                style={{ height: 'calc(95vh - 200px)' }}
                            />
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic mb-2">Note : Si le document ne s'affiche pas, téléchargez-le ci-dessous.</p>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center py-4">
                            <img
                                src={url}
                                alt="Document preview"
                                className="max-w-full max-h-[calc(95vh-180px)] object-contain rounded-lg shadow-2xl border border-white/5"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 bg-white/5 border-t border-white/10 flex justify-end shrink-0 gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 font-black rounded-xl text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    >
                        Fermer
                    </button>
                    <a
                        href={url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                    >
                        <span>Télécharger</span>
                    </a>
                </div>
            </div>
        </div>,
        document.body
    )
}
