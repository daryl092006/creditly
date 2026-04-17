-- Add service_fee to prets
ALTER TABLE public.prets ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 500;

-- Create admin_commissions table
CREATE TABLE IF NOT EXISTS public.admin_commissions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    loan_id uuid REFERENCES public.prets(id) ON DELETE CASCADE,
    admin_id uuid REFERENCES public.users(id),
    amount numeric NOT NULL,
    type text NOT NULL, -- 'kyc_reward' or 'loan_reward'
    created_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_commissions_admin ON public.admin_commissions(admin_id);

-- Update RLS for commissions
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin viewing commissions" ON public.admin_commissions FOR SELECT USING (
    public.check_user_role(ARRAY['superadmin', 'admin_comptable']::public.user_role[])
);
