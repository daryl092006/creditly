'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import { Logout, Settings, UserMultiple } from '@carbon/icons-react'
import { Logo } from '@/app/components/ui/Logo'

// Define the role type locally or import if shared (keeping it simple here)
type UserRole = 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin' | 'admin_comptable' | 'owner' | null

export default function AdminNav({ userRoles }: { userRoles: UserRole[] }) {
    const pathname = usePathname()
    const isAdminMaster = userRoles.includes('superadmin') || userRoles.includes('owner')

    // Define all links with their required roles
    // If roles is undefined, it's accessible by all admins (or handled otherwise, here strictly restricted)
    const allLinks = [
        { name: 'Dashboard', href: '/admin/super', icon: 'M4...', roles: ['superadmin', 'admin_comptable'] },
        { name: 'KYC', href: '/admin/kyc', icon: 'M10...', roles: ['admin_kyc', 'superadmin'] },
        { name: 'Prêts', href: '/admin/loans', icon: 'M12...', roles: ['admin_loan', 'superadmin', 'admin_comptable'] },
        { name: 'Remb.', href: '/admin/repayments', icon: 'M9...', roles: ['admin_repayment', 'superadmin', 'admin_comptable'] },
        { name: 'Abonnements', href: '/admin/super/subscriptions', icon: 'M15...', roles: ['superadmin'] },
        { name: 'Gestion Utilisateurs', href: '/admin/super/users', roles: ['superadmin', 'owner'], icon: <UserMultiple size={20} /> },
        { name: 'Config Paramètres', href: '/admin/settings', roles: ['owner'], icon: <Settings size={20} /> },
        { name: 'Mon Profil', href: '/admin/profile', icon: 'M1...', roles: ['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable'] }
    ]

    const links = allLinks.filter(link => {
        // L'owner a accès à TOUT car il surplombe le superadmin
        if (userRoles.includes('owner')) return true
        return userRoles.some(role => link.roles.includes(role as any))
    })
    return (
        <nav className="sticky top-0 z-50 w-full bg-slate-900/70 backdrop-blur-2xl border-b border-slate-800 py-3 transition-colors duration-300">
            <div className="main-container flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="#" className="flex items-center gap-2 group cursor-default">
                        <Logo text={isAdminMaster ? 'Creditly Master' : 'Creditly Admin'} />
                    </Link>

                    <div className="hidden lg:flex items-center gap-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{userRoles[0]?.replace('admin_', '')}</p>
                    </div>
                    <form action={signout}>
                        <button
                            type="submit"
                            title="Se déconnecter"
                            className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all shadow-sm active:scale-95"
                        >
                            <Logout size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </nav>
    )
}
