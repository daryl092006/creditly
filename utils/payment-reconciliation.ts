/**
 * SERVICE DE RÉCONCILIATION ET ANTI-FRAUDE DES PAIEMENTS — CREDITLY FINANCE
 *
 * Ce service sécurise toutes les soumissions de preuves de paiement.
 * Il protège la plateforme contre :
 *   - La réutilisation d'un même reçu (hash SHA-256 unique)
 *   - La soumission de la même référence de transaction MoMo
 *   - Le blanchiment via plusieurs comptes
 *
 * Fichier: utils/payment-reconciliation.ts
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// =========================================================
// TYPES
// =========================================================

export interface PaymentProofPayload {
    userId: string;
    loanId: string;
    declaredAmount: number;
    operator: string;               // 'MTN' | 'MOOV' | 'CELTIIS'
    transactionReference: string;   // Référence unique MoMo (ex: TXN20240520123456)
    proofFileBuffer: Buffer | ArrayBuffer;
    senderPhone: string;
    isExtension?: boolean;
}

export interface ReconciliationResult {
    success: boolean;
    proofHash: string;
    requiresDoubleValidation: boolean;
    transactionId?: string;
    error?: string;
    fraudDetected?: boolean;
}

// =========================================================
// CALCUL DU HASH CRYPTOGRAPHIQUE
// =========================================================

export function computeProofHash(fileBuffer: Buffer | ArrayBuffer): string {
    const buffer = fileBuffer instanceof ArrayBuffer
        ? Buffer.from(fileBuffer)
        : fileBuffer;
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// =========================================================
// VÉRIFICATION SI LES TABLES ANTI-FRAUDE EXISTENT
// =========================================================

/**
 * Vérifie si les tables de réconciliation existent dans la base.
 * Retourne false si la migration n'a pas encore été appliquée.
 */
async function checkTablesExist(supabase: ReturnType<typeof createClient>): Promise<boolean> {
    try {
        const { error } = await (supabase.from('payment_transactions') as any)
            .select('id')
            .limit(1);
        // PostgreSQL error code 42P01 = table not found
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// =========================================================
// SERVICE PRINCIPAL DE RÉCONCILIATION
// =========================================================

/**
 * Traite une soumission de preuve de remboursement de façon sécurisée.
 * Effectue les contrôles anti-fraude et enregistre la transaction.
 * Si les tables n'existent pas encore (migration non appliquée),
 * retourne success:true avec les infos de base pour ne pas bloquer les remboursements.
 */
export async function processPaymentProof(
    payload: PaymentProofPayload,
    supabaseClient?: ReturnType<typeof createClient>
): Promise<ReconciliationResult> {
    const supabase = supabaseClient ?? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ---- 1. Hachage cryptographique du fichier ----
    const proofHash = computeProofHash(payload.proofFileBuffer);

    // ---- 0. Vérifier si les tables anti-fraude existent ----
    const tablesReady = await checkTablesExist(supabase);
    if (!tablesReady) {
        // Migration non appliquée : bypass gracieux, on laisse passer le remboursement
        console.warn('[Anti-Fraude] Tables de réconciliation non trouvées. Appliquez la migration SQL. Remboursement autorisé sans contrôle anti-doublon.');
        return {
            success: true,
            proofHash,
            requiresDoubleValidation: payload.declaredAmount >= 50000,
        };
    }

    // ---- 2. CONTRÔLE ANTI-DOUBLON : Hash de fichier ----
    // Vérifier si cette MÊME image a déjà été soumise sur la plateforme
    try {
        const { data: duplicateByHash } = await (supabase
            .from('remboursements') as any)
            .select('id, user_id, loan_id')
            .eq('proof_hash', proofHash)
            .maybeSingle();

        if (duplicateByHash) {
            // Fraude détectée : même fichier utilisé sur un autre compte ou prêt
            try {
                await (supabase.from('users') as any).update({
                    fraud_suspicion_level: 'HIGH',
                    is_under_review: true
                }).eq('id', payload.userId);

                await (supabase.from('audit_logs') as any).insert({
                    actor_user_id: payload.userId,
                    action_type: 'FRAUD_DUPLICATE_PROOF_HASH',
                    target_table: 'remboursements',
                    target_id: duplicateByHash.id,
                    new_value_json: {
                        attempted_loan_id: payload.loanId,
                        proof_hash: proofHash,
                        original_loan_id: duplicateByHash.loan_id
                    }
                });

                // NOURRIR LA TABLE fraud_alerts
                await (supabase.from('fraud_alerts') as any).insert({
                    user_id: payload.userId,
                    loan_id: payload.loanId,
                    repayment_id: null,
                    alert_type: 'DUPLICATE_PROOF_HASH',
                    severity: 'HIGH',
                    reason: `Tentative de soumission d'une preuve de paiement déjà utilisée sur une autre opération (Prêt ID: ${duplicateByHash.loan_id}).`,
                    reference_used: proofHash.substring(0, 16),
                    evidence_json: {
                        attempted_loan_id: payload.loanId,
                        proof_hash: proofHash,
                        original_loan_id: duplicateByHash.loan_id,
                        original_user_id: duplicateByHash.user_id
                    }
                });
            } catch (_) { /* Colonnes non migrées, on log seulement */ }

            return {
                success: false,
                proofHash,
                requiresDoubleValidation: false,
                fraudDetected: true,
                error: 'SÉCURITÉ : Ce fichier de preuve est déjà indexé sur la plateforme. Votre compte est sous surveillance. En cas d\'erreur, contactez le support via WhatsApp.'
            };
        }
    } catch (e: any) {
        // Si la colonne proof_hash n'existe pas encore, on ignore et on continue
        if (e?.code !== '42703') throw e; // 42703 = column not found
    }

    // ---- 3. CONTRÔLE ANTI-DOUBLON : Référence transaction MoMo ----
    const cleanRef = payload.transactionReference.replace(/\s+/g, '').toUpperCase();

    if (cleanRef && cleanRef.length >= 4) {
        try {
            const { data: duplicateByRef } = await (supabase
                .from('payment_transactions') as any)
                .select('id, user_id, expected_amount')
                .eq('operator', payload.operator.toUpperCase())
                .eq('transaction_reference', cleanRef)
                .maybeSingle();

            if (duplicateByRef) {
                // Cas 1 : Même utilisateur (Doublon ou Retry légitime)
                if (duplicateByRef.user_id === payload.userId) {
                    return {
                        success: false,
                        proofHash,
                        requiresDoubleValidation: false,
                        error: 'Cette référence de transaction a déjà été enregistrée pour votre compte. Si vous venez de soumettre ce paiement, veuillez patienter pendant que nous le vérifions.'
                    };
                }

                // Cas 2 : Utilisateur différent (Suspicion de FRAUDE)
                try {
                    await (supabase.from('users') as any).update({
                        fraud_suspicion_level: 2,
                        is_under_review: true
                    }).eq('id', payload.userId);

                    await (supabase.from('audit_logs') as any).insert({
                        actor_user_id: payload.userId,
                        action_type: 'FRAUD_DUPLICATE_TRANSACTION_REF',
                        target_table: 'payment_transactions',
                        target_id: duplicateByRef.id,
                        new_value_json: {
                            attempted_loan_id: payload.loanId,
                            operator: payload.operator,
                            transaction_reference: cleanRef
                        }
                    });

                    // NOURRIR LA TABLE fraud_alerts
                    await (supabase.from('fraud_alerts') as any).insert({
                        user_id: payload.userId,
                        loan_id: payload.loanId,
                        alert_type: 'DUPLICATE_TRANSACTION_REF',
                        severity: 'CRITICAL',
                        reason: `Référence MoMo ${cleanRef} déjà enregistrée par un autre utilisateur (ID: ${duplicateByRef.user_id}).`,
                        reference_used: cleanRef,
                        evidence_json: {
                            attempted_loan_id: payload.loanId,
                            operator: payload.operator,
                            transaction_reference: cleanRef,
                            original_user_id: duplicateByRef.user_id,
                            original_amount: duplicateByRef.expected_amount
                        }
                    });
                } catch (_) { /* Continue */ }

                return {
                    success: false,
                    proofHash,
                    requiresDoubleValidation: false,
                    fraudDetected: true,
                    error: 'SÉCURITÉ : Cette référence de transaction est déjà enregistrée sur un autre compte. Votre compte est sous surveillance. Contactez le support WhatsApp pour investigation.'
                };
            }
        } catch (_) {
            // Table payment_transactions inaccessible : on continue sans ce contrôle
        }
    }

    // ---- 4. RÈGLE : Double validation si montant >= 50 000 FCFA ----
    const requiresDoubleValidation = payload.declaredAmount >= 50000;

    // ---- 5. Enregistrement de la transaction dans payment_transactions ----
    const txPayload: any = {
        user_id: payload.userId,
        transaction_reference: cleanRef || `MANUAL_${Date.now()}`,
        operator: payload.operator.toUpperCase(),
        transaction_type: payload.isExtension ? 'EXTENSION' : 'REPAYMENT',
        expected_amount: payload.declaredAmount,
        declared_amount: payload.declaredAmount,
        sender_phone: payload.senderPhone || '',
        receiver_phone: 'CREDITLY_MERCHANT',
        proof_url: `repayment-proofs/${payload.userId}/${payload.loanId}_${Date.now()}`,
        proof_hash: proofHash,
        status: 'PENDING'
    };

    try {
        const { data: transaction, error: txError } = await (supabase
            .from('payment_transactions') as any)
            .insert(txPayload)
            .select()
            .single();

        if (txError) {
            // Si erreur de contrainte UNIQUE (edge case de course condition)
            if (txError.code === '23505') {
                return {
                    success: false,
                    proofHash,
                    requiresDoubleValidation: false,
                    fraudDetected: true,
                    error: 'Cette référence de transaction a déjà été enregistrée. Veuillez vérifier votre reçu.'
                };
            }
            // Autre erreur DB : on laisse passer sans bloquer le remboursement
            console.error('[Anti-Fraude] Erreur insertion payment_transactions (non-bloquant):', txError.message);
        }

        return {
            success: true,
            proofHash,
            requiresDoubleValidation,
            transactionId: transaction?.id
        };
    } catch (_) {
        // Table inaccessible : on retourne success sans transactionId
        return {
            success: true,
            proofHash,
            requiresDoubleValidation,
        };
    }
}

// =========================================================
// UTILITAIRE : Lire un File en Buffer côté serveur (Next.js)
// =========================================================

export async function fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
