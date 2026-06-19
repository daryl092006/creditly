'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logout, List, Close, ChevronDown } from '@carbon/icons-react'
import { Logo } from '@/app/components/ui/Logo'

type UserRole = 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin' | 'admin_comptable' | 'owner' | 'support_n1' | null

interface NavLink {
    name: string;
    href: string;
    roles: string[];
    badge?: number;
}

export default function AdminNav({
    userRoles,
    notificationCounts = { kyc: 0, loans: 0, repayments: 0, withdrawals: 0 }
}: {
    userRoles: UserRole[];
    notificationCounts?: { kyc: number; loans: number; repayments: number; withdrawals: number }
}) {
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
    const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const isAdminMaster = userRoles.includes('superadmin') || userRoles.includes('owner')

    // Dropdown hover handling
    const handleMouseEnter = (menuName: string) => {
        if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current)
        setActiveDropdown(menuName)
    }

    const handleMouseLeave = () => {
        dropdownTimeoutRef.current = setTimeout(() => {
            setActiveDropdown(null)
        }, 150)
    }

    useEffect(() => {
        return () => {
            if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current)
        }
    }, [])

    // Operational links
    const operationalLinks: NavLink[] = [
        { name: 'KYC', href: '/admin/kyc', roles: ['admin_kyc', 'superadmin'], badge: notificationCounts.kyc },
        { name: 'Prêts', href: '/admin/loans', roles: ['admin_loan', 'superadmin', 'admin_comptable'], badge: notificationCounts.loans },
        { name: 'Remboursements', href: '/admin/repayments', roles: ['admin_repayment', 'superadmin', 'admin_comptable'], badge: notificationCounts.repayments },
        { name: 'Support Tickets', href: '/admin/support', roles: ['support_n1', 'superadmin', 'owner'] },
    ].filter(link => userRoles.some(role => link.roles.includes(role as any)))

    // Config links
    const configLinks: NavLink[] = [
        { name: 'Dépôts (Config)', href: '/admin/settings', roles: ['owner'] },
        { name: 'Offres (Config)', href: '/admin/super/offers', roles: ['superadmin', 'owner'] },
        { name: 'Abonnements', href: '/admin/super/subscriptions', roles: ['superadmin', 'admin_comptable', 'owner'] },
    ].filter(link => userRoles.some(role => link.roles.includes(role as any)))

    // Profile links
    const profileLinks: NavLink[] = [
        { name: 'Mes Prêts (Staff)', href: '/admin/my-loans', roles: ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable'] },
        { name: 'Mon Profil', href: '/admin/profile', roles: ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable'] },
    ].filter(link => userRoles.some(role => link.roles.includes(role as any)))

    // Static/Main links
    const mainLinks: NavLink[] = [
        { name: 'Dashboard', href: '/admin/super', roles: ['superadmin', 'admin_comptable', 'owner'] },
        { name: 'Finance', href: '/admin/finance', roles: ['admin_comptable', 'superadmin', 'owner'] },
        { name: 'Utilisateurs', href: '/admin/super/users', roles: ['superadmin', 'owner', 'admin_comptable', 'support_n1'] },
    ].filter(link => userRoles.some(role => link.roles.includes(role as any)))

    // Flat list of links for mobile nav
    const mobileLinks: NavLink[] = [
        ...mainLinks,
        ...operationalLinks,
        ...configLinks,
        ...profileLinks,
        { name: 'Espace Client', href: '/client/dashboard', roles: ['client'] }
    ].filter(link => userRoles.some(role => link.roles.includes(role as any)))

    // Count notifications for group badges
    const totalOpsNotifications = (notificationCounts.kyc || 0) + (notificationCounts.loans || 0) + (notificationCounts.repayments || 0)

    return (
        <>
            <nav className="sticky top-0 z-[100] w-full bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 py-4">
                <div className="main-container flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <Link href="/admin/super" className="flex items-center gap-2 group">
                            <Logo text={isAdminMaster ? 'Creditly Master' : 'Creditly Admin'} />
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center gap-2">
                            {mainLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                >
                                    {link.name}
                                </Link>
                            ))}

                            {/* Dropdown 1: Operations */}
                            {operationalLinks.length > 0 && (
                                <div
                                    className="relative"
                                    onMouseEnter={() => handleMouseEnter('operations')}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <button
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${operationalLinks.some(l => pathname === l.href) ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        Opérations
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'operations' ? 'rotate-180' : ''}`} />
                                        {totalOpsNotifications > 0 && (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white shadow-lg shadow-red-500/40 animate-pulse">
                                                {totalOpsNotifications}
                                            </span>
                                        )}
                                    </button>

                                    {activeDropdown === 'operations' && (
                                        <div className="absolute top-full left-0 mt-1 w-56 rounded-2xl bg-slate-900 border border-white/10 p-2 shadow-2xl backdrop-blur-3xl animate-scale-in">
                                            {operationalLinks.map((link) => (
                                                <Link
                                                    key={link.href}
                                                    href={link.href}
                                                    className={`flex justify-between items-center px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                                >
                                                    <span>{link.name}</span>
                                                    {link.badge !== undefined && link.badge > 0 && (
                                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white shadow-lg shadow-red-500/40">
                                                            {link.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dropdown 2: Configuration */}
                            {configLinks.length > 0 && (
                                <div
                                    className="relative"
                                    onMouseEnter={() => handleMouseEnter('config')}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <button
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${configLinks.some(l => pathname === l.href) ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        Configuration
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'config' ? 'rotate-180' : ''}`} />
                                    </button>

                                    {activeDropdown === 'config' && (
                                        <div className="absolute top-full left-0 mt-1 w-56 rounded-2xl bg-slate-900 border border-white/10 p-2 shadow-2xl backdrop-blur-3xl animate-scale-in">
                                            {configLinks.map((link) => (
                                                <Link
                                                    key={link.href}
                                                    href={link.href}
                                                    className={`block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                                >
                                                    {link.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dropdown 3: Profile */}
                            {profileLinks.length > 0 && (
                                <div
                                    className="relative"
                                    onMouseEnter={() => handleMouseEnter('profile')}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <button
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${profileLinks.some(l => pathname === l.href) ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        Mon Profil
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} />
                                    </button>

                                    {activeDropdown === 'profile' && (
                                        <div className="absolute top-full left-0 mt-1 w-56 rounded-2xl bg-slate-900 border border-white/10 p-2 shadow-2xl backdrop-blur-3xl animate-scale-in">
                                            {profileLinks.map((link) => (
                                                <Link
                                                    key={link.href}
                                                    href={link.href}
                                                    className={`block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                                >
                                                    {link.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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

            {/* Mobile Menu */}
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
                        {mobileLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`w-full p-6 rounded-[2rem] flex items-center justify-between transition-all active:scale-95 ${pathname === link.href ? 'bg-blue-600 text-white shadow-3xl shadow-blue-500/50' : 'bg-slate-900/50 border border-white/5 text-slate-100'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-black uppercase tracking-tighter italic">{link.name}</span>
                                    {link.badge !== undefined && link.badge > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg shadow-red-500/40">
                                            {link.badge}
                                        </span>
                                    )}
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full ${pathname === link.href ? 'bg-white shadow-[0_0_15px_white] animate-pulse' : 'bg-slate-800'}`}></div>
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
