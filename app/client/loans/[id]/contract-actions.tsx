'use client'

import { useState } from 'react'
import { Download, Printer, Document } from '@carbon/icons-react'
import { pdf } from '@react-pdf/renderer'
import { LoanPDFDocument } from '../request/loan-pdf'
import { numberToFrench } from '@/utils/formatters'
import ConfirmModal from '@/app/components/ui/ConfirmModal'

interface LoanContractActionsProps {
    loan: any;
    profile: any;
}

export default function LoanContractActions({ loan, profile }: LoanContractActionsProps) {
    const [downloading, setDownloading] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    // FEE_START_DATE logic synchronized with admin and request side
    const FEE_START_DATE = new Date('2026-03-09T00:00:00')
    const loanDate = new Date(loan.created_at)
    const hasFee = loanDate >= FEE_START_DATE
    const totalAmount = hasFee ? (loan.amount + 500) : loan.amount
    const amountInWords = numberToFrench(totalAmount)

    const handleDownload = async () => {
        try {
            setDownloading(true)

            const doc = (
                <LoanPDFDocument
                    applicationDate={loan.created_at}
                    userData={{
                        nom: profile.nom,
                        prenom: profile.prenom,
                        email: profile.email
                    }}
                    loanData={{
                        amount: loan.amount,
                        payoutPhone: loan.payout_phone || '',
                        payoutNetwork: loan.payout_network || 'MTN',
                        dueDate: loan.due_date ? new Date(loan.due_date).toLocaleDateString('fr-FR') : 'Non définie'
                    }}
                    personalData={{
                        birthDate: loan.borrower_birth_date || '',
                        address: loan.borrower_address || '',
                        idDetails: loan.borrower_id_details || '',
                        city: loan.borrower_city || '',
                        profession: loan.borrower_profession || ''
                    }}
                    signature={loan.waiver_signed_at ? `${profile.prenom} ${profile.nom}` : 'SIGNATURE DIGITALE'}
                    amountInWords={amountInWords}
                    repaymentNumber={loan.repayment_phone || '+229 01 53 32 44 90'}
                />
            )

            const blob = await pdf(doc).toBlob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Contrat_Creditly_${profile.nom}_${loan.id.substring(0, 8)}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('PDF Generation Error:', err)
            alert('Erreur lors de la génération du PDF. Veuillez réessayer.')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <>
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => setShowPreview(true)}
                    className="flex-1 py-4 px-6 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                    <Document size={18} />
                    Aperçu Contrat
                </button>
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className={`flex-1 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${downloading
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
                        }`}
                >
                    <Download size={18} />
                    {downloading ? 'Génération...' : 'Télécharger PDF'}
                </button>
            </div>

            {/* Preview Modal matching Admin UX but simplified for client */}
            <ConfirmModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                title="MON CONTRAT CERTIFIÉ"
                description={`Visualisation du contrat N° ${loan.id.substring(0, 8).toUpperCase()}`}
                hideButtons={true}
                maxWidth="lg"
            >
                <div className="space-y-6">
                    <div className="max-h-[60vh] overflow-y-auto p-8 bg-white text-black font-serif rounded-2xl shadow-inner text-xs leading-relaxed relative">
                        {/* Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none opacity-[0.03] select-none text-[80px] font-black border-[10px] border-black p-4 z-0">
                            CERTIFIÉ
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="flex justify-between items-start border-b border-black pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-black text-lg italic">C</div>
                                    <span className="font-black text-xl italic uppercase tracking-tighter">Creditly</span>
                                </div>
                                <div className="text-right">
                                    <p className="font-black">CONTRAT OFFICIEL</p>
                                    <p className="text-[10px] italic">Signé le {loan.waiver_signed_at ? new Date(loan.waiver_signed_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                </div>
                            </div>

                            <p className="text-justify italic">
                                Je soussigné(e), Monsieur/Madame <strong>{profile.prenom} {profile.nom}</strong>,
                                reconnaît avoir contracté auprès de <strong>Creditly</strong> un prêt de <strong>{loan.amount.toLocaleString()} FCFA</strong>
                                {hasFee ? <> (majoré de 500 F de frais)</> : ''}.
                            </p>

                            <div className="p-4 bg-gray-50 border-2 border-double border-black text-center">
                                <p className="text-2xl font-black italic">{totalAmount.toLocaleString()} FCFA</p>
                                <p className="text-[8px] font-black uppercase text-gray-500 mt-1">{amountInWords} FRANCS CFA</p>
                            </div>

                            <p className="text-justify font-bold">
                                Je m'engage à rembourser cette somme au plus tard le : {loan.due_date ? new Date(loan.due_date).toLocaleDateString('fr-FR') : 'Non définie'}.
                            </p>

                            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-black">
                                <div>
                                    <p className="font-black text-[10px] uppercase underline">Débiteur</p>
                                    <p className="mt-2 font-black italic text-blue-800">{profile.prenom} {profile.nom}</p>
                                    <p className="text-[8px] opacity-50">ID: {loan.id.substring(0, 16)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-[10px] uppercase underline">Créancier</p>
                                    <p className="mt-2 font-black">CREDITLY GROUP</p>
                                    <p className="text-[8px] text-emerald-600 font-bold uppercase">Approuvé & Certifié</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => window.print()}
                            className="py-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2"
                        >
                            <Printer size={18} />
                            Version Papier
                        </button>
                        <button
                            onClick={() => { setShowPreview(false); handleDownload(); }}
                            className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Download size={18} />
                            Télécharger PDF
                        </button>
                    </div>
                </div>
            </ConfirmModal>
        </>
    )
}
