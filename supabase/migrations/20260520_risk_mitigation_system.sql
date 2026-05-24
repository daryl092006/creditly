-- ==========================================================================
-- MIGRATION: RISK MITIGATION SYSTEM - CREDITLY FINANCE
-- Date: 2026-05-20
-- Author: Antigravity (Audit & Risk Engine)
-- ==========================================================================

-- Enable pgcrypto for hashing functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- 1. NOUVEAUX TYPES ENUM
-- ==========================================================================
DO $$ BEGIN
  CREATE TYPE public.risk_class_type AS ENUM ('ELITE', 'RELIABLE', 'STANDARD', 'WATCH', 'RISKY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.decision_type_enum AS ENUM ('LOAN_REQUEST', 'SUBSCRIPTION_VALIDATION', 'REPAYMENT_VALIDATION', 'EXTENSION_REQUEST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.decision_result_enum AS ENUM ('AUTO_APPROVED', 'MANUAL_REVIEW_REQUIRED', 'AUTO_REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reconciliation_status_enum AS ENUM ('PENDING', 'MATCHED', 'MISMATCHED', 'SUSPECTED_FRAUD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================================================
-- 2. TABLE : DÉCISIONS DE RISQUE
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.risk_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  loan_id UUID,
  decision_type public.decision_type_enum NOT NULL,
  decision_result public.decision_result_enum NOT NULL,
  reason TEXT NOT NULL,
  score_at_decision INT NOT NULL DEFAULT 0,
  debt_ratio NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_risk NUMERIC(5,2) NOT NULL DEFAULT 0,
  liquidity_exposure NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.risk_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view risk decisions" ON public.risk_decisions
  FOR SELECT USING (public.check_user_role(ARRAY['admin_loan', 'admin_comptable', 'superadmin', 'owner']::public.user_role[]));
CREATE POLICY "System insert risk decisions" ON public.risk_decisions
  FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- 3. TABLE : TRANSACTIONS MOBILE MONEY (CONTRÔLE ANTI-DOUBLON)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_reference VARCHAR(100) NOT NULL,
  operator VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  expected_amount NUMERIC NOT NULL,
  declared_amount NUMERIC NOT NULL,
  sender_phone VARCHAR(50) NOT NULL DEFAULT '',
  receiver_phone VARCHAR(50) NOT NULL DEFAULT '',
  proof_url TEXT NOT NULL,
  proof_hash VARCHAR(64) NOT NULL,
  status public.reconciliation_status_enum DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- CONTRAINTE CRITIQUE : Référence de transaction unique par opérateur
  CONSTRAINT unique_operator_transaction UNIQUE(operator, transaction_reference)
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.payment_transactions
  FOR ALL USING (public.check_user_role(ARRAY['admin_repayment', 'admin_comptable', 'superadmin', 'owner']::public.user_role[]));
CREATE POLICY "System insert transactions" ON public.payment_transactions
  FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- 4. TABLE : AUDIT LOGS INALTÉRABLES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES public.users(id),
  actor_role public.user_role[],
  action_type VARCHAR(100) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  target_id UUID NOT NULL,
  old_value_json JSONB,
  new_value_json JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin/Owner view audit logs" ON public.audit_logs
  FOR SELECT USING (public.check_user_role(ARRAY['superadmin', 'owner']::public.user_role[]));
-- Interdire toute modification des logs : ils sont en écriture seule
CREATE POLICY "No updates on audit logs" ON public.audit_logs
  FOR UPDATE USING (false);
CREATE POLICY "No deletes on audit logs" ON public.audit_logs
  FOR DELETE USING (false);
CREATE POLICY "System insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- 5. TABLE : SNAPSHOTS DE LIQUIDITÉ PLATEFORME
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.platform_liquidity_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_funds NUMERIC NOT NULL DEFAULT 0,
  active_loans_amount NUMERIC NOT NULL DEFAULT 0,
  safety_reserve_amount NUMERIC NOT NULL DEFAULT 0,
  available_liquidity NUMERIC NOT NULL DEFAULT 0,
  exposure_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  decision_status VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_liquidity_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin view liquidity" ON public.platform_liquidity_snapshots
  FOR SELECT USING (public.check_user_role(ARRAY['admin_comptable', 'superadmin', 'owner']::public.user_role[]));
CREATE POLICY "System insert liquidity" ON public.platform_liquidity_snapshots
  FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- 6. TABLE : EXTENSIONS DE PRÊTS (SUIVI STRUCTURÉ)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.loan_extensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES public.prets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  extension_number INT NOT NULL DEFAULT 1,
  extension_days INT NOT NULL DEFAULT 5,
  extension_fee NUMERIC NOT NULL DEFAULT 0,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  previous_due_date TIMESTAMPTZ NOT NULL,
  new_due_date TIMESTAMPTZ NOT NULL,
  status public.repayment_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loan_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own extensions" ON public.loan_extensions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage extensions" ON public.loan_extensions
  FOR ALL USING (public.check_user_role(ARRAY['admin_loan', 'admin_repayment', 'superadmin', 'owner']::public.user_role[]));
CREATE POLICY "System insert extensions" ON public.loan_extensions
  FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- 7. TABLE : PERFORMANCE DES AGENTS (SUIVI DES INCIDENTS)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.agent_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  total_validations INT DEFAULT 0,
  problematic_validations INT DEFAULT 0,
  fraud_cases INT DEFAULT 0,
  default_cases INT DEFAULT 0,
  anomaly_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_validations > 0
    THEN (problematic_validations::NUMERIC / total_validations::NUMERIC) * 100
    ELSE 0 END
  ) STORED,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin view agent performance" ON public.agent_performance
  FOR SELECT USING (public.check_user_role(ARRAY['superadmin', 'owner']::public.user_role[]));
CREATE POLICY "System manage agent performance" ON public.agent_performance
  FOR ALL USING (true);

-- ==========================================================================
-- 8. MISE À JOUR DES TABLES EXISTANTES (NOUVELLES COLONNES)
-- ==========================================================================

-- Table USERS : Score, classe de risque, suspicion fraude, dette active
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_score INT DEFAULT 60,
  ADD COLUMN IF NOT EXISTS risk_class public.risk_class_type DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS fraud_suspicion_level VARCHAR(20) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS is_under_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS active_debt_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_debt_ratio NUMERIC(5,2) DEFAULT 0;

-- Table PRETS : Montant autorisé dynamique, double validation, traçabilité
ALTER TABLE public.prets
  ADD COLUMN IF NOT EXISTS dynamic_authorized_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS default_risk_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS debt_ratio_at_approval NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS score_at_approval INT,
  ADD COLUMN IF NOT EXISTS requires_double_validation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_validated_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS second_validated_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS risk_decision_id UUID REFERENCES public.risk_decisions(id),
  ADD COLUMN IF NOT EXISTS extension_count INT DEFAULT 0;

-- Table REMBOURSEMENTS : Référence MoMo, hash preuve, traçabilité fraude
ALTER TABLE public.remboursements
  ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS operator VARCHAR(50),
  ADD COLUMN IF NOT EXISTS proof_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_duplicate_suspected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_double_validation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_validated_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS second_validated_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS surplus_amount NUMERIC DEFAULT 0;

-- Table ADMIN_COMMISSIONS : Statut de verrouillage (différé jusqu'au remboursement)
ALTER TABLE public.admin_commissions
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ==========================================================================
-- 9. TRIGGERS DE SÉCURITÉ
-- ==========================================================================

-- TRIGGER 1 : Bloquer la suppression ou l'anonymisation d'un débiteur actif
CREATE OR REPLACE FUNCTION public.check_user_deletion_safety()
RETURNS TRIGGER AS $$
DECLARE
  active_debt NUMERIC;
BEGIN
  -- Calculer la dette en cours
  SELECT COALESCE(SUM(amount - COALESCE(amount_paid, 0)), 0) INTO active_debt
  FROM public.prets
  WHERE user_id = OLD.id AND status IN ('active', 'overdue');

  IF active_debt > 0 THEN
    RAISE EXCEPTION 'SÉCURITÉ CRITIQUE : Impossible de supprimer ou d''anonymiser un utilisateur ayant une dette active. Dette restante : % FCFA', active_debt;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_deletion_of_debtors ON public.users;
CREATE TRIGGER tr_prevent_deletion_of_debtors
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.check_user_deletion_safety();

-- TRIGGER 2 : Bloquer l'anonymisation email d'un débiteur actif
CREATE OR REPLACE FUNCTION public.check_email_anonymization_safety()
RETURNS TRIGGER AS $$
DECLARE
  active_debt NUMERIC;
BEGIN
  -- Vérifier seulement si l'email change vers un email d'anonymisation
  IF NEW.email LIKE '%@creditly.anonymized' AND OLD.email NOT LIKE '%@creditly.anonymized' THEN
    SELECT COALESCE(SUM(amount - COALESCE(amount_paid, 0)), 0) INTO active_debt
    FROM public.prets
    WHERE user_id = OLD.id AND status IN ('active', 'overdue');

    IF active_debt > 0 THEN
      RAISE EXCEPTION 'SÉCURITÉ CRITIQUE : Impossible d''anonymiser un utilisateur ayant une dette active de % FCFA.', active_debt;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_email_anonymization_of_debtors ON public.users;
CREATE TRIGGER tr_prevent_email_anonymization_of_debtors
  BEFORE UPDATE OF email ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.check_email_anonymization_safety();

-- TRIGGER 3 : Audit log inaltérable pour les changements de rôles et d'activation
CREATE OR REPLACE FUNCTION public.log_sensitive_user_changes()
RETURNS TRIGGER AS $$
DECLARE
  admin_role public.user_role[];
  actor_id UUID;
BEGIN
  actor_id := auth.uid();
  SELECT roles INTO admin_role FROM public.users WHERE id = actor_id;

  IF (OLD.roles IS DISTINCT FROM NEW.roles) OR (OLD.is_account_active IS DISTINCT FROM NEW.is_account_active) THEN
    INSERT INTO public.audit_logs (
      actor_user_id,
      actor_role,
      action_type,
      target_table,
      target_id,
      old_value_json,
      new_value_json
    ) VALUES (
      actor_id,
      admin_role,
      'ROLE_OR_ACTIVATION_CHANGE',
      'users',
      NEW.id,
      jsonb_build_object('roles', OLD.roles, 'active', OLD.is_account_active),
      jsonb_build_object('roles', NEW.roles, 'active', NEW.is_account_active)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_user_modifications ON public.users;
CREATE TRIGGER tr_audit_user_modifications
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.log_sensitive_user_changes();

-- TRIGGER 4 : Initialiser les stats de performance d'un agent à sa création
CREATE OR REPLACE FUNCTION public.init_agent_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un utilisateur devient admin, initialiser son enregistrement de performance
  IF NEW.roles && ARRAY['admin_kyc', 'admin_loan', 'admin_repayment', 'admin_comptable', 'superadmin', 'owner']::public.user_role[]
     AND NOT (OLD.roles && ARRAY['admin_kyc', 'admin_loan', 'admin_repayment', 'admin_comptable', 'superadmin', 'owner']::public.user_role[]) THEN
    INSERT INTO public.agent_performance (agent_id)
    VALUES (NEW.id)
    ON CONFLICT (agent_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_init_agent_performance ON public.users;
CREATE TRIGGER tr_init_agent_performance
  AFTER UPDATE OF roles ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.init_agent_performance();

-- ==========================================================================
-- 10. INDEX DE PERFORMANCE
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_risk_decisions_user ON public.risk_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_hash ON public.payment_transactions(proof_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_users_risk_class ON public.users(risk_class);
CREATE INDEX IF NOT EXISTS idx_prets_risk ON public.prets(requires_double_validation);

-- ==========================================================================
-- FIN DE LA MIGRATION
-- ==========================================================================
