-- 1. Nettoyage des Demandes Fantômes dans le Lazy-Cron (Mise à jour)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Mise à jour transactionnelle : Overdue Lockout et Anti-Spam
CREATE OR REPLACE FUNCTION public.request_loan_transaction(
  p_amount numeric,
  p_payout_phone text,
  p_payout_name text,
  p_payout_network text,
  p_birth_date date DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_id_details text DEFAULT NULL,
  p_profession text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_sub record;
  v_active_count int;
  v_current_debt numeric;
  v_new_loan_id uuid;
  v_has_overdue boolean;
  v_last_request_time timestamptz;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- [NOUVEAU - SYSTEME ANTI-SPAM]
  -- Bloquer les soumissions répétitives (5 minutes) pour empêcher les appels abusifs
  SELECT MAX(request_date) INTO v_last_request_time
  FROM public.prets
  WHERE user_id = v_user_id;

  IF v_last_request_time IS NOT NULL AND v_last_request_time > (NOW() - INTERVAL '5 minutes') THEN
    RETURN json_build_object('error', 'Pare-feu de sécurité : Veuillez patienter 5 minutes avant de soumettre une nouvelle demande de prêt.');
  END IF;

  -- [NOUVEAU - VERROUILLAGE DES IMPAYES]
  -- Empêcher les utilisateurs de vider la caisse s'ils ont déjà un prêt non remboursé
  SELECT EXISTS (
    SELECT 1 FROM public.prets
    WHERE user_id = v_user_id AND status = 'overdue'
  ) INTO v_has_overdue;

  IF v_has_overdue THEN
    RETURN json_build_object('error', 'Sécurité : Vous avez un prêt en retard de remboursement. Réglez vos impayés avant de lancer une nouvelle demande.');
  END IF;

  -- Synchroniser les données du User
  UPDATE public.users 
  SET 
    birth_date = COALESCE(p_birth_date, birth_date),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    profession = COALESCE(p_profession, profession)
  WHERE id = v_user_id;

  -- 1. Check Active Subscription
  select s.*, p.max_loans_per_month, p.max_loan_amount, p.id as plan_snapshot_id
  into v_sub
  from public.user_subscriptions s
  join public.abonnements p on s.plan_id = p.id
  where s.user_id = v_user_id
  and s.status = 'active'
  and s.end_date > now()
  limit 1;

  if v_sub is null then
    return json_build_object('error', 'Aucun abonnement actif valide.');
  end if;

  -- 2. Lock and Count User's Active Loans
  perform 1 from public.user_subscriptions where id = v_sub.id for update;

  select count(*)
  into v_active_count
  from public.prets
  where user_id = v_user_id
  and status in ('approved', 'active', 'overdue');

  if v_active_count >= v_sub.max_loans_per_month then
    return json_build_object('error', 'Limite de dossiers simultanés atteinte (' || v_sub.max_loans_per_month || ').');
  end if;

  select coalesce(sum(amount), 0)
  into v_current_debt
  from public.prets
  where user_id = v_user_id
  and status in ('approved', 'active', 'overdue');

  if (v_current_debt + p_amount) > v_sub.max_loan_amount then
    return json_build_object('error', 'Plafond personnel dépassé. Disponible : ' || (v_sub.max_loan_amount - v_current_debt) || ' FCFA.');
  end if;

  -- 3. Insert Loan with Waiver Details
  insert into public.prets (
    user_id,
    amount,
    subscription_snapshot_id,
    status,
    payout_phone,
    payout_name,
    payout_network,
    borrower_birth_date,
    borrower_address,
    borrower_city,
    borrower_id_details,
    borrower_profession,
    waiver_signed_at
  )
  values (
    v_user_id,
    p_amount,
    v_sub.plan_snapshot_id,
    'pending',
    p_payout_phone,
    p_payout_name,
    p_payout_network,
    p_birth_date,
    p_address,
    p_city,
    p_id_details,
    p_profession,
    now()
  )
  returning id into v_new_loan_id;

  return json_build_object('success', true, 'loan_id', v_new_loan_id);

exception when others then
  return json_build_object('error', SQLERRM);
END;
$$;
