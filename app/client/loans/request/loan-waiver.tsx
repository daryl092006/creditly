'use client'

import { useState } from 'react'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { CheckmarkFilled, Warning, Printer, Download } from '@carbon/icons-react'
import { useRef, useEffect, useMemo } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { LoanPDFDocument } from './loan-pdf'
import { numberToFrench } from '@/utils/formatters'

interface WaiverProps {
    userData: {
        nom: string;
        prenom: string;
        birth_date?: string;
        address?: string;
        city?: string;
        profession?: string;
    };
    loanData: {
        amount: number;
        payoutPhone: string;
        payoutNetwork: string;
        dueDate: string;
        dueDateRaw: Date;
        serviceFee: number;
    };
    onConfirm: (personalData: PersonalData) => void;
    onBack: () => void;
    loading: boolean;
    repaymentPhones: {
        MTN: string;
        Moov: string;
        Celtiis: string;
    };
}

export interface PersonalData {
    birthDate: string;
    address: string;
    idDetails: string;
    city: string;
    profession: string;
}

export default function LoanWaiver({ userData, loanData, onConfirm, onBack, loading, repaymentPhones }: WaiverProps) {
    const repaymentNumber = repaymentPhones[loanData.payoutNetwork as keyof typeof repaymentPhones] || repaymentPhones.MTN
    const [personalData, setPersonalData] = useState<PersonalData>({
        birthDate: userData.birth_date || '',
        address: userData.address || '',
        idDetails: '',
        city: userData.city || 'Cotonou',
        profession: userData.profession || ''
    })
    const [accepted, setAccepted] = useState(false)
    const [signature, setSignature] = useState('')
    const [error, setError] = useState<string | null>(null)

    const totalToRepay = loanData.amount + loanData.serviceFee
    const amountInWords = numberToFrench(totalToRepay)
    const today = new Date()
    const todayFormatted = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    // Calculate exact days remaining
    const diffTime = Math.abs(loanData.dueDateRaw.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const handlePrint = () => {
        window.print();
    }

    const [isClient, setIsClient] = useState(false)
    useEffect(() => {
        setIsClient(true)
    }, [])

    const userNom = (userData.nom || '').trim()
    const canSubmit = accepted &&
        personalData.birthDate &&
        personalData.address &&
        personalData.idDetails &&
        personalData.profession &&
        signature.toLowerCase().trim().includes(userNom.toLowerCase())

    // EXPERT: Memoize PDF to prevent re-renders on every keystroke
    const pdfDoc = useMemo(() => {
        if (!isClient || !canSubmit) return null;
        return (
            <LoanPDFDocument
                userData={userData}
                loanData={loanData}
                personalData={personalData}
                signature={signature || `${userData.prenom} ${userData.nom}`}
                amountInWords={amountInWords}
                repaymentNumber={repaymentNumber}
                applicationDate={new Date().toISOString()}
            />
        );
    }, [isClient, canSubmit, userData, loanData, personalData, signature, amountInWords, repaymentNumber]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
                {/* Contract Header */}
                <div className="p-8 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter text-center">
                        CONTRAT DE PRÊT <br />
                        <span className="text-blue-600">& ENGAGEMENT</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold text-center mt-2 uppercase tracking-widest italic">
                        Collaboration Creditly – Prêt sans intérêt
                    </p>
                </div>

                {/* Contract Body */}
                <div className="p-8 space-y-6 text-slate-600 font-medium text-sm leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
                    <div className="space-y-4">
                        <p>
                            Je soussigné(e), Nom et prénom : <strong className="text-slate-900 italic">{userData.prenom} {userData.nom}</strong>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date de naissance</label>
                                <input
                                    id="birthDate"
                                    type="date"
                                    value={personalData.birthDate}
                                    onChange={e => setPersonalData({ ...personalData, birthDate: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Votre carte d'identité (Numéro)</label>
                                <input
                                    id="idDetails"
                                    type="text"
                                    placeholder="Ex: CNI 102930910"
                                    value={personalData.idDetails}
                                    onChange={e => setPersonalData({ ...personalData, idDetails: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Où habitez-vous ?</label>
                                <input
                                    id="address"
                                    type="text"
                                    placeholder="Quartier, Rue, Maison..."
                                    value={personalData.address}
                                    onChange={e => setPersonalData({ ...personalData, address: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Votre travail</label>
                                <input
                                    id="profession"
                                    type="text"
                                    placeholder="Ex: Enseignant, Commerçant..."
                                    value={personalData.profession}
                                    onChange={e => setPersonalData({ ...personalData, profession: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <p>
                            reconnais avoir reçu de <strong>Creditly</strong>, dans le cadre d’une collaboration privée, un prêt sans intérêt d’un montant de <strong className="text-slate-900 italic">{loanData.amount.toLocaleString('fr-FR')} FCFA</strong> auquel s'ajoutent des frais de dossier de <strong className="text-slate-900 italic">{loanData.serviceFee.toLocaleString('fr-FR')} FCFA</strong>, soit un montant total de :
                        </p>

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total à rembourser</p>
                                <p className="text-lg font-black text-slate-900 italic">{totalToRepay.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Écrit en lettres</p>
                                <p className="text-xs font-bold text-slate-700 italic">{amountInWords} francs CFA</p>
                            </div>
                        </div>

                        <p>
                            Je reconnais que cette somme constitue une de dette certaine, liquide et exigible et je m’engage à la rembourser en totalité, sans intérêt supplémentaire, au plus tard le :
                            <strong className="text-slate-900 ml-2 italic">{loanData.dueDate}</strong> <span className="text-blue-600 font-bold italic ml-1">(soit dans {diffDays} jours)</span>.
                        </p>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">POUR LE REMBOURSEMENT</h3>
                            <p>
                                Je m'engage à rembourser sur l'un des comptes officiels de <strong>Creditly</strong> : <br />
                                Réseau : <strong className="text-slate-900 italic">{loanData.payoutNetwork}</strong> <br />
                                Numéro de réception : <strong className="text-blue-600 italic font-black">{repaymentNumber}</strong>
                            </p>
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1 italic">Règle de remboursement</p>
                                <p className="text-[10px] text-slate-500 font-bold italic">
                                    Tout versement égal au montant total dû solde votre dette et vous permet de reprendre un nouveau prêt instantanément.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DÉCHARGE DE RESPONSABILITÉ ET ACCEPTATION DES POLITIQUES</h3>
                            <p className="text-xs">
                                Le débiteur reconnaît que Creditly a rempli toutes ses obligations et le dégage de toute responsabilité autre que l’obligation de remboursement.
                            </p>
                            <p className="text-xs">
                                En signant le présent document, le bénéficiaire reconnaît avoir pris connaissance, comprendre et accepter sans réserve la politique de confidentialité ainsi que les conditions de remboursement des micro-prêts Creditly. La signature vaut acceptation expresse, définitive et opposable de l’ensemble des conditions.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-8 text-[10px]">
                            <div>
                                <p className="font-black text-slate-400 uppercase tracking-widest mb-4 italic">Signé par le débiteur</p>
                                <p className="text-xs font-black text-slate-900 italic">{userData.prenom} {userData.nom}</p>
                                <p className="text-slate-400 mt-1 italic">Le {todayFormatted}</p>
                            </div>
                            <div>
                                <p className="font-black text-slate-400 uppercase tracking-widest mb-4 italic">Signé pour Creditly</p>
                                <p className="text-xs font-black text-slate-900 italic">Direction Opérationnelle</p>
                                <p className="text-slate-400 mt-1 italic">Approbation Directe</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl text-[9px] text-slate-400 italic leading-snug">
                            <p><strong>Politique de confidentialité – Micro-prêts Creditly :</strong> Les renseignements personnels recueillis sont utilisés uniquement pour la gestion du micro-prêt. Ils demeurent confidentiels et peuvent être communiqués uniquement lorsque requis par la loi ou dans le cadre de démarches légales de recouvrement. En cas de non-remboursement, Creditly se réserve le droit d’entreprendre toute action légale permise. Les frais raisonnables de recouvrement peuvent être réclamés au débiteur. Le présent document constitue un engagement contractuel exécutoire.</p>
                        </div>
                    </div>
                </div>

                {/* Signature UI */}
                <div className="p-8 border-t border-white/5 space-y-6 bg-slate-900/30">
                    <div className="flex items-start gap-4">
                        <div className="pt-1">
                            <input
                                type="checkbox"
                                id="accept"
                                checked={accepted}
                                onChange={e => setAccepted(e.target.checked)}
                                className="w-5 h-5 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-blue-500/20 transition-all cursor-pointer"
                            />
                        </div>
                        <label htmlFor="accept" className="text-xs font-bold text-slate-400 cursor-pointer select-none">
                            J&apos;ai bien lu et je suis d&apos;accord avec tout ce qui est écrit au dessus.
                        </label>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Signature (Écrivez votre nom complet ici)</label>
                        <input
                            id="signature"
                            type="text"
                            placeholder={`${userData.prenom} ${userData.nom}`}
                            value={signature}
                            onChange={e => setSignature(e.target.value)}
                            className="w-full px-6 py-4 rounded-xl border border-white/5 bg-slate-950 text-white font-black italic outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
                        />
                        <p className="text-[9px] text-slate-600 italic">En écrivant votre nom, vous signez officiellement ce contrat.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 no-print">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 px-6 bg-slate-800 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl border border-white/5 hover:bg-slate-700 hover:text-white transition-all active:scale-[0.98]"
                >
                    Retour
                </button>
                <div className="flex-1 flex flex-col gap-2">
                    <button
                        onClick={handlePrint}
                        className="w-full py-4 px-6 bg-slate-900 text-blue-500 font-black uppercase italic tracking-widest rounded-2xl border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Printer size={20} />
                        Imprimer
                    </button>
                    {isClient && canSubmit && pdfDoc && (
                        <div className="flex flex-col gap-1">
                            <PDFDownloadLink
                                document={pdfDoc}
                                fileName={`Contrat_Creditly_${userData.nom}_${new Date().getTime()}.pdf`}
                                className="w-full py-3 px-6 bg-emerald-600 text-white font-black text-[10px] uppercase italic tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all text-center flex items-center justify-center gap-2"
                            >
                                {({ loading: pdfLoading, error: pdfError }) => (
                                    <>
                                        <Download size={16} />
                                        {pdfLoading ? 'Préparation...' : pdfError ? 'Erreur PDF' : 'Télécharger PDF Pro'}
                                    </>
                                )}
                            </PDFDownloadLink>
                            <p className="text-[8px] text-slate-500 text-center italic">Document officiel certifié</p>
                        </div>
                    )}
                    {isClient && !canSubmit && (
                        <div className="p-3 bg-slate-900/50 border border-white/5 rounded-xl text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic">Remplissez le formulaire <br /> pour débloquer le PDF</p>
                        </div>
                    )}
                </div>
                <div className="flex-[2] flex flex-col gap-2">
                    {error && (
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic animate-shake">{error}</p>
                    )}
                    <ActionButton
                        onClick={() => {
                            setError(null)
                            if (!personalData.birthDate) { setError("Indiquez votre date de naissance."); document.getElementById('birthDate')?.focus(); return; }
                            if (!personalData.idDetails) { setError("Le numéro de votre pièce d'identité est requis."); document.getElementById('idDetails')?.focus(); return; }
                            if (!personalData.address) { setError("Veuillez indiquer votre adresse complète."); document.getElementById('address')?.focus(); return; }
                            if (!personalData.profession) { setError("Votre profession est requise."); document.getElementById('profession')?.focus(); return; }
                            if (!accepted) { setError("Veuillez accepter les conditions du contrat."); return; }
                            if (!signature.toLowerCase().trim().includes(userNom.toLowerCase())) {
                                setError(`Veuillez signer en tapant votre nom complet : ${userNom}`);
                                document.getElementById('signature')?.focus();
                                return;
                            }
                            onConfirm(personalData)
                        }}
                        loading={loading}
                        className={`w-full py-4 px-6 rounded-2xl font-black uppercase italic tracking-widest transition-all ${canSubmit ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500' : 'bg-slate-800 text-slate-600 border border-white/5 hover:bg-slate-700 hover:text-slate-400'}`}
                    >
                        Valider ma demande
                    </ActionButton>
                </div>
            </div>

            {/* Hidden Printable Version - Styled for Page Print */}
            <div className="hidden print-only print:block text-[#1a1a1a] bg-white p-16 font-serif text-xs leading-relaxed max-w-[800px] mx-auto relative" id="printable-waiver">

                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                    <p className="text-[120px] font-black transform -rotate-45 border-[20px] border-black px-10">OFFICIEL</p>
                </div>

                {/* Header Section */}
                <div className="flex justify-between items-start mb-12 border-b-2 border-black pb-8 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-lg italic">C</div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Creditly<span className="text-gray-400">.</span></h1>
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gray-500">Solutions de Micro-Crédit Instantané</p>
                        <p className="text-[8px] text-gray-400">Secteur des Opérations Internationales • Digitale-Only Access</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[10px] font-bold uppercase">Contrat N° {Math.random().toString(36).substring(7).toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500 italic">Émis le {todayFormatted}</p>
                        <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 rounded mt-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Document Certifié</p>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-12">
                    <h2 className="text-xl font-bold uppercase underline underline-offset-8 decoration-1 mb-2">Engagement Unilatéral de Remboursement</h2>
                    <p className="text-[10px] italic text-gray-500">Document à valeur contractuelle et exécutoire</p>
                </div>

                {/* Body Section */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-4">
                        <p className="text-justify">
                            Je soussigné(e), Monsieur/Madame <strong>{userData.prenom} {userData.nom}</strong>,
                            demeurant au <strong>{personalData.address || '________________'}</strong>,
                            dans la ville de <strong>{personalData.city || '________________'}</strong>,
                            exerçant la profession de <strong>{personalData.profession || '________________'}</strong>,
                            et titulaire de la pièce d'identité N° <strong>{personalData.idDetails || '________________'}</strong>.
                        </p>

                        <p className="text-justify">
                            Reconnais par la présente, avoir contracté auprès de la plateforme <strong>Creditly</strong> un prêt de type "Avance sur Revenu" d'un montant de <strong>{loanData.amount.toLocaleString('fr-FR')} FCFA</strong> avec des frais de dossier fixes de <strong>500 FCFA</strong>, soit un montant total de :
                        </p>

                        <div className="flex justify-center my-8">
                            <div className="border-2 border-black p-6 bg-gray-50 text-center min-w-[300px] shadow-sm">
                                <p className="text-2xl font-black mb-1">{totalToRepay.toLocaleString('fr-FR')} FCFA</p>
                                <p className="text-[10px] font-medium italic border-t border-gray-300 pt-2 text-gray-600 uppercase">
                                    {(amountInWords + ' francs CFA').toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <p className="text-justify">
                            Je m'engage formellement et irrévocablement à rembourser l'intégralité de cette somme au profit de <strong>Creditly</strong>, par transfert via le réseau <strong>{loanData.payoutNetwork}</strong> au numéro référencé <strong>{repaymentNumber}</strong>, au plus tard le :
                            <strong className="underline ml-1">{loanData.dueDate}</strong> <span className="italic">(soit dans {diffDays} jours)</span>.
                        </p>

                        <div className="grid grid-cols-1 gap-6 pt-8">
                            <div className="p-4 border border-gray-200 bg-gray-50 space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-gray-300 pb-1">Clauses et Engagements</h3>
                                <div className="grid grid-cols-1 gap-3 text-[9px] text-gray-600 italic leading-snug">
                                    <p>1. Le débiteur reconnaît que cette dette est certaine, liquide et exigible à l'échéance indiquée.</p>
                                    <p>2. Tout retard excédant 48h après l'échéance pourra entraîner l'application de pénalités forfaitaires de recouvrement.</p>
                                    <p>3. Le présent document constitue un titre de créance permettant d'engager toute procédure de recouvrement légale nécessaire.</p>
                                    <p>4. La signature numérique apposée ci-dessous a la même valeur juridique qu'une signature manuscrite.</p>
                                    <p>5. Tout versement égal au montant total dû solde officiellement votre créance.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-20 mt-20">
                        <div className="space-y-12">
                            <div className="border-t border-black pt-2">
                                <p className="font-bold text-[10px] uppercase mb-1">Le Débiteur (Signature)</p>
                                <p className="text-[9px] text-gray-500 mb-6 italic">"Bon pour accord et engagement de remboursement"</p>
                                <div className="h-16 flex items-end">
                                    <p className="font-serif text-xl italic font-medium">{signature || userData.prenom + ' ' + userData.nom}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-12 relative">
                            {/* Digital Stamp */}
                            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-8 rotate-12 flex items-center justify-center pointer-events-none">
                                <div className="w-24 h-24 border-[3px] border-blue-900/40 rounded-full flex flex-col items-center justify-center p-1">
                                    <div className="w-full h-full border border-blue-900/40 rounded-full flex flex-col items-center justify-center text-center">
                                        <p className="text-[7px] font-black text-blue-900/60 leading-none mb-1">CREDITLY.IO</p>
                                        <div className="w-16 h-[1px] bg-blue-900/40 my-1"></div>
                                        <p className="text-[8px] font-black text-blue-900/60 uppercase leading-none">APPROUVÉ</p>
                                        <div className="w-16 h-[1px] bg-blue-900/40 my-1"></div>
                                        <p className="text-[6px] font-bold text-blue-900/40">{new Date().getFullYear()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-black pt-2">
                                <p className="font-bold text-[10px] uppercase mb-1">Pour Creditly (L'Organisation)</p>
                                <p className="text-[9px] text-gray-500 mb-6 italic">Validation Digitale Sécurisée</p>
                                <div className="h-16 flex items-end">
                                    <div className="px-4 py-1 border-2 border-blue-900/60 text-blue-900/60 text-[9px] font-black uppercase rotate-[-5deg]">
                                        Certification Automatique
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-32 pt-4 border-t border-gray-200 text-center">
                    <p className="text-[7px] text-gray-400 uppercase tracking-widest leading-relaxed">
                        Creditly Finance Group • Document généré de manière électronique • 100% Digital Workflow <br />
                        Toute reproduction sans le consentement du débiteur et de la plateforme est interdite.
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    html, body {
                        background-color: white !important;
                        color: #1a1a1a !important;
                        filter: none !important;
                    }
                    /* Désactiver le mode sombre du navigateur pour l'impression */
                    * { 
                        color-adjust: exact !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                    /* Cache tout ce qui n'est pas le contrat */
                    body { visibility: hidden !important; background: white !important; }
                    
                    #printable-waiver {
                        visibility: visible !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        display: block !important;
                        background-color: white !important;
                        color: black !important;
                        padding: 20px !important;
                    }
                    #printable-waiver * { visibility: visible !important; }
                    .no-print { display: none !important; }
                }
                .print-only { display: none; }
            `}</style>
        </div>
    )
}

