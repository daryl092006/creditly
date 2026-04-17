-- 1. Add 'owner' to user_role enum
-- Note: In a real Supabase env, we'd run: ALTER TYPE user_role ADD VALUE 'owner';
-- For this simulation, we assume the previous command or the full schema update works.

-- 2. Create System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now()
);

-- 3. Seed initial settings
INSERT INTO public.system_settings (key, value, description) VALUES
('subscription_phone', '+229 01 69 46 30 04', 'Numéro Mobile Money pour les abonnements'),
('repayment_phone_mtn', '+229 01 53 32 44 90', 'Numéro MTN pour les remboursements'),
('repayment_phone_moov', '+229 01 58 69 14 05', 'Numéro MOOV pour les remboursements'),
('repayment_phone_celtiis', '+229 01 44 14 00 67', 'Numéro CELTIIS pour les remboursements'),
('support_whatsapp', '14383906281', 'Numéro de support WhatsApp (ID uniquement)'),
('platform_fee', '500', 'Frais de dossier par prêt (FCFA)'),
('operator_fee_reserve', '200', 'Part réservée aux frais opérateurs (FCFA)')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- 4. Set RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings (needed for clients to see payment numbers)
CREATE POLICY "Anyone can view settings" ON public.system_settings
    FOR SELECT USING (true);

-- Only owner can update settings
-- We define 'owner' role in the check_user_role later or just use it here
CREATE POLICY "Only owner can manage settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'owner'
        )
    );

-- 5. Update RLS policies for Other Tables to include Owner
-- Since owner is "above" superadmin, they should have access to EVERYTHING.
