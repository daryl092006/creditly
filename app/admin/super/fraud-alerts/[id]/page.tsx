
import { createAdminClient } from '@/utils/supabase/server'
import { requireAdminRole } from '@/utils/admin-security'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
    Warning,
    ChevronLeft,
    User,
    RequestQuote,
    Calendar,
    CloudAlerting as CloudAlert,
    WatsonHealthStatusResolved as WatsonHealthStatusResolving,
    Rule,
    Identification,
    WarningAlt,
    Rocket
} from '@carbon/icons-react'
import { calculateLoanDebt } from '@/utils/loan-utils'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit-logger'

export default async function FraudAlertDetailPage({
    params
}: {
    params: { id: string }
}) {
    await requireAdminRole(['superadmin', 'owner'])
    const { id } = await params
    const supabase = await createAdminClient()

    // 1. Fetch Log Detail
    const { data: log, error: logError } = await supabase
        .from('audit_logs')
        .select('*, actor:actor_user_id(*)')
        .eq('id', id)
        .single()

    if (logError || !log) return notFound()

    const userId = log.actor_user_id
    const evidence = log.new_value_json
    const attemptedLoanId = evidence.attempted_loan_id

    // 2. Fetch User Summary & Attempted Loan
    const [
        { data: userProfile },
        { data: attemptedLoan },
        { data: originalLoan },
        { data: originalTx }
    ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('prets').select('*').eq('id', attemptedLoanId).maybeSingle(),
        evidence.original_loan_id
            ? supabase.from('prets').select('*, user:user_id(id, nom, prenom, email)').eq('id', evidence.original_loan_id).single()
            : Promise.resolve({ data: null }),
        evidence.operator && evidence.transaction_reference
            ? supabase.from('payment_transactions').select('*, user:user_id(id, nom, prenom, email)').eq('operator', evidence.operator).eq('transaction_reference', evidence.transaction_reference).maybeSingle()
            : Promise.resolve({ data: null })
    ])

    const originalOwner = originalLoan?.user || originalTx?.user
    const isHighSuspicion = userProfile?.fraud_suspicion_level >= 1 || userProfile?.is_under_review

    async function handleBlockAction(formData: FormData) {
        'use server'
        const decision = formData.get('decision') as string
        const note = formData.get('note') as string
        const adminSupabase = await createAdminClient()

        if (decision === 'confirm_fraud') {
            await adminSupabase.from('users').update({
                fraud_suspicion_level: 2,
                is_under_review: true,
                is_account_active: false // Block account
            }).eq('id', userId)
        } else if (decision === 'dismiss') {
            await adminSupabase.from('users').update({
                fraud_suspicion_level: 0,
                is_under_review: false,
                is_account_active: true
            }).eq('id', userId)
        }

        // Add to audit_logs
        const { user: admin, role: adminRole } = await requireAdminRole(['superadmin', 'owner'])
        await logAuditAction({
            actorId: admin.id,
            actorRole: adminRole,
            action: decision === 'confirm_fraud' ? 'ACCOUNT_SUSPENSION' : 'ROLE_UPDATE', // Reusing existing types or I could add new ones
            targetTable: 'users',
            targetId: userId,
            oldValue: { status: isHighSuspicion ? 'suspicious' : 'active' },
            newValue: { decision, note, original_log_id: id }
        })

        revalidatePath(`/admin/super/fraud-alerts/${id}`)
        revalidatePath('/admin/super')
    }

    return (
        <div className="py-10 md:py-16 animate-fade-in min-h-screen">
            <div className="admin-container">
                <Link
                    href="/admin/super/fraud-alerts"
                    className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 hover:text-white transition-colors"
                >
                    <ChevronLeft size={16} />
                    Retour aux alertes
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* LE DÉLIT */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="glass-panel p-8 bg-slate-900 border-red-500/30 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
                                    <CloudAlert size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Incident #{id.substring(0, 8)}</h2>
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] italic">
                                        Type : {log.action_type?.replace(/_/g, ' ')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                        <Rule size={16} />
                                        Raison de l'alerte
                                    </h3>
                                    <div className="p-5 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                                        <p className="text-sm font-bold text-slate-300 leading-relaxed italic">
                                            {log.action_type === 'FRAUD_DUPLICATE_PROOF_HASH'
                                                ? "L'image de preuve (reçu) soumise par l'utilisateur a un hachage cryptographique identique à une autre preuve déjà existante dans le système."
                                                : "La référence de transaction MoMo saisie a déjà été enregistrée pour un autre paiement ou par un autre utilisateur."
                                            }
                                        </p>
                                        <div className="pt-3 border-t border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase italic mb-1">Élément suspect</p>
                                            <p className="text-xs font-mono text-red-400 break-all bg-red-400/5 p-2 rounded-lg">
                                                {evidence.transaction_reference || evidence.proof_hash}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                        <Identification size={16} />
                                        Preuve de collision
                                    </h3>
                                    <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4">
                                        {originalOwner ? (
                                            <>
                                                <p className="text-[10px] font-black text-red-500 uppercase italic">Conflit avec </p>
                                                <div>
                                                    <p className="text-lg font-black text-white italic uppercase tracking-tight leading-none">{originalOwner.prenom} {originalOwner.nom}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-1 italic">{originalOwner.email}</p>
                                                </div>
                                                <div className="pt-3 border-t border-red-500/10 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-500 uppercase italic">Opération Originale</p>
                                                        <p className="text-[10px] font-extrabold text-slate-300 italic">Prêt #{evidence.original_loan_id?.substring(0, 8) || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-500 uppercase italic">Statut</p>
                                                        <p className="text-[10px] font-extrabold text-emerald-500 italic uppercase">Validé</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-500 italic">Analyse en cours : Les données de collision ne sont plus disponibles ou ont été archivées.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* CONTEXTE UTILISATEUR ET PRÊT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <section className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-4">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                    <User size={16} />
                                    Utilisateur suspect
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg font-black text-white italic uppercase">
                                            {userProfile?.prenom?.[0]}{userProfile?.nom?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase italic">{userProfile?.prenom} {userProfile?.nom}</p>
                                            <p className="text-[10px] text-slate-500 font-bold italic lowercase">{userProfile?.email}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase italic mb-1">Score Actuel</p>
                                            <p className={`text-xl font-black italic ${userProfile?.current_score < 40 ? 'text-red-500' : 'text-slate-300'}`}>{userProfile?.current_score || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-600 uppercase italic mb-1">Classe Risque</p>
                                            <p className="text-xs font-black text-slate-400 uppercase italic">{userProfile?.risk_class || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/admin/super/users/${userId}`}
                                        className="block text-center py-2 rounded-xl bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5 italic"
                                    >
                                        Voir Profil Complet
                                    </Link>
                                </div>
                            </section>

                            <section className="glass-panel p-6 bg-slate-900 border-slate-800 space-y-4">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                    <RequestQuote size={16} />
                                    Prêt en cours de paiement
                                </h3>
                                {attemptedLoan ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-2xl font-black text-white italic tabular-nums">{Number(attemptedLoan.amount).toLocaleString('fr-FR')} <span className="text-[10px] not-italic text-slate-600 uppercase">FCFA</span></p>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase italic ${attemptedLoan.status === 'overdue' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                                                }`}>
                                                {attemptedLoan.status === 'overdue' ? 'En Retard' : attemptedLoan.status}
                                            </span>
                                        </div>
                                        <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{ width: `${(attemptedLoan.amount_paid / attemptedLoan.amount) * 100}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-600 uppercase italic">Déjà payé</p>
                                                <p className="text-xs font-bold text-slate-300 italic">{attemptedLoan.amount_paid.toLocaleString('fr-FR')} F</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-600 uppercase italic">Reste dû</p>
                                                <p className="text-xs font-bold text-red-500 italic">{(attemptedLoan.amount - attemptedLoan.amount_paid).toLocaleString('fr-FR')} F</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/admin/loans?q=${attemptedLoanId}`}
                                            className="block text-center py-2 rounded-xl bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5 italic"
                                        >
                                            Voir le Prêt
                                        </Link>
                                    </div>
                                ) : (
                                    <p className="text-sm font-bold text-slate-600 italic">Détails du prêt non disponibles.</p>
                                )}
                            </section>
                        </div>
                    </div>

                    {/* ACTIONS MODÉRATEUR */}
                    <div className="space-y-8">
                        <section className="glass-panel p-6 bg-slate-950 border-slate-800 shadow-2xl">
                            <h3 className="text-sm font-black text-white tracking-tighter uppercase italic flex items-center gap-3 mb-6">
                                <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center text-xs font-black italic shadow-inner">!</span>
                                Décision Admin
                            </h3>

                            <form action={handleBlockAction} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Conclusion de l'enquête</label>
                                    <select
                                        name="decision"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-red-500/40 transition-all uppercase italic"
                                        defaultValue="confirm_fraud"
                                    >
                                        <option value="confirm_fraud">Fraude Confirmée (Bloquer)</option>
                                        <option value="investigate">Maintenir Investigation</option>
                                        <option value="dismiss">Erreur système (Débloquer)</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Note interne explicative</label>
                                    <textarea
                                        name="note"
                                        required
                                        placeholder="Pourquoi prenez-vous cette décision ?"
                                        className="w-full h-32 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-slate-300 focus:outline-none focus:border-red-500/40 transition-all italic resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] italic shadow-lg shadow-red-600/20 hover:bg-red-500 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <WatsonHealthStatusResolving size={20} />
                                    Appliquer la décision
                                </button>
                            </form>
                        </section>

                        <div className="glass-panel p-6 bg-slate-900/50 border-slate-800 space-y-4 font-bold italic">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4 flex items-center gap-2">
                                <Rocket size={16} />
                                Intelligence Anti-Fraude
                            </p>
                            <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                                En cas de confirmation, le client perd son accès au crédit et ses dossiers en cours sont marqués pour audit approfondi.
                            </p>
                            <div className="pt-4 border-t border-white/5 flex items-center gap-3 cursor-help group/info">
                                <WarningAlt size={16} className="text-amber-500" />
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Action irréversible</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
