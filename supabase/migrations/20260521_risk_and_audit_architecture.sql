-- MIGRATION : CREDITLY RISK & CONTROL ARCHITECTURE --

-- 1. TABLES DE RISQUE ET SCORE --
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    score_total DECIMAL(5,2) DEFAULT 0,
    score_kyc INTEGER DEFAULT 0,
    score_repayment INTEGER DEFAULT 0,
    score_seniority INTEGER DEFAULT 0,
    score_loyalty INTEGER DEFAULT 0,
    score_subscription INTEGER DEFAULT 0,
    score_data_consistency INTEGER DEFAULT 0,
    penalty_late_payment INTEGER DEFAULT 0,
    penalty_extension INTEGER DEFAULT 0,
    penalty_incident INTEGER DEFAULT 0,
    penalty_fraud_suspicion INTEGER DEFAULT 0,
    risk_class VARCHAR(50) DEFAULT 'Standard',
    explanation_json JSONB DEFAULT '{}',
    calculated_at TIMESTAMPTZ DEFAULT now(),
    calculated_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS risk_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    loan_id UUID,
    decision_type VARCHAR(50), -- 'LOAN_LIMIT', 'LOAN_APPROVAL', 'EXTENSION_BLOCK'
    decision_result VARCHAR(50), -- 'ALLOWED', 'LIMITED', 'BLOCKED'
    reason TEXT,
    score_at_decision DECIMAL(5,2),
    debt_ratio DECIMAL(5,2),
    default_risk DECIMAL(5,2),
    liquidity_exposure DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TRACABILITÉ ET AUDIT --
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.users(id),
    actor_role VARCHAR(100),
    action_type VARCHAR(100),
    target_table VARCHAR(100),
    target_id UUID,
    old_value_json JSONB DEFAULT '{}',
    new_value_json JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. GESTION DES PREUVES ET PAIEMENTS --
-- Note: On utilise un hash pour empêcher l'upload du même fichier de preuve
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS operator VARCHAR(50);
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS proof_hash TEXT;
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS is_duplicate_suspected BOOLEAN DEFAULT FALSE;
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS first_validated_by UUID REFERENCES public.users(id);
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS second_validated_by UUID REFERENCES public.users(id);
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS requires_double_validation BOOLEAN DEFAULT FALSE;
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS operator VARCHAR(50);
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS proof_hash TEXT;

-- Contrainte d'unicité sur les références de transaction par opérateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_repayment_ref ON public.remboursements (operator, transaction_reference) WHERE transaction_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_sub_ref ON public.user_subscriptions (operator, transaction_reference) WHERE transaction_reference IS NOT NULL;

-- 4. PERFORMANCE AGENTS --
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    total_validations INTEGER DEFAULT 0,
    problematic_validations INTEGER DEFAULT 0, -- Dossiers tombés en impayé après validation
    fraud_cases INTEGER DEFAULT 0,
    default_cases INTEGER DEFAULT 0,
    anomaly_rate DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LIQUIDITÉ PLATEFORME --
CREATE TABLE IF NOT EXISTS platform_liquidity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_funds DECIMAL(15,2),
    active_loans_amount DECIMAL(15,2),
    safety_reserve_amount DECIMAL(15,2),
    available_liquidity DECIMAL(15,2),
    exposure_rate DECIMAL(5,2),
    decision_status VARCHAR(50), -- 'NORMAL', 'CAUTION', 'RESTRICTED', 'PAUSED'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. EXTENSIONS ET PROVISIONS --
CREATE TABLE IF NOT EXISTS loan_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES public.prets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    extension_number INTEGER DEFAULT 1,
    extension_days INTEGER DEFAULT 5,
    extension_fee DECIMAL(15,2),
    payment_transaction_id UUID,
    previous_due_date DATE,
    new_due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES public.prets(id) ON DELETE CASCADE,
    risk_class VARCHAR(50),
    active_amount DECIMAL(15,2),
    provision_rate DECIMAL(5,2),
    provision_amount DECIMAL(15,2),
    calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ENRICHISSEMENT TABLES EXISTANTES --
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_score DECIMAL(5,2) DEFAULT 50;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS risk_class VARCHAR(50) DEFAULT 'Standard';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fraud_suspicion_level INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_under_review BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_risk_review_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_debt_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_debt_ratio DECIMAL(5,2) DEFAULT 0;

ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS dynamic_authorized_amount DECIMAL(15,2);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS default_risk_percentage DECIMAL(5,2);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS debt_ratio_at_approval DECIMAL(5,2);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS score_at_approval DECIMAL(5,2);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS liquidity_exposure_at_approval DECIMAL(5,2);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS requires_double_validation BOOLEAN DEFAULT FALSE;
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS first_validated_by UUID REFERENCES public.users(id);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS second_validated_by UUID REFERENCES public.users(id);
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS fraud_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS risk_decision_id UUID REFERENCES public.risk_decisions(id);

-- 8. SECURITÉ RLS (Row Level Security) --
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Seul Super Admin peut lire les logs" ON audit_logs;
CREATE POLICY "Seul Super Admin peut lire les logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles @> '{superadmin}'));

-- 9. BACKFILL : Initialisation des colonnes de risque pour les utilisateurs existants --
-- Les colonnes ont été ajoutées avec DEFAULT mais les lignes existantes ont NULL
UPDATE public.users
SET
    risk_class = 'Standard',
    current_score = 50,
    fraud_suspicion_level = 0
WHERE risk_class IS NULL;

-- Vérification post-migration
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.users WHERE risk_class IS NULL;
    IF v_count > 0 THEN
        RAISE WARNING 'ATTENTION: % utilisateurs ont encore risk_class NULL après backfill', v_count;
    ELSE
        RAISE NOTICE 'OK: Tous les utilisateurs ont une risk_class définie.';
    END IF;
END;
$$;
