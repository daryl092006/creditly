'use client'

import React, { useState } from 'react'
import { updateLoanStatus } from '../actions'
import ConfirmModal from '@/app/components/ui/ConfirmModal'
import { useRouter } from 'next/navigation'
import { Printer, Download } from '@carbon/icons-react'
import { LoanPDFDocument } from '@/app/client/loans/request/loan-pdf'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { numberToFrench } from '@/utils/formatters'

interface LoanRow {
    id: string;
    user: string;
    profile: {
        nom: string;
        prenom: string;
        email: string;
        birth_date?: string;
        address?: string;
        city?: string;
        profession?: string;
    } | null;
    amount: number;
    amount_paid: number;
    plan: string;
    date: string;
    due_date?: string;
    status: string;
    payout_phone?: string;
    payout_name?: string;
    payout_network?: string;
    borrower_birth_date?: string;
    borrower_address?: string;
    borrower_city?: string;
    borrower_profession?: string;
    borrower_id_details?: string;
    waiver_signed_at?: string;
    whatsapp?: string;
    admin: { name: string; role: string; whatsapp?: string } | null;
}

interface AdminLoanTableProps {
    rows: LoanRow[];
    currentUserRole: string | null;
    repaymentPhones: {
        MTN: string;
        Moov: string;
        Celtiis: string;
    };
}

export default function AdminLoanTable({ rows, currentUserRole, repaymentPhones }: AdminLoanTableProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string, status: 'active' | 'rejected' } | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [errorAction, setErrorAction] = useState<{ title: string, message: string } | null>(null)
    const [viewWaiver, setViewWaiver] = useState<typeof rows[0] | null>(null)
    const [isClient, setIsClient] = useState(false)
    const router = useRouter()

    React.useEffect(() => {
        setIsClient(true)
    }, [])

    const handleAction = async () => {
        if (!confirmAction) return
        const { id, status } = confirmAction

        if (status === 'rejected' && !rejectionReason.trim()) return

        setLoading(id)

        const result = await updateLoanStatus(id, status, status === 'rejected' ? rejectionReason : undefined)

        if (result?.error) {
            setErrorAction({
                title: status === 'active' ? "Erreur d'Approbation" : "Erreur de Rejet",
                message: result.error
            })
            setLoading(null)
        } else {
            setConfirmAction(null)
            setRejectionReason('')
            // Optional: revalidate or reload is handled by server action revalidatePath, but window.location.reload() ensures fresh data if needed.
            // Many of our tables use reload for simplicity in this MVP.
            window.location.reload()
        }
    }

    const handlePrintWaiver = () => {
        window.print();
    }

    return (
        <div className="relative">
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden xl:block">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidat & Décharge</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Demande</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Offre</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Réception des Fonds</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Approuvé Par</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <p className="font-black text-white leading-tight italic">{row.user.split('(')[0]}</p>
                                            <p className="text-[10px] font-bold text-slate-500 tracking-tight lowercase mb-2">{row.user.split('(')[1]?.replace(')', '')}</p>

                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <button
                                                    onClick={() => setViewWaiver(row)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-[8px] font-black uppercase tracking-widest hover:text-white transition-all"
                                                >
                                                    👁️ Voir
                                                </button>
                                                {isClient && row.profile && (
                                                    <PDFDownloadLink
                                                        document={
                                                            <LoanPDFDocument
                                                                userData={{
                                                                    nom: row.profile?.nom || 'Client',
                                                                    prenom: row.profile?.prenom || ''
                                                                }}
                                                                loanData={{
                                                                    amount: row.amount,
                                                                    payoutNetwork: row.payout_network || 'MTN',
                                                                    dueDate: row.due_date || 'N/A'
                                                                }}
                                                                personalData={{
                                                                    address: row.borrower_address || row.profile?.address || '',
                                                                    city: row.borrower_city || row.profile?.city || '',
                                                                    profession: row.borrower_profession || row.profile?.profession || '',
                                                                    idDetails: row.borrower_id_details || 'En attente',
                                                                    birthDate: row.borrower_birth_date || row.profile?.birth_date || ''
                                                                }}
                                                                signature={row.waiver_signed_at ? `${row.profile?.prenom} ${row.profile?.nom}` : (row.status === 'active' || row.status === 'paid' ? `${row.profile?.prenom} ${row.profile?.nom}` : '')}
                                                                amountInWords={numberToFrench(row.amount + 500)}
                                                                repaymentNumber={repaymentPhones[row.payout_network as keyof typeof repaymentPhones] || repaymentPhones.MTN}
                                                            />
                                                        }
                                                        fileName={`Contrat_Creditly_${row.profile?.nom || 'Client'}_${row.id.substring(0, 8)}.pdf`}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                    >
                                                        {({ loading }) => (
                                                            <>
                                                                <Download size={10} />
                                                                {loading ? '...' : 'PDF'}
                                                            </>
                                                        )}
                                                    </PDFDownloadLink>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-black text-white text-lg tracking-tighter italic">{row.amount.toLocaleString()} <span className="text-[10px] not-italic text-slate-600 uppercase tracking-widest">FCFA</span></p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-500/20 italic">
                                        {row.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${row.payout_network === 'MTN' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                row.payout_network === 'Moov' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                }`}>
                                                {row.payout_network || 'N/A'}
                                            </span>
                                            <p className="text-xs font-black text-white italic">{row.payout_phone || 'Non renseigné'}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-[150px] italic">
                                            {row.payout_name || '-'}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-500 italic">
                                    {new Date(row.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 border-slate-800">
                                    {row.admin ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-300 group-hover:text-white transition-colors tracking-tight italic">{row.admin.name}</span>
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.1em]">{row.admin.role}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-600 italic font-black uppercase tracking-widest opacity-30">Non assigné</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {row.whatsapp ? (
                                        <a
                                            href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95"
                                        >
                                            <svg className="w-4 h-4 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">WhatsApp</span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-700 italic opacity-50">
                                            <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Non renseigné</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {['admin_loan', 'superadmin', 'owner'].includes(currentUserRole || '') && row.status === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => setConfirmAction({ id: row.id, status: 'active' })}
                                                    disabled={loading === row.id}
                                                    className="h-10 px-6 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                                >
                                                    Approuver
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ id: row.id, status: 'rejected' })}
                                                    disabled={loading === row.id}
                                                    className="h-10 px-6 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-transparent transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    Rejeter
                                                </button>
                                            </>
                                        ) : row.status === 'pending' ? (
                                            <span className="text-[10px] font-black uppercase tracking-widest italic text-slate-600 px-3 py-1 rounded-lg border border-slate-800 bg-slate-900/50">
                                                Lecture Seule
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-widest italic px-3 py-1 rounded-lg border ${row.status === 'active' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                row.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-slate-800 text-slate-500 border-slate-700'
                                                }`}>
                                                {row.status === 'active' ? 'Actif' :
                                                    row.status === 'rejected' ? 'Rejeté' :
                                                        row.status}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="space-y-4 xl:hidden">
                {rows.map((row) => (
                    <div key={row.id} className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-black text-white text-lg uppercase italic leading-tight tracking-tighter">{row.user.split('(')[0]}</p>
                                <p className="text-[10px] font-bold text-slate-500 lowercase leading-none mb-2">{row.user.split('(')[1]?.replace(')', '')}</p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => setViewWaiver(row)}
                                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                    >
                                        👁️ Voir
                                    </button>
                                    {isClient && row.profile && (
                                        <PDFDownloadLink
                                            document={
                                                <LoanPDFDocument
                                                    userData={{
                                                        nom: row.profile?.nom || 'Client',
                                                        prenom: row.profile?.prenom || ''
                                                    }}
                                                    loanData={{
                                                        amount: row.amount,
                                                        payoutNetwork: row.payout_network || 'MTN',
                                                        dueDate: row.due_date || 'N/A'
                                                    }}
                                                    personalData={{
                                                        address: row.borrower_address || row.profile?.address || '',
                                                        city: row.borrower_city || row.profile?.city || '',
                                                        profession: row.borrower_profession || row.profile?.profession || '',
                                                        idDetails: row.borrower_id_details || 'En attente',
                                                        birthDate: row.borrower_birth_date || row.profile?.birth_date || ''
                                                    }}
                                                    signature={row.waiver_signed_at ? `${row.profile?.prenom} ${row.profile?.nom}` : (row.status === 'active' || row.status === 'paid' ? `${row.profile?.prenom} ${row.profile?.nom}` : '')}
                                                    amountInWords={numberToFrench(row.amount + 500)}
                                                    repaymentNumber={repaymentPhones[row.payout_network as keyof typeof repaymentPhones] || repaymentPhones.MTN}
                                                />
                                            }
                                            fileName={`Contrat_Creditly_${row.profile?.nom || 'Client'}_${row.id.substring(0, 8)}.pdf`}
                                            className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm"
                                        >
                                            {({ loading }) => (
                                                <>
                                                    <Download size={14} />
                                                    {loading ? '...' : 'Télécharger PDF'}
                                                </>
                                            )}
                                        </PDFDownloadLink>
                                    )}
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest italic border border-blue-500/10">
                                {row.plan}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Montant demandé</p>
                                <p className="font-black text-white text-2xl tracking-tighter italic leading-none">{row.amount.toLocaleString()} <span className="text-[10px] not-italic text-slate-600 tracking-normal uppercase">FCFA</span></p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Réception ({row.payout_network})</p>
                                <p className="text-sm font-black text-white italic leading-none">{row.payout_phone}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight italic truncate">{row.payout_name}</p>
                            </div>
                            {/* Approved By Section for Mobile */}
                            <div className="col-span-2 space-y-2 pt-4 border-t border-white/5">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Approuvé par</p>
                                {row.admin ? (
                                    <div>
                                        <p className="text-sm font-black text-white italic leading-none">{row.admin.name}</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight italic">{row.admin.role}</p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold text-slate-700 italic uppercase">Non assigné</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-white/5">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic leading-none">Soumis le</p>
                                <p className="text-xs font-bold text-slate-400 italic">{new Date(row.date).toLocaleDateString()}</p>
                            </div>
                            {row.whatsapp && (
                                <a href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`} className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                </a>
                            )}
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-white/5">
                            {['admin_loan', 'superadmin', 'owner'].includes(currentUserRole || '') ? (
                                <>
                                    {row.status === 'pending' ? (
                                        <>
                                            <button onClick={() => setConfirmAction({ id: row.id, status: 'active' })} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20">
                                                Approuver
                                            </button>
                                            <button onClick={() => setConfirmAction({ id: row.id, status: 'rejected' })} className="w-16 h-16 bg-slate-800 text-red-500 rounded-2xl border border-white/5 flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic leading-none">{row.status === 'active' ? 'Prêt Actif' : row.status === 'rejected' ? 'Dossier Refusé' : row.status}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full py-4 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 italic leading-none">Lecture Seule</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => {
                    setConfirmAction(null)
                    setRejectionReason('')
                }}
                onConfirm={handleAction}
                title={confirmAction?.status === 'active' ? 'Approuver le prêt ?' : 'Refuser le prêt ?'}
                message={confirmAction?.status === 'active'
                    ? "Voulez-vous valider cette demande de prêt ? Cela le rendra actif immédiatement."
                    : "Veuillez indiquer le motif du refus :"}
                confirmText={confirmAction?.status === 'active' ? 'Approuver' : 'Refuser'}
                variant={confirmAction?.status === 'active' ? 'success' : 'danger'}
                isLoading={loading === confirmAction?.id}
            >
                {confirmAction?.status === 'rejected' && (
                    <div className="w-full mt-4">
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Motif du refus..."
                            className="w-full h-32 p-4 bg-black/40 border border-white/10 rounded-2xl text-white text-xs font-bold italic focus:border-red-500/50 outline-none transition-all placeholder:text-slate-700 resize-none"
                        />
                    </div>
                )}
            </ConfirmModal>

            {/* Error Feedback Modal */}
            <ConfirmModal
                isOpen={!!errorAction}
                onClose={() => setErrorAction(null)}
                onConfirm={() => setErrorAction(null)}
                title={errorAction?.title || "Action Impossible"}
                message={errorAction?.message || ""}
                confirmText="Fermer"
                cancelText="OK"
                variant="danger"
            />

            {/* Waiver Viewer Modal */}
            {/* Waiver Viewer Modal */}
            <ConfirmModal
                isOpen={!!viewWaiver}
                onClose={() => setViewWaiver(null)}
                onConfirm={() => setViewWaiver(null)}
                title="Détails de la Décharge (Reconnaissance de Dette)"
                message=""
                confirmText="Fermer"
                variant="info"
            >
                {viewWaiver && (
                    <div className="space-y-6">
                        <div id="admin-printable-waiver" className="w-full mt-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 text-left font-sans animate-fade-in max-h-[60vh] overflow-y-auto custom-scrollbar shadow-inner text-slate-700">
                            <div className="space-y-4">
                                <div className="pb-4 border-b border-slate-100">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] italic mb-4">Informations Signataire</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nom du Débiteur</p>
                                            <p className="text-sm font-bold text-slate-900 italic">{viewWaiver.user.split('(')[0]}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pièce d'identité</p>
                                            <p className="text-sm font-bold text-blue-600 italic">{viewWaiver.borrower_id_details || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Né(e) le</p>
                                            <p className="text-sm font-bold text-slate-600 italic">{viewWaiver.borrower_birth_date ? new Date(viewWaiver.borrower_birth_date).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ville</p>
                                            <p className="text-sm font-bold text-slate-600 italic">{viewWaiver.borrower_city || 'N/A'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Adresse de Résidence</p>
                                            <p className="text-sm font-bold text-slate-600 italic">{viewWaiver.borrower_address || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pb-4 border-b border-slate-100">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic mb-4">Termes Engagés</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Montant Principal</span>
                                            <span className="text-lg font-black text-slate-900 italic tracking-tighter">{viewWaiver.amount.toLocaleString()} FCFA</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 opacity-80">
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Frais de dossier</span>
                                            <span className="text-sm font-black text-blue-600 italic">500 FCFA</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Total à Rembourser</span>
                                            <span className="text-xl font-black text-slate-900 italic tracking-tighter">{(viewWaiver.amount + 500).toLocaleString()} FCFA</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-red-500/50 pl-2">
                                            "Tout versement supérieur à ce montant sera considéré comme une pénalité de traitement non-remboursable."
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none mb-1">Signature Numérique Validée</p>
                                            <p className="text-xs font-bold text-slate-900 italic">Signée le {viewWaiver.waiver_signed_at ? new Date(viewWaiver.waiver_signed_at).toLocaleString('fr-FR') : new Date(viewWaiver.date).toLocaleString('fr-FR')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
                            <button
                                onClick={handlePrintWaiver}
                                className="w-full py-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Printer size={18} />
                                Imprimer papier
                            </button>
                            {isClient && (
                                <PDFDownloadLink
                                    document={
                                        <LoanPDFDocument
                                            userData={{
                                                nom: viewWaiver.profile?.nom || 'Client',
                                                prenom: viewWaiver.profile?.prenom || ''
                                            }}
                                            loanData={{
                                                amount: viewWaiver.amount,
                                                payoutNetwork: viewWaiver.payout_network || 'MTN',
                                                dueDate: viewWaiver.due_date || 'N/A'
                                            }}
                                            personalData={{
                                                address: viewWaiver.borrower_address || viewWaiver.profile?.address || '',
                                                city: viewWaiver.borrower_city || viewWaiver.profile?.city || '',
                                                profession: viewWaiver.borrower_profession || viewWaiver.profile?.profession || '',
                                                idDetails: viewWaiver.borrower_id_details || 'En attente',
                                                birthDate: viewWaiver.borrower_birth_date || viewWaiver.profile?.birth_date || ''
                                            }}
                                            signature={viewWaiver.waiver_signed_at ? `${viewWaiver.profile?.prenom} ${viewWaiver.profile?.nom}` : (viewWaiver.status === 'active' || viewWaiver.status === 'paid' ? `${viewWaiver.profile?.prenom} ${viewWaiver.profile?.nom}` : '')}
                                            amountInWords={numberToFrench(viewWaiver.amount + 500)}
                                            repaymentNumber={repaymentPhones[viewWaiver.payout_network as keyof typeof repaymentPhones] || repaymentPhones.MTN}
                                        />
                                    }
                                    fileName={`Contrat_Creditly_${viewWaiver.profile?.nom || 'Client'}_Archivage.pdf`}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-blue-500/20 text-center"
                                >
                                    {({ loading: pdfLoading }) => (
                                        <>
                                            <Download size={18} />
                                            {pdfLoading ? 'Génération...' : 'Télécharger PDF Pro'}
                                        </>
                                    )}
                                </PDFDownloadLink>
                            )}
                        </div>
                    </div>
                )}
            </ConfirmModal>

            {/* Hidden Printable Version for Admin */}
            {viewWaiver && (
                <div className="print-only-container text-black bg-white p-12 font-serif" id="admin-printable-waiver">
                    <div className="max-w-[800px] mx-auto">
                        <div className="text-center mb-10 border-b-2 border-black pb-6">
                            <h1 className="text-3xl font-black uppercase mb-1 tracking-tighter">Creditly</h1>
                            <p className="text-[10px] tracking-widest uppercase font-bold text-gray-600">Document d'Archivage Officiel (Généré Numériquement)</p>
                            <div className="mt-6 text-xl font-bold border-y-2 border-black py-4">RECONNAISSANCE DE DETTE & DÉCHARGE DE RESPONSABILITÉ</div>
                        </div>

                        <div className="space-y-8 text-sm leading-relaxed text-black">
                            <p className="text-lg">Je soussigné(e), <strong className="border-b border-black px-2">{viewWaiver.user.split('(')[0]}</strong>,</p>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-2 border-black p-6 bg-gray-50/50">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Date de Naissance</p>
                                    <p className="font-bold">{viewWaiver.borrower_birth_date ? new Date(viewWaiver.borrower_birth_date).toLocaleDateString('fr-FR') : '________________'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Pièce d'Identité / ID</p>
                                    <p className="font-bold">{viewWaiver.borrower_id_details || '________________'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Adresse de Résidence & Ville</p>
                                    <p className="font-bold">{viewWaiver.borrower_address || '________________'} - {viewWaiver.borrower_city || '________________'}</p>
                                </div>
                            </div>

                            <p className="text-base text-justify">
                                Reconnais sans réserve avoir reçu de la part de l'organisation <strong>Creditly</strong>, un prêt sans intérêt d'un montant de <strong className="border-b border-black">{viewWaiver.amount.toLocaleString()} FCFA</strong>, majoré de frais de dossier fixes de <strong className="border-b border-black">500 FCFA</strong>, soit un montant total de :
                            </p>

                            <div className="text-center p-8 bg-gray-100 border-4 border-double border-black font-black text-3xl italic tracking-tighter">
                                {(viewWaiver.amount + 500).toLocaleString()} FCFA
                            </div>

                            <div className="space-y-4 text-justify italic bg-gray-50 p-6 border-l-4 border-black">
                                <p>
                                    "Le bénéficiaire s'engage par la présente au remboursement intégral de ladite somme selon l'échéance convenue lors de la demande."
                                </p>
                                <p>
                                    "Tout versement supérieur au montant total dû est considéré comme une pénalité de traitement et ne pourra donner lieu à aucun remboursement ou compensation."
                                </p>
                                <p>
                                    "Cette reconnaissance de dette est générée suite à une signature électronique sécurisée et validée sur la plateforme Creditly. Elle fait foi de l'engagement contractuel du débiteur envers le créancier."
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 mt-20 pb-12">
                                <div className="border-t-2 border-black pt-4">
                                    <p className="font-black underline mb-12 uppercase text-[10px] tracking-widest">Le Débiteur (Signature)</p>
                                    <div className="space-y-1">
                                        <p className="italic font-serif text-lg text-blue-900">Signé Électroniquement</p>
                                        <p className="text-[10px] text-gray-500 font-mono">HASH-ID: {viewWaiver.id.substring(0, 13).toUpperCase()}</p>
                                        <p className="text-[10px] text-gray-500 mt-2">Fait le : {viewWaiver.waiver_signed_at ? new Date(viewWaiver.waiver_signed_at).toLocaleString('fr-FR') : new Date(viewWaiver.date).toLocaleString('fr-FR')}</p>
                                    </div>
                                </div>
                                <div className="border-t-2 border-black pt-4">
                                    <p className="font-black underline mb-12 uppercase text-[10px] tracking-widest">Le Créancier (Sceau Creditly)</p>
                                    <div className="relative h-16 flex items-center justify-center border-2 border-blue-900 rounded-full w-40 transform -rotate-12 opacity-80">
                                        <div className="text-center">
                                            <p className="text-[8px] font-black text-blue-900 uppercase leading-none">DOCUMENT</p>
                                            <p className="text-sm font-black text-blue-900 uppercase">CERTIFIÉ</p>
                                            <p className="text-[8px] font-black text-blue-900 uppercase leading-none">OFFICIEL</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 text-center text-[8px] text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-4">
                                Document généré par le système Creditly v2.0 - Toute falsification est passible de poursuites.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    /* Hide EVERYTHING on the page */
                    body > *:not(.print-only-container) {
                        display: none !important;
                    }
                    
                    /* Show ONLY the printable container and force it to the top */
                    .print-only-container {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        z-index: 9999999 !important;
                    }

                    /* Force text visibility and black color for all children */
                    .print-only-container * {
                        color: black !important;
                        background-color: transparent !important;
                        border-color: black !important;
                        text-shadow: none !important;
                        box-shadow: none !important;
                    }

                    /* Specific layout fixes for print */
                    .grid { display: grid !important; }
                    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    
                    /* Reset body styles */
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                
                /* Hide printable container by default in browser */
                .print-only-container {
                    display: none;
                }
            `}</style>
            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; size: auto; }
                    html, body { 
                        background-color: white !important; 
                        color: black !important;
                        filter: none !important;
                    }
                    /* Désactiver l'apparence sombre du système pour l'impression */
                    * { 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    /* Cache tout sauf le contrat que nous voulons imprimer */
                    body { visibility: hidden !important; background: white !important; }
                    
                    #admin-printable-waiver {
                        visibility: visible !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        display: block !important;
                        border: none !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                    }
                    #admin-printable-waiver * {
                        visibility: visible !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    )
}
