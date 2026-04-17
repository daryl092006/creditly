-- 1. Fix check_user_role to handle the 'roles' array column instead of the 'role' enum column
create or replace function public.check_user_role(target_roles public.user_role[])
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid()
    and roles::text[] && target_roles::text[]
  );
end;
$$ language plpgsql security definer;

-- 2. Fix prevent_sensitive_updates to prevent users from updating the 'roles' column
create or replace function public.prevent_sensitive_updates()
returns trigger as $$
begin
  if (public.check_user_role(array['superadmin']::public.user_role[]) or auth.uid() is null) then
    return new;
  end if;

  if new.roles is distinct from old.roles then
    raise exception 'You cannot change your own role.';
  end if;
  if new.is_account_active is distinct from old.is_account_active then
    raise exception 'You cannot activate your own account.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Fix handle_new_user to insert into 'roles' instead of 'role' and include all metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id, 
    email, 
    nom, 
    prenom, 
    roles, 
    whatsapp,
    birth_date,
    profession,
    guarantor_nom,
    guarantor_prenom,
    guarantor_whatsapp
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'nom', 
    new.raw_user_meta_data->>'prenom', 
    ARRAY['client']::public.user_role[],
    COALESCE(new.raw_user_meta_data->>'whatsapp', new.phone),
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'profession',
    new.raw_user_meta_data->>'guarantor_nom',
    new.raw_user_meta_data->>'guarantor_prenom',
    new.raw_user_meta_data->>'guarantor_whatsapp'
  );
  return new;
end;
$$ language plpgsql security definer;
