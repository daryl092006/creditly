-- Migration pour la gestion des surplus et l'optimisation des remboursements
-- 1. Ajout de la colonne montant_surplus à la table remboursements
-- 2. Ajout de la colonne surplus_balance à la table users (pour stocker le crédit client)
-- 3. Mise à jour de la logique de validation des remboursements (côté SQL si possible, mais on va privilégier les actions server pour plus de flexibilité)

-- Ajout de la colonne surplus_balance à l'utilisateur
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS surplus_balance numeric DEFAULT 0;

-- Ajout de la colonne surplus_amount au remboursement pour historiser les surplus détectés à la source
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS surplus_amount numeric DEFAULT 0;

-- Commentaire descriptif
COMMENT ON COLUMN public.users.surplus_balance IS 'Solde créditeur de l''utilisateur généré par des trop-perçus lors des remboursements.';
COMMENT ON COLUMN public.remboursements.surplus_amount IS 'Montant excédentaire identifié lors de la validation de ce remboursement.';
