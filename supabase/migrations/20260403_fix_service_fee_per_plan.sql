-- S'assurer que la colonne service_fee existe sur abonnements (déjà faite mais idempotente)
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 500;

-- Mettre à jour les plans existants qui ont service_fee NULL
-- Pour les plans historiques, on conserve 500 F (valeur actuelle)
UPDATE public.abonnements
SET service_fee = 500
WHERE service_fee IS NULL;

-- S'assurer que snapshot_service_fee est backfillé sur les abonnements actifs
-- pour que la valeur soit lue depuis le snapshot et non recalculée
UPDATE public.user_subscriptions us
SET snapshot_service_fee = a.service_fee
FROM public.abonnements a
WHERE us.plan_id = a.id
  AND us.snapshot_service_fee IS NULL
  AND a.service_fee IS NOT NULL;
