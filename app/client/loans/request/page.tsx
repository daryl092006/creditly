import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoanRequestForm from './loan-form'
import Link from 'next/link'
import { ArrowLeft, CloseFilled, Information } from '@carbon/icons-react'

export default async function LoanRequestPage() {
    const supabase = await createClient()
    // Lazy update of system statuses
    await supabase.rpc('auto_update_system_statuses')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return redirect('/auth/login')

    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    const userRoles = (userData?.roles || []) as string[]
    const isAdmin = userRoles.some(r => r.startsWith('admin_') || r === 'superadmin' || r === 'owner')

    const { data: userSubs } = await supabase
        .from('user_subscriptions')
        .select('*, plan:abonnements(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const now = new Date().toISOString()
    const allSubs = userSubs || []

    // Consistency check with dashboard logic
    let sub = allSubs.find((sub: any) =>
        sub.status === 'active' && sub.end_date && sub.end_date > now
    )

    // STAFF EXCEPTION: Admins don't need subscriptions
    if (!sub && isAdmin) {
        const { data: staffSettings } = await supabase.from('staff_loan_settings').select('*').maybeSingle()
        
        sub = {
            id: 'staff-virtual',
            user_id: user.id,
            status: 'active',
            plan: {
                name: 'STAFF (Privilège)',
                max_loan_amount: staffSettings?.max_loan_amount || 800000,
                max_loans_per_month: staffSettings?.max_active_loans || 5,
                repayment_delay_days: staffSettings?.default_repayment_days || 30,
                service_fee: 0
            }
        }
    }

    if (!sub) {
        return (
            <div className="p-12 text-center glass-panel bg-slate-900/50 border-slate-800 max-w-2xl mx-auto my-12 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Information size={40} />
                </div>
                <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Forfait <span className="text-amber-500">requis.</span></h1>
                <p className="mb-10 text-slate-500 font-black italic">Vous devez choisir un forfait pour pouvoir demander un prêt.</p>
                <Link href="/client/subscriptions">
                    <button className="premium-button active:scale-95 px-10">
                        Voir les forfaits
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

    const planData = {
        name: sub?.snapshot_name ?? sub?.plan?.name ?? '...',
        max_loan_amount: sub?.snapshot_max_loan_amount ?? sub?.plan?.max_loan_amount ?? 0,
        max_loans_per_month: sub?.snapshot_max_loans_per_month ?? sub?.plan?.max_loans_per_month ?? 0,
        repayment_delay_days: sub?.snapshot_repayment_delay_days ?? sub?.plan?.repayment_delay_days ?? 0,
        service_fee: sub?.snapshot_service_fee ?? sub?.plan?.service_fee ?? 0
    }

    // Vérifier si le frais de dossier a déjà été facturé sur cette période d'abonnement
    // Le frais est payable UNE SEULE FOIS par abonnement (1er prêt uniquement)
    const { count: feeAlreadyChargedCount } = await supabase
        .from('prets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('subscription_snapshot_id', sub.plan_id)
        .gt('service_fee', 0)
        .gte('created_at', sub.start_date || new Date(0).toISOString())

    const isFirstLoanOfSubscription = (feeAlreadyChargedCount ?? 0) === 0
    const applicableServiceFee = isFirstLoanOfSubscription ? planData.service_fee : 0

    const remainingAmount = Math.max(0, planData.max_loan_amount - currentCumulativeDebt)
    const remainingLoans = Math.max(0, planData.max_loans_per_month - currentActiveCount)

    // Check 1: Max Simultanous Loans Capacity
    if (currentActiveCount >= planData.max_loans_per_month) {
        return (
            <div className="p-12 text-center glass-panel bg-slate-900/50 border-slate-800 max-w-2xl mx-auto my-12 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="w-20 h-20 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CloseFilled size={40} />
                </div>
                <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Limite <span className="text-red-500">atteinte.</span></h1>
                <p className="mb-2 text-slate-400 font-bold italic">Vous avez déjà {planData.max_loans_per_month} prêts en cours. Finissez de payer pour en reprendre un autre.</p>
                <div className="mb-10 text-xs font-black text-slate-600 uppercase tracking-widest">({currentActiveCount} / {planData.max_loans_per_month} dossiers actifs)</div>
                <Link href="/client/dashboard">
                    <button className="premium-button bg-slate-800 border-white/5 active:scale-95 px-10">
                        <ArrowLeft size={16} />
                        Centre d&apos;Opérations
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
                <h1 className="text-4xl font-black mb-4 text-white uppercase italic tracking-tighter">Limite <span className="text-red-500">atteinte.</span></h1>
                <p className="mb-2 text-slate-400 font-bold italic">Vous avez atteint la somme maximale autorisée pour votre forfait {planData.name}.</p>
                <div className="mb-10 p-4 rounded-xl bg-slate-950 border border-white/5 inline-block">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ce que vous devez déjà</div>
                    <div className="text-xl font-black text-white italic">{currentCumulativeDebt.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-600">/ {planData.max_loan_amount.toLocaleString('fr-FR')} FCFA</span></div>
                </div>
                <div>
                    <Link href="/client/dashboard">
                        <button className="premium-button bg-slate-800 border-white/5 active:scale-95 px-10">
                            <ArrowLeft size={16} />
                            Centre d&apos;Opérations
                        </button>
                    </Link>
                </div>
            </div>
        )
    }



    // Fetch data for scoring and display (userData already fetched at line 16)
    const { data: rawSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['repayment_phone_mtn', 'repayment_phone_moov', 'repayment_phone_celtiis'])

    const settingsMap = Object.fromEntries(rawSettings?.map((s: any) => [s.key, s.value]) || [])
    const repaymentPhones = {
        MTN: settingsMap['repayment_phone_mtn'] || '+229 01 53 32 44 90',
        Moov: settingsMap['repayment_phone_moov'] || '+229 01 58 69 14 05',
        Celtiis: settingsMap['repayment_phone_celtiis'] || '+229 01 44 14 00 67'
    }

    // 6. Automated Analysis & Scoring (Admin Insight Only)
    const { calculateUserScore } = await import('@/utils/scoring-utils')
    const { data: allUserLoans } = await supabase.from('prets').select('*').eq('user_id', user.id)
    const analysis = calculateUserScore(allUserLoans || [], userData?.created_at || now, !!sub)

    const dueDateRaw = new Date(Date.now() + (planData.repayment_delay_days || 7) * 24 * 60 * 60 * 1000)

    // Vérifier si le frais de dossier a déjà été facturé sur cette période d'abonnement


    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-center text-3xl font-bold premium-gradient-text uppercase italic tracking-tighter">Demander un prêt</h1>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Somme encore possible</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter">
                            {remainingAmount.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-600">FCFA</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-600 uppercase">Limite: {planData.max_loan_amount.toLocaleString('fr-FR')}</p>
                        <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(currentCumulativeDebt / (planData.max_loan_amount || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prêts encore possibles</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter">
                            {remainingLoans} <span className="text-[10px] not-italic text-slate-600">/ {planData.max_loans_per_month}</span>
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black italic border border-emerald-500/20">
                        {currentActiveCount}
                    </div>
                </div>
            </div>

            <LoanRequestForm
                subscription={{ ...sub, plan: planData }}
                userData={userData || { nom: '', prenom: '' }}
                repaymentPhones={repaymentPhones}
                dueDateRaw={dueDateRaw}
                applicableServiceFee={applicableServiceFee}
            />

        </div>
    )
}
