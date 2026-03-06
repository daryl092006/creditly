-- Migration to add borrower_profession to prets
ALTER TABLE public.prets 
ADD COLUMN IF NOT EXISTS borrower_profession text;
