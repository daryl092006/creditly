-- Migration pour la gestion des retraits de gains administrateurs
CREATE TABLE IF NOT EXISTS public.admin_withdrawals (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    method text DEFAULT 'Mobile Money',
    payment_details text, -- Numéro de téléphone ou compte
    processed_at timestamptz,
    processed_by uuid REFERENCES public.users(id),
    rejection_reason text,
    created_at timestamptz DEFAULT now()
);

-- RLS pour les retraits
ALTER TABLE public.admin_withdrawals ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent voir leurs propres demandes de retrait
CREATE POLICY "Admins view own withdrawals" ON public.admin_withdrawals
FOR SELECT USING (auth.uid() = admin_id);

-- Les admins peuvent créer leurs propres demandes de retrait
CREATE POLICY "Admins create own withdrawals" ON public.admin_withdrawals
FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- Les superadmins peuvent tout voir et gérer
CREATE POLICY "Superadmins manage all withdrawals" ON public.admin_withdrawals
FOR ALL USING (
    public.check_user_role(ARRAY['superadmin', 'admin_comptable', 'owner']::public.user_role[])
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_admin ON public.admin_withdrawals(admin_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.admin_withdrawals(status);

COMMENT ON TABLE public.admin_withdrawals IS 'Table des demandes de retrait de gains (commissions) effectuées par les administrateurs.';
