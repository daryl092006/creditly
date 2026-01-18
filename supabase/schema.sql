-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. ENUMS (Types defined in the specs)
create type user_role as enum ('client', 'admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin');
create type kyc_status as enum ('pending', 'approved', 'rejected');
create type loan_status as enum ('pending', 'approved', 'active', 'rejected', 'paid', 'overdue');
create type repayment_status as enum ('pending', 'verified', 'rejected');
create type subscription_status as enum ('pending', 'active', 'rejected', 'expired');

-- 2. USERS / PROFILES (Extends Supabase Auth)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  nom text,
  prenom text,
  telephone text,
  whatsapp text,
  role user_role default 'client',
  is_account_active boolean default false, -- Active only after KYC? Or email verification? Let's say needs admin activation or KYC.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- RLS Policies for users
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

-- SECURITY HELPERS: Functions to check roles without RLS recursion
create or replace function public.check_user_role(target_roles public.user_role[])
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid()
    and role = any(target_roles)
  );
end;
$$ language plpgsql security definer;

-- SECURITY TRIGGER: Prevent users from changing their own role or active status
create or replace function public.prevent_sensitive_updates()
returns trigger as $$
begin
  -- Autoriser si c'est un superadmin qui fait la modif (en utilisant auth.uid())
  -- Ou si l'UID est nul (cas de l'éditeur SQL Supabase direct)
  if (public.check_user_role(array['superadmin']::public.user_role[]) or auth.uid() is null) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change your own role.';
  end if;
  if new.is_account_active is distinct from old.is_account_active then
    raise exception 'You cannot activate your own account.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_update_sensitive
  before update on public.users
  for each row execute procedure public.prevent_sensitive_updates();

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.users
  for select using (
    public.check_user_role(array['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin']::public.user_role[])
  );

create policy "Superadmin can update everyone" on public.users
  for update using (
    public.check_user_role(array['superadmin']::public.user_role[])
  );

-- 3. SUBSCRIPTION PLANS (Abonnements)
create table public.abonnements (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,      -- Basic, Silver, Gold, Platinum
  price numeric not null,         -- 500, 1000, 1500, 3000
  max_loans_per_month int not null,
  max_loan_amount numeric not null,
  repayment_delay_days int not null,
  created_at timestamptz default now()
);

-- Seed Data for Abonnements
insert into public.abonnements (name, price, max_loans_per_month, max_loan_amount, repayment_delay_days) values
('Basic', 500, 1, 10000, 7),
('Silver', 1000, 2, 25000, 10),
('Gold', 1500, 3, 50000, 15),
('Platinum', 3000, 5, 100000, 20);

alter table public.abonnements enable row level security;
create policy "Everyone can view plans" on public.abonnements for select using (true);
create policy "Superadmin can manage plans" on public.abonnements for all using (
    public.check_user_role(array['superadmin']::public.user_role[])
);

-- 4. USER SUBSCRIPTIONS (Liaison User <-> Plan)
create table public.user_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  plan_id uuid references public.abonnements(id) not null,
  start_date timestamptz default now(),
  end_date timestamptz, -- logic to set this depends on payment
  is_active boolean default false, -- (payment validation) - DEPRECATED: use status
  status subscription_status default 'pending',
  rejection_reason text,
  proof_url text, -- Storage path to payment proof
  amount_paid numeric,
  created_at timestamptz default now()
);

alter table public.user_subscriptions enable row level security;
create policy "Users view own sub" on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "Users create own sub" on public.user_subscriptions for insert with check (auth.uid() = user_id and is_active = false);
create policy "Admins manage all subs" on public.user_subscriptions for all using (
    public.check_user_role(array['admin_kyc', 'admin_loan', 'superadmin']::public.user_role[])
);

-- 5. KYC SUBMISSIONS (Dossiers de vérification)
create table public.kyc_submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null unique, -- Une seule soumission active par utilisateur
  id_card_url text not null,
  selfie_url text not null,
  proof_of_residence_url text not null,
  status kyc_status default 'pending',
  admin_notes text,
  admin_id uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.kyc_submissions enable row level security;
create policy "Users view own kyc" on public.kyc_submissions for select using (auth.uid() = user_id);
create policy "Users upload kyc" on public.kyc_submissions for insert with check (auth.uid() = user_id and status = 'pending');
create policy "KYC Admin can view and update" on public.kyc_submissions for all using (
    public.check_user_role(array['admin_kyc', 'superadmin']::public.user_role[])
);

-- 6. LOANS (Prets)
create table public.prets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  amount numeric not null,
  subscription_snapshot_id uuid references public.abonnements(id), -- Reference original terms
  request_date timestamptz default now(),
  due_date timestamptz, -- Calculated on approval
  status loan_status default 'pending',
  admin_id uuid references public.users(id),
  admin_decision_date timestamptz,
  rejection_reason text,
  amount_paid numeric default 0,
  payout_phone text,
  payout_name text,
  payout_network text,
  created_at timestamptz default now()
);

alter table public.prets enable row level security;
create policy "Users view own loans" on public.prets for select using (auth.uid() = user_id);
create policy "Users request loans" on public.prets for insert with check (auth.uid() = user_id and status = 'pending');
create policy "Loan Admin can view and update" on public.prets for all using (
    public.check_user_role(array['admin_loan', 'superadmin']::public.user_role[])
);

-- 7. REPAYMENTS (Remboursements)
create table public.remboursements (
  id uuid default uuid_generate_v4() primary key,
  loan_id uuid references public.prets(id) not null,
  user_id uuid references public.users(id) not null, -- Denormalized for easier RLS
  amount_declared numeric not null,
  proof_url text not null,
  status repayment_status default 'pending',
  admin_id uuid references public.users(id),
  validated_at timestamptz,
  created_at timestamptz default now()
);

alter table public.remboursements enable row level security;
create policy "Users view own repayments" on public.remboursements for select using (auth.uid() = user_id);
create policy "Users submit repayments" on public.remboursements for insert with check (auth.uid() = user_id and status = 'pending');
create policy "Repayment Admin can view and update" on public.remboursements for all using (
    public.check_user_role(array['admin_repayment', 'superadmin']::public.user_role[])
);


-- Create a function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, nom, prenom, role, whatsapp)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'nom', 
    new.raw_user_meta_data->>'prenom', 
    'client',
    COALESCE(new.raw_user_meta_data->>'whatsapp', new.phone)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. BLACKLIST
create table public.email_blacklist (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  created_at timestamptz default now()
);

alter table public.email_blacklist enable row level security;
create policy "Admins can manage blacklist" on public.email_blacklist for all using (
    public.check_user_role(array['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin']::public.user_role[])
);
create policy "Everyone can view blacklist for signup check" on public.email_blacklist for select using (true);

