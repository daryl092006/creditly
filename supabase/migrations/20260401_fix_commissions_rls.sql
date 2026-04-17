-- Fix: Allow each admin to read their own commissions
-- Problem: The existing RLS policy only allows superadmin and admin_comptable to read 
-- admin_commissions, which means regular agents (admin_loan, admin_kyc, etc.) cannot 
-- see their own gains, resulting in 0 displayed balance.

-- Add a policy that allows any admin to read their OWN commission rows
CREATE POLICY "Admin reads own commissions"
    ON public.admin_commissions
    FOR SELECT
    USING (
        admin_id = auth.uid()
    );
