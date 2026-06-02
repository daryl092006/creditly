import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UserProfileForm } from './UserProfileForm'

export default async function AdminProfilePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return redirect('/auth/login')
    }

    // Admins only
    const roles = (profile.roles || []) as string[]
    const isAdmin = roles.some(r => r !== 'client')
    if (roles.length === 0 || !isAdmin) {
        return redirect('/client/dashboard')
    }

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container max-w-4xl border-slate-800">
                <header className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase italic">Mon Profil</h1>
                    <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Gérez vos informations personnelles.</p>
                </header>

                <div className="glass-panel p-8 md:p-12 bg-slate-900/50 border-slate-800">
                    <UserProfileForm profile={profile} />
                </div>
            </div>
        </div>
    )
}
