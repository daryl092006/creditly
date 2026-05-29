
import { createAdminClient } from '../utils/supabase/server';

async function migrate() {
    console.log('--- STARTING FRAUD & FINANCE MIGRATION ---');

    const supabase = await createAdminClient();

    const sql = `
    -- 1. Table des Alertes Fraude
    CREATE TABLE IF NOT EXISTS fraud_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        loan_id UUID REFERENCES public.prets(id) ON DELETE SET NULL,
        repayment_id UUID, -- ID de la soumission de remboursement (optionnel)
        alert_type VARCHAR(100), 
        severity VARCHAR(20) DEFAULT 'HIGH',
        reason TEXT,
        reference_used VARCHAR(100),
        evidence_json JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending', 
        internal_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID REFERENCES public.users(id)
    );

    -- Index pour la performance
    CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);

    -- 2. Enrichissement comptable des Prêts
    ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS total_penalties_paid DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS realized_profit DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS principal_paid DECIMAL(15,2) DEFAULT 0;

    -- 3. Correction type fraud_suspicion_level (si nécessaire)
    -- Actuellement c'est INTEGER dans la migration précédente, on va s'adapter ou le caster
    `;

    try {
        const { error } = await supabase.rpc('run_sql', { sql: sql });
        if (error) {
            console.error('Migration error:', error);
        } else {
            console.log('Migration successful.');
        }
    } catch (e) {
        console.error('Exception during migration:', e);
    }
}

migrate();
