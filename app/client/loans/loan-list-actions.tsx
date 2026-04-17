'use client'

import { useState } from 'react'
import { Download, Document } from '@carbon/icons-react'
import { pdf } from '@react-pdf/renderer'
import { LoanPDFDocument } from './request/loan-pdf'
import { numberToFrench } from '@/utils/formatters'

interface LoanListActionsProps {
    loan: any;
    profile: any;
}

export default function LoanListActions({ loan, profile }: LoanListActionsProps) {
    const [downloading, setDownloading] = useState(false)

    const FEE_START_DATE = new Date('2026-03-09T00:00:00')
    const loanDate = new Date(loan.created_at)
    const hasFee = loanDate >= FEE_START_DATE
    const totalAmount = hasFee ? (loan.amount + 500) : loan.amount
    const amountInWords = numberToFrench(totalAmount)

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

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
                    signature={`${profile.prenom} ${profile.nom}`}
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
        } finally {
            setDownloading(false)
        }
    }

    if (!loan.waiver_signed_at) return null

    return (
        <button
            onClick={handleDownload}
            disabled={downloading}
            title="Télécharger votre contrat signé"
            className={`p-2 rounded-lg transition-all ${downloading
                ? 'bg-blue-600/20 text-blue-400 animate-pulse'
                : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'
                }`}
        >
            <Download size={16} />
        </button>
    )
}
