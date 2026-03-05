-- Migration to add guarantor information to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS guarantor_nom text,
ADD COLUMN IF NOT EXISTS guarantor_prenom text,
ADD COLUMN IF NOT EXISTS guarantor_whatsapp text;

-- Note: If you have a trigger syncing auth.users to public.users, 
-- make sure it captures 'guarantor_nom', 'guarantor_prenom', and 'guarantor_whatsapp' 
-- from raw_user_meta_data.
