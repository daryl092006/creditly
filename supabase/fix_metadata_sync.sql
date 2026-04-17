-- 1. Assurer que toutes les colonnes nécessaires existent dans la table public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS guarantor_nom text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS guarantor_prenom text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS guarantor_whatsapp text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS surplus_balance numeric DEFAULT 0;

-- 2. Mettre à jour la fonction de synchronisation pour capturer TOUTES les métadonnées
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
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
  VALUES (
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
  )
  ON CONFLICT (id) DO UPDATE SET
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

-- 3. Synchronisation massive pour les utilisateurs existants
-- Cette requête va extraire les métadonnées de auth.users et les injecter dans public.users
UPDATE public.users u
SET
  nom = a.raw_user_meta_data->>'nom',
  prenom = a.raw_user_meta_data->>'prenom',
  whatsapp = COALESCE(a.raw_user_meta_data->>'whatsapp', a.phone),
  birth_date = (a.raw_user_meta_data->>'birth_date')::date,
  profession = a.raw_user_meta_data->>'profession',
  guarantor_nom = a.raw_user_meta_data->>'guarantor_nom',
  guarantor_prenom = a.raw_user_meta_data->>'guarantor_prenom',
  guarantor_whatsapp = a.raw_user_meta_data->>'guarantor_whatsapp'
FROM auth.users a
WHERE u.id = a.id;
