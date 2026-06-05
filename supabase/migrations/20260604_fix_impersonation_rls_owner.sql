-- ==========================================================================
-- MIGRATION: FIX IMPERSONATION SESSIONS RLS - ADD OWNER ROLE
-- Date: 2026-06-04
-- Reason: Le rôle 'owner' était absent des politiques RLS de la table
--         impersonation_sessions, empêchant le propriétaire de la plateforme
--         de créer des sessions d'assistance sécurisée.
-- ==========================================================================

-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Support N2 can create sessions" ON public.impersonation_sessions;
DROP POLICY IF EXISTS "Support N2 can view their sessions" ON public.impersonation_sessions;
DROP POLICY IF EXISTS "Support N2 can update their sessions" ON public.impersonation_sessions;

-- Recréer avec owner + superadmin + support_n2
CREATE POLICY "Privileged agents can create sessions" ON public.impersonation_sessions
    FOR INSERT WITH CHECK (
        public.check_user_role(ARRAY['support_n2', 'superadmin', 'owner']::public.user_role[])
        AND auth.uid() = agent_id
    );

CREATE POLICY "Privileged agents can view their sessions" ON public.impersonation_sessions
    FOR SELECT USING (
        public.check_user_role(ARRAY['support_n2', 'superadmin', 'owner']::public.user_role[])
        AND auth.uid() = agent_id
    );

CREATE POLICY "Privileged agents can update their sessions" ON public.impersonation_sessions
    FOR UPDATE USING (
        public.check_user_role(ARRAY['support_n2', 'superadmin', 'owner']::public.user_role[])
        AND auth.uid() = agent_id
    );
