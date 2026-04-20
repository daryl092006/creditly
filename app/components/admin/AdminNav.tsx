'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logout, UserMultiple, List, Close } from '@carbon/icons-react'
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
        { name: 'Mes Prêts (Staff)', href: '/admin/my-loans', roles: ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable'] },
        { name: 'Mon Profil', href: '/admin/profile', roles: ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable'] }
    ]

    const links = allLinks.filter(link => {
        if (userRoles.includes('owner')) return true
        return userRoles.some(role => link.roles.includes(role as any))
    })

    return (
        <>
            <nav className="sticky top-0 z-[100] w-full bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 py-4">
                <div className="main-container flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <Link href="/admin/super" className="flex items-center gap-2 group">
                            <Logo text={isAdminMaster ? 'Creditly Master' : 'Creditly Admin'} />
                        </Link>

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

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-all shadow-lg shadow-black/20"
                        >
                            {isMenuOpen ? <Close size={24} /> : <List size={24} />}
                        </button>
                    </div>
                </div>
            </nav>

            {isMenuOpen && (
                <div className="lg:hidden fixed inset-0 h-screen w-screen bg-slate-950 z-[9999] animate-fade-in flex flex-col p-6 overflow-y-auto overflow-x-hidden">
                    {/* Top Section */}
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <Logo text={isAdminMaster ? 'Creditly Master' : 'Creditly Admin'} />
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="w-14 h-14 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-white active:scale-75 transition-all shadow-2xl"
                        >
                            <Close size={32} />
                        </button>
                    </div>

                    {/* Links Centered */}
                    <div className="flex flex-col gap-4 py-10 my-auto">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`w-full p-8 rounded-[2.5rem] flex items-center justify-between transition-all active:scale-95 ${pathname === link.href ? 'bg-blue-600 text-white shadow-3xl shadow-blue-500/50' : 'bg-slate-900/50 border border-white/5 text-slate-100'}`}
                            >
                                <span className="text-xl font-black uppercase tracking-tighter italic">{link.name}</span>
                                <div className={`w-4 h-4 rounded-full ${pathname === link.href ? 'bg-white shadow-[0_0_20px_white] animate-pulse' : 'bg-slate-800'}`}></div>
                            </Link>
                        ))}
                    </div>

                    {/* Bottom Section */}
                    <div className="shrink-0 pt-12 pb-6 text-center border-t border-white/5">
                        <p className="text-[12px] font-black uppercase text-slate-600 tracking-widest italic mb-6">Administrateur : {userRoles[0]?.replace('admin_', '')}</p>
                        <Link href="/auth/login" className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-500/10 text-red-500 font-black uppercase text-sm italic tracking-widest border border-red-500/10 active:scale-95 transition-all">
                            <Logout size={24} /> Déconnecter la session
                        </Link>
                    </div>
                </div>
            )}
        </>
    )
}
