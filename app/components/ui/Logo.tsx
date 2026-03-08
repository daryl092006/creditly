'use client'

import React from 'react'

interface LogoProps {
    className?: string;
    showText?: boolean;
    text?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', showText = true, text = 'Creditly', size = 'md' }: LogoProps) {
    const sizeClasses = {
        sm: { box: 'w-8 h-8 rounded-lg text-lg', text: 'text-lg' },
        md: { box: 'w-10 h-10 rounded-xl text-xl', text: 'text-xl' },
        lg: { box: 'w-12 h-12 rounded-2xl text-2xl', text: 'text-2xl' },
        xl: { box: 'w-16 h-16 rounded-[2rem] text-4xl', text: 'text-4xl' }
    }

    const currentSize = sizeClasses[size]

    return (
        <div className={`flex items-center gap-3 group transition-all duration-500 ${className}`}>
            <div className={`
                ${currentSize.box} 
                relative overflow-hidden
                bg-gradient-to-br from-blue-600 to-indigo-700 
                text-white flex items-center justify-center font-black 
                shadow-xl shadow-blue-500/20 
                group-hover:scale-105 group-hover:rotate-3 
                transition-all duration-300 transform perspective-1000
                border border-white/10
            `}>
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                <span className="relative z-10 italic">C</span>

                {/* Subtle pulse for premium feel */}
                <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-20 animate-pulse"></div>
            </div>

            {showText && (
                <div className="flex flex-col -space-y-1">
                    <span className={`
                        ${currentSize.text} 
                        font-black uppercase tracking-tighter italic
                        bg-gradient-to-r from-white via-blue-100 to-slate-400 
                        bg-clip-text text-transparent
                        drop-shadow-sm
                    `}>
                        {text}
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-blue-500/60 ml-0.5">
                        Finance Elite
                    </span>
                </div>
            )}
        </div>
    )
}
