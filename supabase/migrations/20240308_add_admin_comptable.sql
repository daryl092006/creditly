-- 1. Ajouter le rôle à l'ENUM
ALTER TYPE user_role ADD VALUE 'admin_comptable';

-- 2. Mises à jour des politiques RLS pour inclure l'admin_comptable

-- Accès aux profils utilisateurs
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT USING (
    public.check_user_role(ARRAY['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable']::public.user_role[])
  );

-- Accès aux remboursements
DROP POLICY IF EXISTS "Repayment Admin can view and update" ON public.remboursements;
CREATE POLICY "Repayment Admin can view and update" ON public.remboursements
  FOR ALL USING (
    public.check_user_role(ARRAY['admin_repayment', 'superadmin', 'admin_comptable']::public.user_role[])
  );

-- Accès aux prêts
DROP POLICY IF EXISTS "Loan Admin can view and update" ON public.prets;
CREATE POLICY "Loan Admin can view and update" ON public.prets
  FOR ALL USING (
    public.check_user_role(ARRAY['admin_loan', 'superadmin', 'admin_comptable']::public.user_role[])
  );

-- Accès à la blacklist
DROP POLICY IF EXISTS "Admins can manage blacklist" ON public.email_blacklist;
CREATE POLICY "Admins can manage blacklist" ON public.email_blacklist
  FOR ALL USING (
    public.check_user_role(ARRAY['admin_kyc', 'admin_loan', 'admin_repayment', 'superadmin', 'admin_comptable']::public.user_role[])
  );
