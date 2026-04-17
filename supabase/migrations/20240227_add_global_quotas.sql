-- Add global monthly quotas check to loan requests
CREATE TABLE IF NOT EXISTS public.global_quotas (
    amount numeric PRIMARY KEY,
    monthly_limit int NOT NULL
);

INSERT INTO public.global_quotas (amount, monthly_limit) VALUES
(5000, 4),
(10000, 5),
(25000, 10),
(50000, 4),
(100000, 1)
ON CONFLICT (amount) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit;

-- Update the loan function to check global quotas
CREATE OR REPLACE FUNCTION public.request_loan_transaction(
  p_amount numeric,
  p_payout_phone text,
  p_payout_name text,
  p_payout_network text
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
  v_global_count int;
  v_global_limit int;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- 0. Global Quota Check (REMOVED: Now handled at subscription level)
  -- select count(*) into v_global_count from public.prets where amount = p_amount ...

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

  -- 3. Insert Loan
  insert into public.prets (
    user_id,
    amount,
    subscription_snapshot_id,
    status,
    payout_phone,
    payout_name,
    payout_network
  )
  values (
    v_user_id,
    p_amount,
    v_sub.plan_snapshot_id,
    'pending',
    p_payout_phone,
    p_payout_name,
    p_payout_network
  )
  returning id into v_new_loan_id;

  return json_build_object('success', true, 'loan_id', v_new_loan_id);

exception when others then
  return json_build_object('error', SQLERRM);
END;
$$;
