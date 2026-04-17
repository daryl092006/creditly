-- CORRECTIF : Bug où un prêt entièrement remboursé passait quand même en statut 'overdue'
-- Cause : Le lazy-cron auto_update_system_statuses ne vérifiait pas si le prêt était soldé.
-- Fix : Ajout de la condition COALESCE(amount_paid, 0) < (amount + COALESCE(service_fee, 0))

CREATE OR REPLACE FUNCTION public.auto_update_system_statuses()
RETURNS void AS $$
BEGIN
    -- 1. Expire Abonnements (Abonnements actifs dont la date de fin est passée)
    UPDATE public.user_subscriptions
    SET status = 'expired',
        is_active = false
    WHERE status = 'active' AND end_date < NOW();

    -- 2. Marquer les Prêts en retard (Prêts actifs dont l'échéance est passée)
    -- CORRECTIF : On exclut les prêts déjà entièrement remboursés (amount_paid >= amount + service_fee)
    -- Avant ce fix, un prêt soldé passait en 'overdue' si la date limite était dépassée.
    UPDATE public.prets
    SET status = 'overdue'
    WHERE status = 'active'
      AND due_date < NOW()
      AND COALESCE(amount_paid, 0) < (amount + COALESCE(service_fee, 0));

    -- 3. Auto-Rejet des demandes fantômes (Prêts pending sans abonnement actif valide)
    UPDATE public.prets p
    SET status = 'rejected',
        rejection_reason = 'Rejet automatique : Aucun abonnement actif ou valide au moment de la demande. Demande caduque.'
    WHERE p.status = 'pending'
    AND NOT EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        WHERE us.user_id = p.user_id
        AND us.status = 'active'
        AND us.end_date > NOW()
    );

    -- 4. CORRECTIF SECONDAIRE : Passer en 'paid' les prêts 'active' ou 'overdue' 
    -- dont le montant remboursé couvre déjà le total (edge case où le statut n'a pas été mis à jour)
    UPDATE public.prets
    SET status = 'paid'
    WHERE status IN ('active', 'overdue')
      AND COALESCE(amount_paid, 0) >= (amount + COALESCE(service_fee, 0));

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
