-- Migration: Ajout de l'ID de transaction obligatoire aux remboursements et paiements d'abonnement
-- Date: 2026-05-20
-- Objectif: Anti-fraude, rapprochement comptable, traçabilité

-- 1. Ajouter le champ transaction_id aux remboursements (peut être NULL pour les anciens enregistrements)
ALTER TABLE public.remboursements
    ADD COLUMN IF NOT EXISTS transaction_id text;

-- 2. Ajouter un index partiel pour détecter les doublons sur les nouveaux enregistrements
CREATE INDEX IF NOT EXISTS idx_remboursements_transaction_id
    ON public.remboursements(transaction_id)
    WHERE transaction_id IS NOT NULL;

-- 3. Ajouter le champ transaction_id aux user_subscriptions
ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS transaction_id text;

-- 4. Index similaire pour abonnements
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_transaction_id
    ON public.user_subscriptions(transaction_id)
    WHERE transaction_id IS NOT NULL;

-- 5. Fonction de contrôle anti-doublon pour les remboursements
CREATE OR REPLACE FUNCTION public.check_duplicate_repayment_transaction(
    p_transaction_id text,
    p_user_id uuid
) RETURNS boolean AS $$
DECLARE
    v_count integer;
BEGIN
    IF p_transaction_id IS NULL OR p_transaction_id = '' THEN
        RETURN false; -- Pas de doublon possible sans ID
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM public.remboursements
    WHERE transaction_id = p_transaction_id
      AND status != 'rejected'; -- Un ID rejeté peut être resoumis
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction de contrôle anti-doublon pour les abonnements
CREATE OR REPLACE FUNCTION public.check_duplicate_subscription_transaction(
    p_transaction_id text
) RETURNS boolean AS $$
DECLARE
    v_count integer;
BEGIN
    IF p_transaction_id IS NULL OR p_transaction_id = '' THEN
        RETURN false;
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM public.user_subscriptions
    WHERE transaction_id = p_transaction_id
      AND status != 'rejected';
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
