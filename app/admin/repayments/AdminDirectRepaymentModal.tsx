'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { createDirectRepayment, searchUsersWithNameOrEmail, getActiveLoansForUser } from '../actions'
import { Upload, CheckmarkOutline, Warning, Search, User, Money, Calendar } from '@carbon/icons-react'
import { ActionButton } from '@/app/components/ui/ActionButton'

interface UserMatch {
    id: string;
    nom: string;
    prenom: string;
    email: string;
}

interface LoanMatch {
    id: string;
    amount: number;
    amount_paid: number;
    created_at: string;
    due_date: string;
    plan?: { name: string };
}

export default function AdminDirectRepaymentModal({
    isOpen,
    onClose,
    initialUser = null,
    initialLoan = null
}: {
    isOpen: boolean;
    onClose: () => void;
    initialUser?: UserMatch | null;
    initialLoan?: LoanMatch | null;
}) {
    const [step, setStep] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState<UserMatch[]>([])
    const [selectedUser, setSelectedUser] = useState<UserMatch | null>(null)
    const [loans, setLoans] = useState<LoanMatch[]>([])
    const [selectedLoan, setSelectedLoan] = useState<LoanMatch | null>(null)
    const [amount, setAmount] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (initialUser) {
                setSelectedUser(initialUser)
                setStep(2)

                // Fetch loans for this user if not provided or to ensure fresh data
                const fetchLoans = async () => {
                    setIsSearching(true)
                    const userLoans = await getActiveLoansForUser(initialUser.id)
                    setLoans(userLoans)
                    if (initialLoan) {
                        // Find the matching loan in the fresh list if possible
                        const match = userLoans.find(l => l.id === initialLoan.id)
                        setSelectedLoan(match || initialLoan)
                    }
                    setIsSearching(false)
                }
                fetchLoans()
            }
        } else {
            // Reset state on close
            setStep(1)
            setSearchQuery('')
            setSelectedUser(null)
            setSelectedLoan(null)
            setAmount('')
            setFile(null)
            setError(null)
        }
    }, [isOpen, initialUser, initialLoan])

    const handleSearch = async () => {
        if (searchQuery.length < 2) return
        setIsSearching(true)
        const results = await searchUsersWithNameOrEmail(searchQuery)
        setUsers(results)
        setIsSearching(false)
    }

    const selectUser = async (user: UserMatch) => {
        setSelectedUser(user)
        setIsSearching(true)
        const userLoans = await getActiveLoansForUser(user.id)
        setLoans(userLoans)
        setIsSearching(false)
        setStep(2)
    }

    const handleCreate = async () => {
        if (!selectedLoan || !selectedUser || !amount) {
            setError("Veuillez remplir tous les champs obligatoires.")
            return
        }

        const formData = new FormData()
        formData.append('loanId', selectedLoan.id)
        formData.append('userId', selectedUser.id)
        formData.append('amount', amount)
        if (file) formData.append('proof', file)

        startTransition(async () => {
            const result = await createDirectRepayment(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                window.location.reload()
            }
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in">
                {/* Header Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <div className="p-8 sm:p-12 relative z-10">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Paiement <span className="premium-gradient-text uppercase">Direct Admin.</span></h2>
                            <p className="text-slate-500 font-bold text-xs mt-1 italic uppercase tracking-widest">Enregistrer un versement pour un client</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-[10px] font-black uppercase text-red-500 animate-shake">
                            <Warning size={20} />
                            {error}
                        </div>
                    )}

                    {/* Step 1: User Selection */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input
                                    type="text"
                                    placeholder="Nom, Prénom ou Email du client..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-14 pr-32 py-5 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700 italic"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching || searchQuery.length < 2}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50"
                                >
                                    Chercher
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {users.length > 0 ? users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => selectUser(user)}
                                        className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-emerald-500">
                                            <User size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-white italic uppercase tracking-tight">{user.prenom} {user.nom}</p>
                                            <p className="text-[10px] font-bold text-slate-500 lowercase">{user.email}</p>
                                        </div>
                                    </button>
                                )) : searchQuery.length >= 2 && !isSearching ? (
                                    <p className="text-center py-10 text-slate-600 font-bold italic">Aucun utilisateur trouvé.</p>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Loan & Amount Selection */}
                    {step === 2 && selectedUser && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <User size={20} className="text-emerald-500" />
                                    <span className="text-xs font-black text-white uppercase italic">{selectedUser.prenom} {selectedUser.nom}</span>
                                </div>
                                <button onClick={() => setStep(1)} className="text-[10px] font-black text-emerald-500 underline uppercase tracking-widest">Changer</button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Choisir le prêt concerné</label>
                                <div className="grid grid-cols-1 gap-3 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {loans.length > 0 ? loans.map(loan => (
                                        <button
                                            key={loan.id}
                                            onClick={() => setSelectedLoan(loan)}
                                            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${selectedLoan?.id === loan.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-blue-500">
                                                    <Money size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-white italic leading-none">{loan.plan?.name || 'Prêt Standard'}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Du {new Date(loan.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-white italic">{(loan.amount - loan.amount_paid).toLocaleString()} F</p>
                                                <p className="text-[8px] font-black text-blue-300 opacity-50 uppercase tracking-tight">Reste à payer</p>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="p-6 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
                                            <p className="text-xs font-bold text-red-500 italic uppercase">Aucun prêt actif trouvé pour ce client.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedLoan && (
                                <div className="space-y-6 pt-4 animate-slide-up">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Somme reçue (FCFA)</label>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white text-2xl font-black italic outline-none focus:border-emerald-500/50 transition-all"
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800">FCFA</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Preuve (Optionnel)</label>
                                            <div className="relative group/file h-[62px]">
                                                <input
                                                    type="file"
                                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className={`h-full border border-dashed rounded-2xl flex items-center justify-center transition-all ${file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 group-hover/file:border-blue-500/30'}`}>
                                                    {file ? (
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase truncate px-4">{file.name}</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2 opacity-30">
                                                            <Upload size={16} />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Ajouter un reçu</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <ActionButton
                                            onClick={handleCreate}
                                            disabled={!selectedLoan || !selectedUser || !amount}
                                            loading={isPending}
                                            loadingText="Validation en cours..."
                                            className="w-full py-5 bg-emerald-600 border-emerald-500 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 active:scale-95"
                                        >
                                            <CheckmarkOutline size={20} />
                                            Valider et Créditer Immédiatement
                                        </ActionButton>
                                        <p className="mt-4 text-[8px] font-black text-slate-700 uppercase tracking-[0.3em] text-center italic">
                                            Le compte du client sera crédité instantanément. Action irréversible.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
