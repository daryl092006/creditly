-- Ajout de la colonne service_fee à abonnements si manquante
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 500;

-- Ajout des colonnes de snapshot à user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS snapshot_name text,
ADD COLUMN IF NOT EXISTS snapshot_price numeric,
ADD COLUMN IF NOT EXISTS snapshot_max_loans_per_month int,
ADD COLUMN IF NOT EXISTS snapshot_max_loan_amount numeric,
ADD COLUMN IF NOT EXISTS snapshot_repayment_delay_days int,
ADD COLUMN IF NOT EXISTS snapshot_service_fee numeric;

-- Backfill des données existantes : les anciens abonnements gardent les limites actuelles (comme référence)
UPDATE public.user_subscriptions us
SET 
  snapshot_name = a.name,
  snapshot_price = a.price,
  snapshot_max_loans_per_month = a.max_loans_per_month,
  snapshot_max_loan_amount = a.max_loan_amount,
  snapshot_repayment_delay_days = a.repayment_delay_days,
  snapshot_service_fee = a.service_fee
FROM public.abonnements a
WHERE us.plan_id = a.id AND us.snapshot_price IS NULL;

-- Mise à jour de la fonction request_loan_transaction pour qu'elle lise en priorité les snapshots
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
    COALESCE(s.snapshot_service_fee, p.service_fee, 500) as current_service_fee,
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

  -- 3. Insert Loan with Waiver Details AND Service Fee
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
    v_sub.current_service_fee 
  )
  returning id into v_new_loan_id;

  return json_build_object('success', true, 'loan_id', v_new_loan_id);

exception when others then
  return json_build_object('error', SQLERRM);
END;
$$;
