-- Function to handle loan requests atomically
create or replace function public.request_loan_transaction(
  p_amount numeric,
  p_payout_phone text,
  p_payout_name text,
  p_payout_network text
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_sub record;
  v_active_count int;
  v_current_debt numeric;
  v_new_loan_id uuid;
begin
  -- Get current user ID
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- 1. Check Active Subscription (Locked for update to prevent concurrent changes if needed, but usually strictly reading is enough if we lock loan inserts)
  -- We don't lock subscription, we just read it.
  select s.*, p.max_loans_per_month, p.max_loan_amount, p.id as plan_snapshot_id
  into v_sub
  from public.user_subscriptions s
  join public.abonnements p on s.plan_id = p.id
  where s.user_id = v_user_id
  and s.is_active = true
  and s.end_date > now()
  limit 1;

  if v_sub is null then
    return json_build_object('error', 'Aucun abonnement actif valide.');
  end if;

  -- 2. Lock and Count Active Loans
  -- We lock the 'prets' table rows for this user to ensure no other transaction is inserting/updating simultaneously? 
  -- Better: we just count. But to be safe against race condition, we should lock.
  -- 'perform' with 'for update' on a dummy select or similar?
  -- Actually, in Postgres `SERIALIZABLE` isolation handles this, but Supabase functions run in `READ COMMITTED` by default.
  -- We can lock the user's subscription row as a mutex for this user's loan operations.
  perform 1 from public.user_subscriptions where id = v_sub.id for update;

  -- Check Active Count
  select count(*)
  into v_active_count
  from public.prets
  where user_id = v_user_id
  and status in ('approved', 'active', 'overdue');

  if v_active_count >= v_sub.max_loans_per_month then
    return json_build_object('error', 'Limite de dossiers simultanés atteinte (' || v_sub.max_loans_per_month || ').');
  end if;

  -- Check Cumulative Debt
  select coalesce(sum(amount), 0)
  into v_current_debt
  from public.prets
  where user_id = v_user_id
  and status in ('approved', 'active', 'overdue');

  if (v_current_debt + p_amount) > v_sub.max_loan_amount then
    return json_build_object('error', 'Plafond dépassé. Disponible : ' || (v_sub.max_loan_amount - v_current_debt) || ' FCFA.');
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
end;
$$;
