'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Rocket, Wallet, Flash, Help } from '@carbon/icons-react'

export default function BottomNav() {
    const pathname = usePathname()

    const links = [
        { name: 'Home', href: '/client/dashboard', icon: Home },
        { name: 'Prêts', href: '/client/loans', icon: Rocket },
        { name: 'Payer', href: '/client/loans/repayment', icon: Wallet },
        { name: 'Plans', href: '/client/subscriptions', icon: Flash },
        { name: 'Aide', href: '/client/support', icon: Help },
    ]

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] sm:hidden">
            <div className="flex items-center gap-2 p-2 bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {links.map((link) => {
                    const isActive = pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110 -translate-y-1'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <link.icon size={20} className={isActive ? 'animate-pulse' : ''} />
                            <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">{link.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
