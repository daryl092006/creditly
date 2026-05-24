import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckmarkOutline } from '@carbon/icons-react'
import RepaymentForm from './repayment-form'
import CopyablePhone from './CopyablePhone'

export default async function RepaymentPage({
    searchParams
}: {
    searchParams: Promise<{ loanId?: string }>
}) {
    const params = await searchParams
    const loanIdParam = params.loanId

    const supabase = await createClient()
    // Lazy update of system statuses
    await supabase.rpc('auto_update_system_statuses')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Connectez-vous</div>

    // Find active loan (priority to the one in URL)
    const query = supabase
        .from('prets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'overdue'])

    if (loanIdParam) {
        query.eq('id', loanIdParam)
    }

    const { data: loan } = await query.maybeSingle()

    const { data: rawSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['repayment_phone_mtn', 'repayment_phone_moov', 'repayment_phone_celtiis'])

    const settingsMap = Object.fromEntries(rawSettings?.map((s: any) => [s.key, s.value]) || [])
    const phoneMTN = settingsMap['repayment_phone_mtn'] || '+229 01 53 32 44 90'
    const phoneMOOV = settingsMap['repayment_phone_moov'] || '+229 01 58 69 14 05'
    const phoneCELTIIS = settingsMap['repayment_phone_celtiis'] || '+229 01 44 14 00 67'

    if (!loan) {
        return (
            <div className="p-8 text-center pt-24 min-h-screen bg-slate-950">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="w-20 h-20 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
                        <CheckmarkOutline size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Tout est <span className="premium-gradient-text uppercase">réglé.</span></h1>
                    <p className="text-slate-500 font-bold italic">Vous n&apos;avez aucun prêt actif à rembourser pour le moment.</p>
                    <Link href="/dashboard">
                        <button className="premium-button px-8">Retour au Dashboard</button>
                    </Link>
                </div>
            </div>
        )
    }

    const { calculateLoanDebt } = require('@/utils/loan-utils')
    const { totalDebt: remainingBalance, fee } = calculateLoanDebt(loan as any)
    const dueDate = loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'Non définie'
    const isOverdue = loan.status === 'overdue'

    return (
        <div className="py-12 md:py-24 page-transition">
            <div className="main-container">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                        Payer <br />
                        <span className="premium-gradient-text">Mon Prêt.</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-lg italic">Payez ce que vous devez pour garder un bon profil.</p>
                </div>

                <div className="max-w-xl mx-auto mb-12">
                    <div className={`glass-panel p-8 border relative overflow-hidden ${isOverdue ? 'bg-red-900/20 border-red-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                        {isOverdue && (
                            <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center text-[10px] font-black uppercase tracking-[0.3em] py-2 animate-pulse">
                                ⚠️ Paiement en retard — Régularisez immédiatement
                            </div>
                        )}
                        <div className={`flex flex-col md:flex-row justify-between items-center gap-6 relative z-10 ${isOverdue ? 'mt-8' : ''}`}>
                            <div className="space-y-1 text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Ce qu&apos;il reste à payer</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">
                                    {(remainingBalance || 0).toLocaleString('fr-FR')} <span className="text-xs not-italic text-slate-600">FCFA</span>
                                </p>
                            </div>
                            <div className={`px-6 py-3 rounded-2xl text-center ${isOverdue ? 'bg-red-500/20 border border-red-500/40' : 'bg-red-500/10 border border-red-500/20'}`}>
                                <p className="text-[8px] font-black text-red-500/50 uppercase tracking-widest mb-1">Dernier délai</p>
                                <p className={`text-sm font-black uppercase italic tracking-widest ${isOverdue ? 'text-red-400 animate-pulse' : 'text-red-500'}`}>{dueDate}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Somme de départ : {(Number(loan.amount) + fee).toLocaleString('fr-FR')} F</p>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Déjà payé : {(loan.amount_paid || 0).toLocaleString('fr-FR')} F</p>
                        </div>
                    </div>
                </div>

                {/* Numéros avec boutons "Copier" */}
                <div className="max-w-xl mx-auto mb-12">
                    <div className="glass-panel p-6 bg-slate-900/50 border-slate-800">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Envoyez l&apos;argent sur un de ces numéros
                        </h3>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic mb-4">
                            Montant exact à envoyer : <span className="text-emerald-500">{(remainingBalance || 0).toLocaleString('fr-FR')} FCFA</span>
                        </p>
                        <div className="space-y-3">
                            <CopyablePhone label="MTN Dépôt" phone={phoneMTN} />
                            <CopyablePhone label="CELTIIS" phone={phoneCELTIIS} />
                            <CopyablePhone label="MOOV" phone={phoneMOOV} />
                        </div>
                    </div>
                </div>

                <RepaymentForm loanId={loan.id} remainingBalance={remainingBalance} />
            </div>
        </div>
    )
}
