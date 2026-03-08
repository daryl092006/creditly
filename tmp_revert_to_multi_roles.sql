-- 1. Migration de la colonne role vers un tableau roles
ALTER TABLE public.users RENAME COLUMN role TO roles_old;
ALTER TABLE public.users ADD COLUMN roles public.user_role[] DEFAULT ARRAY['client']::public.user_role[];
UPDATE public.users SET roles = ARRAY[roles_old]::public.user_role[];
ALTER TABLE public.users DROP COLUMN roles_old;

-- 2. Mise à jour de la fonction maitre de check (Support des tableaux)
CREATE OR REPLACE FUNCTION public.check_user_role(target_roles public.user_role[])
RETURNS boolean AS $$
BEGIN
  -- L'owner a toujours accès à tout
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'owner' = ANY(roles)
  ) THEN
    RETURN true;
  END IF;

  -- Vérification si l'utilisateur a au moins UN des rôles de la cible (&& = intersection)
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND roles && target_roles
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Mise à jour du trigger de sécurité
CREATE OR REPLACE FUNCTION public.prevent_sensitive_updates()
RETURNS trigger AS $$
BEGIN
  -- Si superadmin ou owner, on laisse passer (auth.uid() is null pour les opérations système)
  IF (public.check_user_role(ARRAY['superadmin', 'owner']::public.user_role[]) OR auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;

  -- Empecher un utilisateur de modifier ses propres rôles ou son statut
  IF NEW.roles IS DISTINCT FROM OLD.roles THEN
    RAISE EXCEPTION 'Interdit : Vous ne pouvez pas modifier vos propres privilèges.';
  END IF;
  IF NEW.is_account_active IS DISTINCT FROM OLD.is_account_active THEN
    RAISE EXCEPTION 'Interdit : Vous ne pouvez pas activer votre propre compte.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Mise à jour du handler de création de compte
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nom, prenom, roles, whatsapp)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'nom',
    NEW.raw_user_meta_data->>'prenom',
    ARRAY['client']::public.user_role[],
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', NEW.phone)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
