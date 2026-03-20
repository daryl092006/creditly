'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import { Logout, Settings, UserMultiple, Currency, Menu, Close } from '@carbon/icons-react'
import { Logo } from '@/app/components/ui/Logo'

type UserRole = 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin' | 'admin_comptable' | 'owner' | null

export default function AdminNav({ userRoles }: { userRoles: UserRole[] }) {
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const isAdminMaster = userRoles.includes('superadmin') || userRoles.includes('owner')

    const allLinks = [
        { name: 'Dashboard', href: '/admin/super', roles: ['superadmin', 'admin_comptable'] },
        { name: 'KYC', href: '/admin/kyc', roles: ['admin_kyc', 'superadmin'] },
        { name: 'Prêts', href: '/admin/loans', roles: ['admin_loan', 'superadmin', 'admin_comptable'] },
        { name: 'Remb.', href: '/admin/repayments', roles: ['admin_repayment', 'superadmin', 'admin_comptable'] },
        { name: 'Finance', href: '/admin/finance', roles: ['admin_comptable', 'superadmin', 'owner'] },
        { name: 'Abonnements', href: '/admin/super/subscriptions', roles: ['superadmin', 'admin_comptable'] },
        { name: 'Utilisateurs', href: '/admin/super/users', roles: ['superadmin', 'owner', 'admin_comptable'] },
        { name: 'Dépôts (Config)', href: '/admin/settings', roles: ['owner'] },
        { name: 'Mon Profil', href: '/admin/profile', roles: ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable'] }
    ]

    const links = allLinks.filter(link => {
        if (userRoles.includes('owner')) return true
        return userRoles.some(role => link.roles.includes(role as any))
    })

    return (
        <nav className="sticky top-0 z-[100] w-full bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 py-4">
            <div className="main-container flex items-center justify-between">
                <div className="flex items-center gap-10">
                    <Link href="/admin/super" className="flex items-center gap-2 group">
                        <Logo text={isAdminMaster ? 'Creditly Master' : 'Creditly Admin'} />
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden lg:flex items-center gap-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:block text-right pr-4 border-r border-white/5">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{userRoles[0]?.replace('admin_', '')}</p>
                    </div>

                    <form action={signout} className="hidden sm:block">
                        <button type="submit" className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95 shadow-lg shadow-black/20">
                            <Logout size={20} />
                        </button>
                    </form>

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-all shadow-lg shadow-black/20"
                    >
                        {isMenuOpen ? <Close size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="lg:hidden fixed inset-x-0 top-[73px] bottom-0 bg-slate-950/95 backdrop-blur-2xl z-[99] border-t border-white/5 animate-fade-in p-6 overflow-y-auto">
                    <div className="flex flex-col gap-2">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all ${pathname === link.href ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 active:scale-95' : 'bg-slate-900/50 text-slate-400 border border-white/5 active:bg-slate-800'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest">{link.name}</span>
                                <div className={`w-2 h-2 rounded-full ${pathname === link.href ? 'bg-white shadow-[0_0_10px_white]' : 'bg-slate-800'}`}></div>
                            </Link>
                        ))}

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <form action={signout}>
                                <button type="submit" className="w-full p-5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-black uppercase tracking-widest italic flex items-center justify-center gap-3 active:scale-95 transition-transform">
                                    <Logout size={20} />
                                    Se déconnecter de l'administration
                                </button>
                            </form>
                            <p className="text-center text-[10px] font-black text-slate-700 uppercase italic mt-6 tracking-widest">Creditly Admin Mobile v2.0</p>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
