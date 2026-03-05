-- Automation Migration for Creditly
-- 1. Metadata Synchronization Trigger
-- This ensures that when a user signs up via Supabase Auth, their public profile 
-- is automatically created/updated with ALL metadata (guarantor, profession, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    nom, 
    prenom, 
    whatsapp, 
    birth_date, 
    profession, 
    guarantor_nom, 
    guarantor_prenom, 
    guarantor_whatsapp
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nom',
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'whatsapp',
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'profession',
    new.raw_user_meta_data->>'guarantor_nom',
    new.raw_user_meta_data->>'guarantor_prenom',
    new.raw_user_meta_data->>'guarantor_whatsapp'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    whatsapp = EXCLUDED.whatsapp,
    birth_date = EXCLUDED.birth_date,
    profession = EXCLUDED.profession,
    guarantor_nom = EXCLUDED.guarantor_nom,
    guarantor_prenom = EXCLUDED.guarantor_prenom,
    guarantor_whatsapp = EXCLUDED.guarantor_whatsapp;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Update request_loan_transaction to include profession sync
CREATE OR REPLACE FUNCTION public.request_loan_transaction(
  p_amount numeric,
  p_payout_phone text,
  p_payout_name text,
  p_payout_network text,
  p_birth_date date DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_id_details text DEFAULT NULL,
  p_profession text DEFAULT NULL -- Added parameter
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

  -- Update user profile with latest data (Automation: Sync back to profile)
  UPDATE public.users 
  SET 
    birth_date = COALESCE(p_birth_date, birth_date),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    profession = COALESCE(p_profession, profession) -- Sync profession
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
    now()
  )
  returning id into v_new_loan_id;

  return json_build_object('success', true, 'loan_id', v_new_loan_id);

exception when others then
  return json_build_object('error', SQLERRM);
END;
$$;
