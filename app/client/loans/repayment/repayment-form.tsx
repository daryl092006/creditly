'use client'

import { Upload, CheckmarkOutline, Warning, Copy, CheckmarkFilled } from '@carbon/icons-react'
import { useState, useTransition } from 'react'
import { submitRepayment } from '../actions'
import { useRouter } from 'next/navigation'
import { ActionButton } from '@/app/components/ui/ActionButton'

export default function RepaymentForm({ loanId, remainingBalance }: { loanId: string; remainingBalance: number }) {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [amount, setAmount] = useState('')
    const [operator, setOperator] = useState('')
    const [senderPhone, setSenderPhone] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleAction = async () => {
        setError(null)

        if (!operator) {
            setError('Veuillez sélectionner l\'opérateur Mobile Money utilisé.')
            document.getElementById('operator')?.focus()
            return
        }

        if (!senderPhone || senderPhone.trim().length < 8) {
            setError('Veuillez saisir le numéro de téléphone de l\'expéditeur.')
            document.getElementById('senderPhone')?.focus()
            return
        }

        if (!amount || Number(amount) <= 0) {
            setError('Veuillez saisir le montant que vous avez envoyé.')
            document.getElementById('amount')?.focus()
            return
        }

        const numAmount = Number(amount)
        if (numAmount > remainingBalance + 1) {
            setError(`Le montant saisi (${numAmount.toLocaleString('fr-FR')} F) dépasse votre solde restant (${remainingBalance.toLocaleString('fr-FR')} F).`)
            document.getElementById('amount')?.focus()
            return
        }

        if (!file) {
            setError('Veuillez sélectionner la photo de votre reçu de paiement.')
            return
        }

        const { compressImage } = await import('@/utils/image-compression')
        const compressedFile = await compressImage(file)

        const formData = new FormData()
        formData.append('loanId', loanId)
        formData.append('amount', amount)
        formData.append('proof', compressedFile)
        formData.append('operator', operator)
        formData.append('senderPhone', senderPhone.trim())

        startTransition(async () => {
            const result = await submitRepayment(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                router.push('/client/dashboard?success=PaiementEnvoye')
            }
        })
    }

    return (
        <div className="glass-panel p-10 max-w-xl mx-auto bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-600/10 transition-colors"></div>

            <h2 className="text-3xl font-black mb-2 text-white uppercase italic tracking-tighter text-left">
                Envoyer mon <span className="premium-gradient-text uppercase">reçu.</span>
            </h2>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic mb-8">
                Certains champs sont optionnels pour faciliter votre remboursement.
            </p>

            {error && (
                <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex flex-col gap-4 animate-shake text-left">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest italic">
                        <Warning size={24} />
                        {error}
                    </div>
                    <div className="pt-3 border-t border-red-500/10 flex justify-between items-center">
                        <p className="text-[8px] font-bold text-red-500/60 uppercase italic tracking-widest leading-none">Un problème ?</p>
                        <a
                            href="https://wa.me/2290153324490?text=Bonjour, j'ai un problème avec mon remboursement sur Creditly."
                            target="_blank"
                            className="bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter italic transition-all flex items-center gap-2 border border-red-500/20"
                        >
                            Contacter le Support
                        </a>
                    </div>
                </div>
            )}

            <div className="space-y-8 text-left">


                {/* Opérateur & Téléphone expéditeur */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label htmlFor="operator" className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            Opérateur Mobile Money <span className="text-slate-600">(Obligatoire)</span>
                        </label>
                        <select
                            id="operator"
                            value={operator}
                            onChange={(e) => setOperator(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-slate-950 text-white text-base font-bold italic focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all cursor-pointer"
                        >
                            <option value="" disabled className="bg-slate-950 text-slate-700">Choisir un opérateur</option>
                            <option value="MTN" className="bg-slate-950 text-white">MTN Mobile Money</option>
                            <option value="Moov" className="bg-slate-950 text-white">Moov Money</option>
                            <option value="Celtiis" className="bg-slate-950 text-white">Celtiis Cash</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label htmlFor="senderPhone" className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            Numéro Expéditeur <span className="text-slate-600">(Obligatoire)</span>
                        </label>
                        <input
                            id="senderPhone"
                            type="tel"
                            placeholder="Ex: 0707070707"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-slate-950 text-white text-base font-bold italic focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-800 tracking-wider"
                        />
                    </div>
                </div>

                {/* Montant */}
                <div className="space-y-3">
                    <label htmlFor="amount" className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Somme envoyée (FCFA)</label>
                    <div className="relative group/input">
                        <input
                            id="amount"
                            type="number"
                            placeholder="Ex: 50000"
                            value={amount}
                            max={remainingBalance}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-6 py-6 rounded-2xl border border-white/5 bg-slate-950 text-white text-3xl font-black italic tracking-tighter focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-800"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-xs uppercase tracking-widest group-focus-within/input:text-emerald-500 transition-colors italic">FCFA</div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-700 ml-1 italic">
                        Reste à payer : <span className="text-emerald-500">{remainingBalance.toLocaleString('fr-FR')} FCFA</span>
                    </p>
                </div>

                {/* Upload reçu */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Photo du reçu (Capture d&apos;écran)</label>
                    <div className="relative group/file">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            accept=".jpg,.jpeg,.png,.pdf"
                            capture="environment"
                            onChange={(e) => {
                                const files = e.target.files
                                if (files && files[0]) setFile(files[0])
                            }}
                        />
                        <div className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all duration-500 bg-white/5 ${file ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-600/5'}`}>
                            {file ? (
                                <>
                                    <div className="w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-xl">
                                        <CheckmarkOutline size={32} />
                                    </div>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">{file.name}</p>
                                    <p className="text-[8px] font-bold text-slate-700 uppercase mt-1 italic">C&apos;est bon ! Cliquez sur envoyer</p>
                                </>
                            ) : (
                                <>
                                    <Upload size={40} className="text-slate-700 group-hover:text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                                    <span className="text-[10px] font-black text-slate-600 group-hover:text-white uppercase tracking-[0.3em] transition-colors italic">Choisir la photo / Prendre en photo</span>
                                    <span className="text-[8px] font-bold text-slate-800 uppercase mt-2 italic tracking-widest">Max 10 Mo — JPG, PNG, PDF</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <ActionButton
                    onClick={handleAction}
                    disabled={!file || !amount || !operator || !senderPhone}
                    loading={isPending}
                    loadingText="Envoi en cours..."
                    className="w-full py-6 text-sm bg-emerald-600 border-emerald-500 hover:bg-emerald-500 shadow-emerald-600/20 active:scale-[0.98] group/btn"
                >
                    <Upload size={20} className="group-hover/btn:-translate-y-1 transition-transform" />
                    Envoyer mon reçu
                </ActionButton>
            </div>

            <p className="mt-8 text-center text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] italic">On vérifie votre reçu dans les prochaines heures pour valider votre paiement.</p>
        </div>
    )
}
