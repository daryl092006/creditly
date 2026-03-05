-- Migration to add profession to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profession text;
