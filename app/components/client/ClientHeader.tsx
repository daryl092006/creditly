'use client'

import Link from 'next/link'
import { signout } from '@/app/auth/actions'
import { Logout, SettingsAdjust } from '@carbon/icons-react'
import { Logo } from '@/app/components/ui/Logo'

export default function ClientHeader({ roles = [] }: { roles?: string[] }) {
    const isAdmin = roles.some(r => r.startsWith('admin_') || r === 'superadmin' || r === 'owner' || r === 'support_n1')

    return (
        <header className="sticky top-0 z-50 w-full bg-slate-900/70 backdrop-blur-2xl border-b border-slate-800 transition-all duration-300">
            <div className="main-container h-20 flex items-center justify-between">
                <Link href="/client/dashboard">
                    <Logo />
                </Link>

                <div className="flex items-center gap-4 sm:gap-8">
                    {/* Switch to Admin View if applicable */}
                    {isAdmin && (
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                            <SettingsAdjust size={18} />
                            <span className="hidden sm:inline">Panel Admin</span>
                        </Link>
                    )}

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
        </header>
    )
}
