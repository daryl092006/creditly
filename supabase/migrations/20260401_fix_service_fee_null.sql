-- CORRECTIF : Rétroactivement écrire service_fee = 500 dans tous les prêts
-- qui ont été créés après 2026-03-09 et qui ont service_fee IS NULL
-- 
-- POURQUOI : Le fallback JS `Number(null) || 500` calculait 500 en backend
-- mais l'UI affichait `null || 0 = 0`, créant une divergence.
-- Le client voyait "10 000 F à payer", payait 10 000 F, mais le backend
-- calculait un total de 10 500 F → isFullyPaid = false → prêt restait actif → overdue.

-- 1. Corriger les prêts actifs/en retard avec service_fee null (loans en cours)
UPDATE public.prets
SET service_fee = 500
WHERE service_fee IS NULL
  AND created_at >= '2026-03-09'
  AND status IN ('active', 'overdue');

-- 2. Corriger les prêts payés aussi pour la cohérence des historiques
UPDATE public.prets
SET service_fee = 500
WHERE service_fee IS NULL
  AND created_at >= '2026-03-09'
  AND status = 'paid';

-- 3. BONUS : Marquer en 'paid' les prêts dont amount_paid couvre maintenant le vrai total
-- (cas des personnes qui avaient payé le bon montant mais dont le statut était bloqué)
UPDATE public.prets
SET status = 'paid'
WHERE status IN ('active', 'overdue')
  AND COALESCE(amount_paid, 0) >= (amount + COALESCE(service_fee, 0))
  AND COALESCE(service_fee, 0) > 0;
