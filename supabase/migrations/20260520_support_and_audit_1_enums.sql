-- Migration pour les Enums du support client sécurisé et audit logs
-- Les ALTER TYPE ne peuvent pas s'exécuter dans la même transaction que leur utilisation.

-- 1. Ajout des nouveaux rôles à l'enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support_n1';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support_n2';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'compliance';
