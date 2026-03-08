'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Warning, CheckmarkFilled, ErrorFilled, InformationFilled, Close } from '@carbon/icons-react'
import { ActionButton } from './ActionButton'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm?: () => void
    title: string
    message?: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'success' | 'info' | 'warning'
    isLoading?: boolean
    customIcon?: React.ReactNode
    children?: React.ReactNode
    disabled?: boolean
    hideButtons?: boolean
    maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl'
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'info',
    isLoading = false,
    customIcon,
    children,
    disabled = false,
    hideButtons = false,
    maxWidth = 'md'
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

    const maxWidthClasses = {
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl'
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden" onClick={isLoading ? undefined : onClose}>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-fade-in pointer-events-none"></div>

            {/* Modal Box */}
            <div
                className={`glass-panel w-full ${maxWidthClasses[maxWidth]} max-h-[85vh] flex flex-col relative z-10 animate-slide-up border-slate-800 bg-slate-900/90 shadow-2xl ${currentVariant.bg} cursor-default overflow-hidden rounded-[2.5rem]`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Always visible Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all z-20 flex items-center justify-center"
                >
                    <Close size={20} />
                </button>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                    <div className="flex flex-col items-center text-center space-y-8">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] bg-slate-950 border border-white/5 flex items-center justify-center shadow-2xl shrink-0">
                            {customIcon || currentVariant.icon}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter tabular-nums leading-tight">
                                {title}
                            </h3>
                            {(message || description) && (
                                <p className="text-slate-400 font-bold italic text-sm md:text-base leading-relaxed max-w-sm mx-auto">
                                    {message || description}
                                </p>
                            )}
                        </div>

                        {children && (
                            <div className="w-full text-left bg-black/20 p-6 rounded-[2rem] border border-white/5">
                                {children}
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Footer */}
                {!hideButtons && (
                    <div className={`shrink-0 p-6 md:p-8 bg-slate-900/95 backdrop-blur-md border-t border-white/5`}>
                        <div className={`grid ${onConfirm ? 'grid-cols-2' : 'grid-cols-1'} gap-4 w-full`}>
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 active:scale-95"
                            >
                                {cancelText}
                            </button>
                            {onConfirm && (
                                <ActionButton
                                    onClick={onConfirm}
                                    loading={isLoading}
                                    loadingText={confirmText}
                                    disabled={disabled}
                                    className={`py-4 !rounded-2xl shadow-2xl flex items-center justify-center gap-2 ${currentVariant.button}`}
                                >
                                    <span>{confirmText}</span>
                                </ActionButton>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
