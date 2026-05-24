import { createClient } from './supabase/server'

export type AuditAction =
    | 'KYC_VALIDATION' | 'KYC_REJECTION'
    | 'LOAN_APPROVAL' | 'LOAN_REJECTION'
    | 'REPAYMENT_VALIDATION' | 'REPAYMENT_REJECTION'
    | 'EXTENSION_GRANTED'
    | 'ROLE_UPDATE' | 'ACCOUNT_SUSPENSION'
    | 'TRANSACTION_CANCEL'

/**
 * Journalise une action sensible dans les Audit Logs
 */
export async function logAuditAction({
    actorId,
    actorRole,
    action,
    targetTable,
    targetId,
    oldValue = {},
    newValue = {}
}: {
    actorId: string | null
    actorRole: string
    action: AuditAction
    targetTable: string
    targetId: string
    oldValue?: any
    newValue?: any
}) {
    const supabase = await createClient()

    const { error } = await supabase.from('audit_logs').insert({
        actor_user_id: actorId,
        actor_role: actorRole,
        action_type: action,
        target_table: targetTable,
        target_id: targetId,
        old_value_json: oldValue,
        new_value_json: newValue
    })

    if (error) {
        console.error("CRITICAL: Failed to log audit action", error)
    }
}
