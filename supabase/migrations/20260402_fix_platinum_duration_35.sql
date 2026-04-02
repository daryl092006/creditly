-- Set Platinum plan duration to 35 days
UPDATE public.abonnements SET duration_days = 35 WHERE name = 'Platinum';

-- IMPORTANT: Retroactively apply 35 days to EXISTING active/pending Platinum subscriptions
-- For pending ones, we update the snapshot so it applies on activation
UPDATE public.user_subscriptions 
SET snapshot_duration_days = 35 
WHERE plan_id IN (SELECT id FROM public.abonnements WHERE name = 'Platinum');

-- For currently ACTIVE ones, we extend the end_date by adding (35 - 30 = 5) days
-- Assuming they were activated with 30 days previously
-- To be safe, we recalculate as start_date + 35 days
UPDATE public.user_subscriptions 
SET end_date = (start_date::timestamp + interval '35 days')::timestamptz
WHERE status = 'active' 
AND is_active = true
AND plan_id IN (SELECT id FROM public.abonnements WHERE name = 'Platinum')
AND start_date IS NOT NULL;
