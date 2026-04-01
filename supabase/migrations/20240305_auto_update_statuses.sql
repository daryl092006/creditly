-- Fonction planifiée "Lazy Cron" pour nettoyer automatiquement les statuts obsolètes
-- Déclenché contextuellement au chargement des Dashboard pour éviter des coûts de serveurs cron

CREATE OR REPLACE FUNCTION public.auto_update_system_statuses()
RETURNS void AS $$
BEGIN
    -- 1. Expire Abonnements (Abonnements actifs dont la date de fin est passée)
    UPDATE public.user_subscriptions
    SET status = 'expired',
        is_active = false
    WHERE status = 'active' AND end_date < NOW();

    -- 2. Marquer les Prêts en retard (Prêts actifs dont l'échéance est passée)
    -- IMPORTANT: On exclut les prêts déjà entièrement remboursés (amount_paid >= amount + service_fee)
    UPDATE public.prets
    SET status = 'overdue'
    WHERE status = 'active'
      AND due_date < NOW()
      AND COALESCE(amount_paid, 0) < (amount + COALESCE(service_fee, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
