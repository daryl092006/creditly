'use client'

import React, { useState, useEffect } from 'react'
import { Close, CheckmarkFilled, WarningFilled, View, Money, User, Calendar } from '@carbon/icons-react'

interface DoubleValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (status: 'verified' | 'rejected') => Promise<void>;
    repayment: {
        id: string;
        user: string;
        amount_declared: number;
        proof_url: string;
        date: string;
        status: string;
        loan_id: string;
        admin_first?: string;
    };
    proofUrl: string | null;
    isLoading: boolean;
}

export default function DoubleValidationModal({
    isOpen,
    onClose,
    onConfirm,
    repayment,
    proofUrl,
    isLoading
}: DoubleValidationModalProps) {
    if (!isOpen) return null;

    const isSecondValidation = !!repayment.admin_first;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-fade-in">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={onClose}></div>

            <div className="relative w-full max-w-7xl h-[90vh] bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row">

                {/* Left: Proof Preview */}
                <div className="w-full md:w-3/5 h-1/2 md:h-full bg-slate-950 relative border-r border-white/5 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Document de Preuve</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 text-[8px] font-black uppercase tracking-widest">
                            <View size={14} /> Haute Résolution
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-slate-900/50 rounded-2xl overflow-hidden shadow-inner relative group">
                        {proofUrl ? (
                            proofUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={proofUrl} className="w-full h-full border-0" />
                            ) : (
                                <img src={proofUrl} alt="Preuve" className="w-full h-full object-contain" />
                            )
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-700 italic">Chargement du document...</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none"></div>
                    </div>
                </div>

                {/* Right: Actions & Metadata */}
                <div className="w-full md:w-2/5 h-1/2 md:h-full p-8 md:p-12 flex flex-col justify-between bg-slate-900">
                    <div className="space-y-12">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="inline-flex px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-[9px] font-black uppercase tracking-[0.2em] italic mb-4">
                                    Double Validation Requise
                                </div>
                                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                                    Vérification <br />
                                    <span className="text-blue-500">Flux Financier.</span>
                                </h2>
                            </div>
                            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 hover:text-white transition-all flex items-center justify-center">
                                <Close size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                        <Money size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Montant</p>
                                        <p className="text-xl font-black text-white italic">{repayment.amount_declared.toLocaleString('fr-FR')} F</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Client</p>
                                        <p className="text-xs font-black text-slate-300 truncate w-32">{repayment.user.split('(')[0]}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Date</p>
                                        <p className="text-xs font-black text-slate-300">{new Date(repayment.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                        <CheckmarkFilled size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Étape</p>
                                        <p className="text-xs font-black text-emerald-500 italic">{isSecondValidation ? 'Étape 2 sur 2' : 'Étape 1 sur 2'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10 space-y-4">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Note de Sécurité</p>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                                Les remboursements supérieurs à 50 000 FCFA sont soumis à un contrôle strict.
                                {isSecondValidation
                                    ? ` ${repayment.admin_first} a déjà validé ce paiement. Votre confirmation finalisera la transaction.`
                                    : " Votre validation sera la première étape. Un second administrateur devra confirmer pour libérer les fonds."}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-12 border-t border-white/5">
                        <div className="flex gap-4">
                            <button
                                onClick={() => onConfirm('verified')}
                                disabled={isLoading}
                                className="flex-1 h-16 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                {isLoading ? 'Validation en cours...' : isSecondValidation ? 'Finaliser l\'entrée' : 'Valider Étape 1'}
                            </button>
                            <button
                                onClick={() => onConfirm('rejected')}
                                disabled={isLoading}
                                className="w-16 h-16 bg-slate-950 text-red-500 rounded-2xl border border-white/5 flex items-center justify-center hover:bg-red-500/5 hover:border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <WarningFilled size={24} />
                            </button>
                        </div>
                        <p className="text-[9px] font-bold text-slate-600 text-center uppercase tracking-widest italic">Action tracée dans les Audit Logs</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
