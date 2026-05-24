-- Migration pour le support client sécurisé et les audit logs (Partie 2)

-- 2. Création de la table de Ticketing Support
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    agent_id UUID REFERENCES public.users(id),
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Politiques pour support_tickets
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets" ON public.support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Support staff can view all tickets" ON public.support_tickets
    FOR SELECT USING (
        public.check_user_role(ARRAY['support_n1', 'support_n2', 'superadmin', 'owner']::public.user_role[])
    );

CREATE POLICY "Support staff can update tickets" ON public.support_tickets
    FOR UPDATE USING (
        public.check_user_role(ARRAY['support_n1', 'support_n2', 'superadmin', 'owner']::public.user_role[])
    );

-- 3. Création de la table pour les sessions d'assistance sécurisée (Impersonation)
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.users(id) NOT NULL,
    target_user_id UUID REFERENCES public.users(id) NOT NULL,
    ticket_id UUID REFERENCES public.support_tickets(id) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'active', 'expired', 'revoked')) DEFAULT 'pending',
    otp_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur impersonation_sessions
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques pour impersonation_sessions
CREATE POLICY "Support N2 can create sessions" ON public.impersonation_sessions
    FOR INSERT WITH CHECK (
        public.check_user_role(ARRAY['support_n2', 'superadmin']::public.user_role[])
        AND auth.uid() = agent_id
    );

CREATE POLICY "Support N2 can view their sessions" ON public.impersonation_sessions
    FOR SELECT USING (
        public.check_user_role(ARRAY['support_n2', 'superadmin']::public.user_role[])
        AND auth.uid() = agent_id
    );

CREATE POLICY "Users can view sessions targeting them" ON public.impersonation_sessions
    FOR SELECT USING (auth.uid() = target_user_id);
    
CREATE POLICY "Users can update sessions targeting them" ON public.impersonation_sessions
    FOR UPDATE USING (auth.uid() = target_user_id);

CREATE POLICY "Support N2 can update their sessions" ON public.impersonation_sessions
    FOR UPDATE USING (
        public.check_user_role(ARRAY['support_n2', 'superadmin']::public.user_role[])
        AND auth.uid() = agent_id
    );


