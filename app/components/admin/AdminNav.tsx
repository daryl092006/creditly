'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import { Logout } from '@carbon/icons-react'

// Define the role type locally or import if shared (keeping it simple here)
type UserRole = 'client' | 'admin_kyc' | 'admin_loan' | 'admin_repayment' | 'superadmin' | null

export default function AdminNav({ userRole }: { userRole: UserRole }) {
    const pathname = usePathname()

    // Define all links with their required roles
    // If roles is undefined, it's accessible by all admins (or handled otherwise, here strictly restricted)
    const allLinks = [
        { name: 'Dashboard', href: '/admin/super', icon: 'M4...', roles: ['superadmin'] },
        { name: 'KYC', href: '/admin/kyc', icon: 'M10...', roles: ['admin_kyc', 'superadmin'] },
        { name: 'Prêts', href: '/admin/loans', icon: 'M12...', roles: ['admin_loan', 'superadmin'] },
        { name: 'Remboursements', href: '/admin/repayments', icon: 'M9...', roles: ['admin_repayment', 'superadmin'] },
        { name: 'Abonnements', href: '/admin/super/subscriptions', icon: 'M15...', roles: ['superadmin'] },
        { name: 'Users', href: '/admin/super/users', icon: 'M12...', roles: ['superadmin'] }
    ]

    const links = allLinks.filter(link => userRole && link.roles.includes(userRole))

    return (
        <nav className="sticky top-0 z-50 w-full bg-slate-900/70 backdrop-blur-2xl border-b border-slate-800 py-3 transition-colors duration-300">
            <div className="main-container flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="#" className="flex items-center gap-2 group cursor-default">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/20 italic">C</div>
                        <span className="font-black premium-gradient-text tracking-tighter hidden sm:block uppercase italic">
                            {userRole === 'superadmin' ? 'Creditly Master' : 'Creditly Admin'}
                        </span>
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
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{userRole?.replace('admin_', '')}</p>
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
