-- Migration for Loan Waiver and Debt Recognition
-- 1. Add fields to 'users' for permanent storage (optional but recommended)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text;

-- 2. Add fields to 'prets' for legal recognition of debt at the time of the loan
ALTER TABLE public.prets
ADD COLUMN IF NOT EXISTS borrower_birth_date date,
ADD COLUMN IF NOT EXISTS borrower_address text,
ADD COLUMN IF NOT EXISTS borrower_city text,
ADD COLUMN IF NOT EXISTS borrower_id_details text,
ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz DEFAULT now();

-- 3. Update the RPC function to accept and store these values
-- Note: We add them with DEFAULT NULL to maintain backward compatibility if any, 
-- but they should be required in the final frontend logic.
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
  -- Use FOR UPDATE to prevent race conditions on the user's subscription slot
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
