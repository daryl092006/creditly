'use client'

import { Money, Information, CloseFilled } from '@carbon/icons-react'
import { useState } from 'react'
import { requestLoan } from '../actions'
import { useRouter } from 'next/navigation'
import { ActionButton } from '@/app/components/ui/ActionButton'

import LoanWaiver, { PersonalData } from './loan-waiver'

interface Subscription {
    end_date?: string;
    plan: {
        name: string;
        max_loan_amount: number;
        repayment_delay_days: number;
        service_fee?: number;
    }
}


export default function LoanRequestForm({ subscription, userData, repaymentPhones, dueDateRaw, applicableServiceFee }: {
    subscription: Subscription,
    userData: {
        nom: string,
        prenom: string,
        birth_date?: string,
        address?: string,
        city?: string,
        profession?: string
    },
    repaymentPhones: {
        MTN: string;
        Moov: string;
        Celtiis: string;
    };
    dueDateRaw: Date;
    applicableServiceFee: number;
}) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [amount, setAmount] = useState<number>(subscription.plan.max_loan_amount)
    const [payoutPhone, setPayoutPhone] = useState('')
    const [payoutName, setPayoutName] = useState('')
    const [payoutNetwork, setPayoutNetwork] = useState('MTN')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Use due date from props (most accurate)
    const dueDate = dueDateRaw;
    const formattedDueDate = dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const validateFirstStep = () => {
        setError(null)

        if (!amount || amount < 1000) {
            setError('Le montant doit être d&apos;au moins 1 000 FCFA.')
            document.getElementById('amount')?.focus()
            return false
        }

        if (amount > subscription.plan.max_loan_amount) {
            setError(`Votre limite est de ${subscription.plan.max_loan_amount.toLocaleString('fr-FR')} FCFA.`)
            document.getElementById('amount')?.focus()
            return false
        }

        if (!payoutPhone || payoutPhone.trim().length < 8) {
            setError('Merci d&apos;indiquer un numéro de téléphone Mobile Money valide (8 chiffres min).')
            document.getElementsByName('payoutPhone')[0]?.focus()
            return false
        }

        if (!payoutName || payoutName.trim().length < 3) {
            setError('Merci d&apos;indiquer le nom complet du titulaire du compte MoMo.')
            document.getElementsByName('payoutName')[0]?.focus()
            return false
        }

        return true
    }

    const handleNextStep = () => {
        if (validateFirstStep()) {
            setStep(2)
        }
    }

    const handleFinalSubmit = async (personalData: PersonalData) => {
        setLoading(true)
        setError(null)

        try {
            const res = await requestLoan(amount, payoutPhone, payoutName, payoutNetwork, personalData)
            if (res?.error) {
                setError(res.error)
                setLoading(false)
                setStep(1) // Return to first step to fix errors if any
            } else {
                router.push(`/client/dashboard?success=PretEngage`)
            }
        } catch (err: any) {
            console.error('Final Submission Crash:', err)
            setError("Une erreur inattendue est survenue. Veuillez réessayer.")
            setLoading(false)
            setStep(1)
        }
    }

    if (step === 2) {
        return (
            <div className="max-w-2xl mx-auto">
                <LoanWaiver
                    userData={userData}
                    loanData={{
                        amount,
                        payoutPhone,
                        payoutNetwork,
                        dueDate: formattedDueDate,
                        dueDateRaw: dueDate,
                        serviceFee: applicableServiceFee,
                        repaymentDelayDays: subscription.plan.repayment_delay_days
                    }}
                    onConfirm={handleFinalSubmit}
                    onBack={() => setStep(1)}
                    loading={loading}
                    repaymentPhones={repaymentPhones}
                />
            </div>
        )
    }


    return (
        <div className="glass-panel p-10 max-w-xl mx-auto bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-600/10 transition-colors"></div>
            <h2 className="text-3xl font-black mb-8 text-white uppercase italic tracking-tighter text-left">Ma <span className="premium-gradient-text uppercase">Demande.</span></h2>

            <div className="mb-10 bg-slate-950 border border-white/5 rounded-2xl p-6 space-y-4 text-left">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-inner">
                        <Information size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Mon Forfait</p>
                        <p className="text-lg font-black text-white uppercase italic">{subscription.plan.name}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Somme Max</p>
                        <p className="text-sm font-black text-white italic tracking-tighter">{subscription.plan.max_loan_amount.toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-700 font-bold">FCFA</span></p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Délai pour payer</p>
                        <p className="text-sm font-black text-white italic tracking-tighter">{subscription.plan.repayment_delay_days} <span className="text-[10px] not-italic text-slate-700 font-bold">JOURS</span></p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-4 animate-shake text-left">
                    <CloseFilled size={24} className="shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic">Un petit problème</p>
                        <p className="text-xs font-bold font-sans">{error}</p>
                    </div>
                </div>
            )}

            <div className="space-y-6 text-left">
                <div className="space-y-3">
                    <label htmlFor="amount" className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Combien voulez-vous (FCFA) ?</label>
                    <div className="relative group/input">
                        <input
                            id="amount"
                            type="number"
                            value={amount}
                            max={subscription.plan.max_loan_amount}
                            min={1000}
                            step={500}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full px-6 py-6 rounded-2xl border border-white/5 bg-slate-950 text-white text-3xl font-black italic tracking-tighter focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs uppercase tracking-widest group-focus-within/input:text-blue-500 transition-colors italic">FCFA</div>
                    </div>
                    <div className="flex justify-between px-1">
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Min: 1,000</p>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Max: {subscription.plan.max_loan_amount.toLocaleString('fr-FR')}</p>
                    </div>
                    {applicableServiceFee > 0 && (
                        <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex justify-between items-center">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Frais de dossier (1× par abonnement)</p>
                            <p className="text-sm font-black text-white italic">+ {applicableServiceFee} F</p>
                        </div>
                    )}
                    {applicableServiceFee === 0 && (
                        <div className="mt-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex justify-between items-center">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">Frais de dossier déjà réglés</p>
                            <p className="text-sm font-black text-emerald-400 italic">✓ Gratuit</p>
                        </div>
                    )}

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Opérateur</label>
                        <select
                            value={payoutNetwork}
                            onChange={(e) => setPayoutNetwork(e.target.value)}
                            className="w-full px-6 py-4 rounded-xl border border-white/5 bg-slate-950 text-white font-bold italic outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="MTN">MTN</option>
                            <option value="Moov">Moov</option>
                            <option value="Celtiis">Celtiis</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Numéro pour recevoir l&apos;argent</label>
                        <input
                            id="payoutPhone"
                            name="payoutPhone"
                            type="text"
                            placeholder="01XXXXXXXX"
                            value={payoutPhone}
                            onChange={(e) => setPayoutPhone(e.target.value)}
                            className="w-full px-6 py-4 rounded-xl border border-white/5 bg-slate-950 text-white font-bold italic outline-none focus:border-blue-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                        <Information size={14} />
                        Faites attention
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed">
                        Vérifiez bien votre numéro. Si vous vous trompez, on ne pourra pas récupérer l&apos;argent.
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Votre nom sur le compte Mobile Money</label>
                    <input
                        id="payoutName"
                        name="payoutName"
                        type="text"
                        placeholder="Ex: Jean Dupont"
                        value={payoutName}
                        onChange={(e) => setPayoutName(e.target.value)}
                        className="w-full px-6 py-4 rounded-xl border border-white/5 bg-slate-950 text-white font-bold italic outline-none focus:border-blue-500/50 transition-all"
                    />
                </div>

                <ActionButton
                    onClick={handleNextStep}
                    className="w-full py-6 text-sm active:scale-[0.98] group/btn mt-4"
                >
                    Étape suivante
                    <Money size={20} className="group-hover/btn:rotate-12 transition-transform ml-2" />
                </ActionButton>
            </div>
        </div>
    )
}
