-- Add extension tracking columns to prets
ALTER TABLE public.prets 
ADD COLUMN IF NOT EXISTS is_extended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extension_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extension_date TIMESTAMPTZ;

-- Explanation:
-- is_extended: Track if the loan has already been extended (rule: only once per loan)
-- extension_fee: The 500F fee for the extension
-- extension_date: When the extension was granted
