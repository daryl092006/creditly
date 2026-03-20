'use client'

import { useState } from 'react'
import { Wallet, Send } from '@carbon/icons-react'
import ConfirmModal from '@/app/components/ui/ConfirmModal'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { requestWithdrawal } from '../actions'

export function WithdrawalButton({ balance }: { balance: number }) {
    const [isOpen, setIsOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('Mobile Money')
    const [details, setDetails] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleRequest() {
        const numAmount = Number(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Montant invalide')
            return
        }
        if (numAmount > balance) {
            setError('Solde insuffisant')
            return
        }
        if (!details) {
            setError('Veuillez renseigner les détails du compte (ex: Numéro Moov/MTN)')
            return
        }

        setLoading(true)
        setError('')

        const res = await requestWithdrawal(numAmount, method, details)

        if (res.error) {
            setError(res.error)
        } else {
            setSuccess(true)
            setAmount('')
            setDetails('')
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(false)
            }, 2000)
        }
        setLoading(false)
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                disabled={balance <= 0}
                className={`w-full py-4 px-6 rounded-2xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${balance > 0 ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'}`}
            >
                <Wallet size={20} />
                Retirer mes gains
            </button>

            <ConfirmModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="DEMANDE DE RETRAIT"
                description="Réclamez vos commissions accumulées"
                hideButtons={true}
            >
                {success ? (
                    <div className="py-8 text-center space-y-4 animate-fade-in">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                            <Send size={32} />
                        </div>
                        <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Demande envoyée !</h4>
                        <p className="text-slate-500 font-bold text-xs italic uppercase tracking-widest">
                            Un Super Admin va valider votre retrait très prochainement.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Solde Disponible</p>
                            <p className="text-2xl font-black text-blue-500 italic tracking-tighter">{balance.toLocaleString('fr-FR')} F</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Montant à retirer (FCFA)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Ex: 5000"
                                    className="w-full bg-slate-900 border border-slate-700 text-white font-black px-6 py-4 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-xl italic"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Méthode de paiement</label>
                                <select
                                    value={method}
                                    onChange={e => setMethod(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 text-white font-bold px-6 py-4 rounded-xl outline-none"
                                >
                                    <option value="Mobile Money">Mobile Money (Benin)</option>
                                    <option value="Virement">Virement Bancaire</option>
                                    <option value="Especes">Espèces (Siège)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Détails du compte (Numéro/Nom)</label>
                                <input
                                    type="text"
                                    value={details}
                                    onChange={e => setDetails(e.target.value)}
                                    placeholder="Numéro Mobile Money..."
                                    className="w-full bg-slate-900 border border-slate-700 text-white font-bold px-6 py-4 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center italic rounded-xl animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 py-4 bg-slate-800 text-slate-500 font-black uppercase italic rounded-xl hover:text-white transition-all"
                            >
                                Annuler
                            </button>
                            <ActionButton
                                onClick={handleRequest}
                                loading={loading}
                                className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase italic rounded-xl"
                            >
                                Envoyer la demande
                            </ActionButton>
                        </div>
                    </div>
                )}
            </ConfirmModal>
        </>
    )
}
