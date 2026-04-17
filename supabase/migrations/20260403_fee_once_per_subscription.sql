-- Migration: Le frais de dossier est payable UNE SEULE FOIS par abonnement
-- (sur le premier prêt de la période d'abonnement uniquement)

-- Mise à jour de la fonction request_loan_transaction
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
  v_fee_already_charged int;
  v_applied_service_fee numeric;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- Update user profile with latest data
  UPDATE public.users 
  SET 
    birth_date = COALESCE(p_birth_date, birth_date),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    profession = COALESCE(p_profession, profession)
  WHERE id = v_user_id;

  -- 1. Check Active Subscription (Using Snapshot Columns with fallback to join)
  select 
    s.*, 
    COALESCE(s.snapshot_max_loans_per_month, p.max_loans_per_month) as max_loans_per_month, 
    COALESCE(s.snapshot_max_loan_amount, p.max_loan_amount) as max_loan_amount,
    COALESCE(s.snapshot_service_fee, p.service_fee, 0) as current_service_fee,
    p.id as plan_snapshot_id
  from public.user_subscriptions s
  join public.abonnements p on s.plan_id = p.id
  into v_sub
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
  from public.prets
  into v_active_count
  where user_id = v_user_id
  and status in ('approved', 'active', 'overdue');

  if v_active_count >= v_sub.max_loans_per_month then
    return json_build_object('error', 'Limite de dossiers simultanés atteinte (' || v_sub.max_loans_per_month || ').');
  end if;

  select coalesce(sum(amount), 0)
  from public.prets
  into v_current_debt
  where user_id = v_user_id
  and status in ('approved', 'active', 'overdue');

  if (v_current_debt + p_amount) > v_sub.max_loan_amount then
    return json_build_object('error', 'Plafond personnel dépassé. Disponible : ' || (v_sub.max_loan_amount - v_current_debt) || ' FCFA.');
  end if;

  -- 3. Vérifier si le frais de dossier a déjà été facturé sur cette période d'abonnement
  -- Le frais est payable UNE SEULE FOIS par abonnement (sur le 1er prêt uniquement)
  select count(*)
  from public.prets
  into v_fee_already_charged
  where user_id = v_user_id
    and subscription_snapshot_id = v_sub.plan_snapshot_id
    and service_fee > 0
    -- Prêts créés pendant la période d'abonnement active
    and created_at >= v_sub.start_date;

  -- Si le frais a déjà été facturé → 0, sinon → frais du plan
  if v_fee_already_charged > 0 then
    v_applied_service_fee := 0;
  else
    v_applied_service_fee := v_sub.current_service_fee;
  end if;

  -- 4. Insert Loan with Waiver Details AND Service Fee (once per subscription)
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
    waiver_signed_at,
    service_fee 
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
    now(),
    v_applied_service_fee -- Frais = plan ou 0 si déjà payé ce cycle
  )
  returning id into v_new_loan_id;

  return json_build_object(
    'success', true,
    'loan_id', v_new_loan_id,
    'service_fee_applied', v_applied_service_fee
  );

exception when others then
  return json_build_object('error', SQLERRM);
END;
$$;
