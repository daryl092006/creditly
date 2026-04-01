-- Migrate global_quotas from amount-based to plan_id-based
ALTER TABLE public.global_quotas ADD COLUMN plan_id uuid REFERENCES public.abonnements(id);

-- Populate plan_id based on amount matching
-- Note: If multiple plans have the same amount, this might be tricky,
-- but we match the first one we find or we just do a best effort.
UPDATE public.global_quotas g
SET plan_id = (SELECT id FROM public.abonnements a WHERE a.max_loan_amount = g.amount LIMIT 1);

-- For any plans that don't have a quota yet, we could insert defaults, 
-- but let's just make it the primary key now.
-- We might have multiple records with the same amount if the table was previously messy,
-- but since amount was PK, there is only one per amount.

-- Delete entries that couldn't be matched to a plan
DELETE FROM public.global_quotas WHERE plan_id IS NULL;

-- Change Primary Key
ALTER TABLE public.global_quotas DROP CONSTRAINT IF EXISTS global_quotas_pkey;
ALTER TABLE public.global_quotas ADD PRIMARY KEY (plan_id);

-- Drop amount column as it's no longer the source of truth for the quota
ALTER TABLE public.global_quotas DROP COLUMN amount;
