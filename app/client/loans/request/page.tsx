import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoanRequestForm from './loan-form'
// import { Button } from '@carbon/react' (Disabled)
import Link from 'next/link'
import { ArrowLeft, CloseFilled, Information } from '@carbon/icons-react'

export default async function LoanRequestPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return redirect('/auth/login')

    // Check active subscription
    const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*, plan:abonnements(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    if (!sub) {
        return (
            <div className="p-12 text-center glass-panel bg-slate-900/50 border-slate-800 max-w-2xl mx-auto my-12 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Information size={40} />
                </div>
                <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Accès <span className="text-amber-500">Restreint.</span></h1>
                <p className="mb-10 text-slate-500 font-black italic">Un abonnement actif est requis pour débloquer les services de prêt.</p>
                <Link href="/client/subscriptions">
                    <button className="premium-button active:scale-95 px-10">
                        Explorer les Plans Elite
                    </button>
                </Link>
            </div>
        )
    }

    // Check existing active loans (Capacity & Cumulative Amount)
    const { data: activeLoans, count: activeLoansCount } = await supabase
        .from('prets')
        .select('amount', { count: 'exact' })
        .eq('user_id', user.id)
        .in('status', ['approved', 'active', 'overdue'])

    const currentActiveCount = activeLoansCount || 0
    const currentCumulativeDebt = activeLoans?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0

    const remainingAmount = Math.max(0, sub.plan.max_loan_amount - currentCumulativeDebt)
    const remainingLoans = Math.max(0, sub.plan.max_loans_per_month - currentActiveCount)

    // Check 1: Max Simultanous Loans Capacity
    if (currentActiveCount >= sub.plan.max_loans_per_month) {
        return (
            <div className="p-12 text-center glass-panel bg-slate-900/50 border-slate-800 max-w-2xl mx-auto my-12 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="w-20 h-20 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CloseFilled size={40} />
                </div>
                <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Capacité <span className="text-red-500">Atteinte.</span></h1>
                <p className="mb-2 text-slate-400 font-bold italic">Vous avez atteint la limite de {sub.plan.max_loans_per_month} prêts simultanés incluse dans votre offre {sub.plan.name}.</p>
                <div className="mb-10 text-xs font-black text-slate-600 uppercase tracking-widest">({currentActiveCount} / {sub.plan.max_loans_per_month} dossiers actifs)</div>
                <Link href="/client/dashboard">
                    <button className="premium-button bg-slate-800 border-white/5 active:scale-95 px-10">
                        <ArrowLeft size={16} />
                        Operations Center
                    </button>
                </Link>
            </div>
        )
    }



    // Check 2: Max Cumulative Amount (If remaining capacity < min_loan, theoretically block, but action handles amount check)
    // We only block page here if they have absolutely 0 remaining capacity in terms of amount
    if (remainingAmount <= 0) {
        return (
            <div className="p-12 text-center glass-panel bg-slate-900/50 border-slate-800 max-w-2xl mx-auto my-12 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="w-20 h-20 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CloseFilled size={40} />
                </div>
                <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Plafond <span className="text-red-500">Atteint.</span></h1>
                <p className="mb-2 text-slate-400 font-bold italic">Votre encours cumulé a atteint la limite de votre offre {sub.plan.name}.</p>
                <div className="mb-10 p-4 rounded-xl bg-slate-950 border border-white/5 inline-block">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Encours Actuel</div>
                    <div className="text-xl font-black text-white italic">{currentCumulativeDebt.toLocaleString()} <span className="text-[10px] text-slate-600">/ {sub.plan.max_loan_amount.toLocaleString()} FCFA</span></div>
                </div>
                <div>
                    <Link href="/client/dashboard">
                        <button className="premium-button bg-slate-800 border-white/5 active:scale-95 px-10">
                            <ArrowLeft size={16} />
                            Operations Center
                        </button>
                    </Link>
                </div>
            </div>
        )
    }



    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-center text-3xl font-bold premium-gradient-text uppercase italic tracking-tighter">Nouvelle Demande</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Capacité Restante</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter">
                            {remainingAmount.toLocaleString()} <span className="text-[10px] not-italic text-slate-600">FCFA</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-600 uppercase">Plafond: {sub.plan.max_loan_amount.toLocaleString()}</p>
                        <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(currentCumulativeDebt / sub.plan.max_loan_amount) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dossiers Disponibles</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter">
                            {remainingLoans} <span className="text-[10px] not-italic text-slate-600">/ {sub.plan.max_loans_per_month}</span>
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black italic border border-emerald-500/20">
                        {currentActiveCount}
                    </div>
                </div>
            </div>

            <LoanRequestForm subscription={sub} />
        </div>
    )
}
