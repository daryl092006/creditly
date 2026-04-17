-- Fix check_user_role back to using "role" since we fixed the database table column back to "role" earlier
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

-- Fix the trigger as well since new.roles might break new updates
create or replace function public.prevent_sensitive_updates()
returns trigger as $$
begin
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

-- Fix handle_new_user 
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
