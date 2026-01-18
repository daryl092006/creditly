import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import SubscriptionTable from './SubscriptionTable'

export default async function AdminSubscriptionsPage() {
    const supabase = await createClient()
    const { data: pendingSubs } = await supabase
        .from('user_subscriptions')
        .select('*, plan:abonnements(*), user:users(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    return (
        <div className="py-10 md:py-16 animate-fade-in">
            <div className="main-container space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/super" className="text-slate-500 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 mb-4 group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Retour au Centre de Contrôle
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text tracking-tight uppercase">Validation Abonnements</h1>
                        <p className="text-slate-500 font-bold mt-2 italic leading-relaxed">Vérifiez les preuves de paiement et activez les comptes</p>
                    </div>
                </div>

                <SubscriptionTable rows={pendingSubs || []} />
            </div>
        </div>
    )
}
