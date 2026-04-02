-- Add duration_days to abonnements table
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30;

-- Snapshot duration_days in user_subscriptions (Good practice for auditing)
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS snapshot_duration_days INTEGER DEFAULT 30;
