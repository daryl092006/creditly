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
    if (!profile.role || profile.role === 'client') {
        return redirect('/client/dashboard')
    }

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container max-w-3xl border-slate-800">
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Mon Profil</h1>
                    <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Gérez vos informations de contact professionnelles</p>
                </div>

                <div className="glass-panel p-8 md:p-12 bg-slate-900/50 border-slate-800">
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl mb-8 flex items-start gap-4">
                        <span className="text-xl">ℹ️</span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest italic mb-1">Information Importante</p>
                            <p className="text-xs font-bold leading-relaxed">
                                Le numéro WhatsApp renseigné ici sera affiché à tous les clients dont vous avez approuvé l'abonnement.
                                Soyez sûr que ce numéro est celui que vous dédiez à votre activité de gestionnaire.
                            </p>
                        </div>
                    </div>

                    <UserProfileForm profile={profile} />
                </div>
            </div>
        </div>
    )
}
