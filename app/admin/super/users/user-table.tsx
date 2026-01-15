'use client'

import { updateUserRole, deleteUserAccount } from './actions'
import { useState } from 'react'
import { TrashCan, UserAdmin, User, Switcher, WatsonHealthStatusResolved } from '@carbon/icons-react'
import { ActionButton } from '@/app/components/ui/ActionButton'

export default function UserManagementTable({ rows }: { rows: Array<{ id: string; name: string; email: string; is_active: boolean; role: string; whatsapp?: string }> }) {
    const [loading, setLoading] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const handleRoleChange = async (userId: string, newRole: string) => {
        setLoading(userId)
        try {
            await updateUserRole(userId, newRole as any)
        } catch (error) {
            alert('Erreur: ' + (error as Error).message)
        } finally {
            setLoading(null)
        }
    }

    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${email} ? Cette action est irréversible et l'email sera mis sur liste noire.`)) {
            return
        }

        setDeleting(userId)
        try {
            await deleteUserAccount(userId, email)
        } catch (error) {
            alert('Erreur lors de la suppression: ' + (error as Error).message)
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="relative">
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-white/5">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Identité & Statut</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Email</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Contact</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Rôle Système</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800/10 text-slate-600 border border-white/5'}`}>
                                            <User size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-white italic tracking-tight">{row.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${row.is_active ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                    {row.is_active ? 'Compte Actif' : 'En attente'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-sm font-bold text-slate-400 italic">
                                    {row.email}
                                </td>
                                <td className="px-8 py-6">
                                    {row.whatsapp && (
                                        <a
                                            href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 group/wa active:scale-95"
                                        >
                                            <svg className="w-3.5 h-3.5 transition-transform group-hover/wa:rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                                        </a>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="relative inline-block">
                                        <select
                                            defaultValue={row.role}
                                            disabled={loading === row.id || deleting === row.id}
                                            onChange={(e) => handleRoleChange(row.id, e.target.value)}
                                            className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer pr-10 hover:bg-slate-800"
                                        >
                                            <option value="client">Client</option>
                                            <option value="admin_kyc">Admin KYC</option>
                                            <option value="admin_loan">Admin Prêt</option>
                                            <option value="admin_repayment">Admin Remboursement</option>
                                            <option value="superadmin">Superadmin</option>
                                        </select>
                                        <Switcher size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                                        {loading === row.id && (
                                            <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button
                                        onClick={() => handleDelete(row.id, row.email)}
                                        disabled={deleting === row.id || loading === row.id}
                                        className={`p-3 rounded-xl transition-all ${deleting === row.id ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-900 text-slate-600 hover:bg-red-500/10 hover:text-red-500 border border-white/5 hover:border-red-500/20'}`}
                                        title="Supprimer définitivement (Blacklist)"
                                    >
                                        <TrashCan size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="space-y-4 md:hidden">
                {rows.map((row) => (
                    <div key={row.id} className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800/10 text-slate-600 border border-white/5'}`}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="font-black text-white italic tracking-tight">{row.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${row.is_active ? 'text-emerald-500' : 'text-slate-600'}`}>
                                            {row.is_active ? 'Compte Actif' : 'En attente'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(row.id, row.email)}
                                className="w-10 h-10 bg-slate-800 text-red-500 rounded-xl border border-white/5 flex items-center justify-center"
                            >
                                <TrashCan size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Email de contact</p>
                                <p className="text-sm font-bold text-slate-300 italic">{row.email}</p>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Privilèges</p>
                                    <div className="relative">
                                        <select
                                            defaultValue={row.role}
                                            onChange={(e) => handleRoleChange(row.id, e.target.value)}
                                            className="bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none pr-10"
                                        >
                                            <option value="client">Client</option>
                                            <option value="admin_kyc">Admin KYC</option>
                                            <option value="admin_loan">Admin Prêt</option>
                                            <option value="admin_repayment">Admin Remboursement</option>
                                            <option value="superadmin">Superadmin</option>
                                        </select>
                                        <Switcher size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                                {row.whatsapp && (
                                    <a href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`} className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
