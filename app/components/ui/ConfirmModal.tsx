'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Warning, CheckmarkFilled, ErrorFilled, InformationFilled } from '@carbon/icons-react'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'success' | 'info' | 'warning'
    isLoading?: boolean
    customIcon?: React.ReactNode
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'info',
    isLoading = false,
    customIcon
}: ConfirmModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted || !isOpen) return null

    const variantStyles = {
        danger: {
            icon: <ErrorFilled size={32} className="text-red-500" />,
            button: 'bg-red-600 hover:bg-red-500 shadow-red-600/20',
            bg: 'bg-red-500/5',
            border: 'border-red-500/20'
        },
        success: {
            icon: <CheckmarkFilled size={32} className="text-emerald-500" />,
            button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
            bg: 'bg-emerald-500/5',
            border: 'border-emerald-500/20'
        },
        warning: {
            icon: <Warning size={32} className="text-amber-500" />,
            button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
            bg: 'bg-amber-500/5',
            border: 'border-amber-500/20'
        },
        info: {
            icon: <InformationFilled size={32} className="text-blue-500" />,
            button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20',
            bg: 'bg-blue-500/5',
            border: 'border-blue-500/20'
        }
    }

    const currentVariant = variantStyles[variant]

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
                onClick={isLoading ? undefined : onClose}
            ></div>

            <div className={`glass-panel w-full max-w-md p-8 md:p-10 relative z-10 animate-slide-up border-slate-800 bg-slate-900/80 shadow-2xl ${currentVariant.bg}`}>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-white/5 flex items-center justify-center shadow-2xl group transition-transform hover:scale-105 duration-500">
                        {customIcon || currentVariant.icon}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter tabular-nums">
                            {title}
                        </h3>
                        <p className="text-slate-400 font-bold italic text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full pt-4">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`premium-button py-4 !rounded-2xl shadow-2xl flex items-center justify-center gap-2 ${currentVariant.button}`}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>{confirmText}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
