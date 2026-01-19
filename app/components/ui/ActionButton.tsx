'use client'

import React from 'react'

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
    variant?: 'premium' | 'primary' | 'glass'
    loading?: boolean
}

export function ActionButton({ children, variant = 'premium', loading, loadingText, className, ...props }: ActionButtonProps & { loadingText?: string }) {
    // Note: We don't use useFormStatus here to keep it generic, 
    // but users can pass the loading prop from their state or parent.

    const baseClasses = {
        premium: 'premium-button',
        primary: 'primary-button',
        glass: 'glass-panel px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:border-blue-500/50 transition-all'
    }

    const selectedClass = baseClasses[variant] || baseClasses.premium

    return (
        <button
            className={`${selectedClass} ${loading ? 'loading cursor-not-allowed opacity-80' : ''} ${className || ''}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && loadingText ? (
                <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>{loadingText}</span>
                </div>
            ) : (
                <>
                    <span className={loading ? 'invisible' : 'flex items-center gap-3'}>
                        {children}
                    </span>
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                    )}
                </>
            )}
        </button>
    )
}
