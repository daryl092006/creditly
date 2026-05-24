-- ==========================================================================
-- MIGRATION: FIX RISK CLASS ENUM → VARCHAR (FRENCH LABELS)
-- Date: 2026-05-22
-- Reason: The old enum used English labels (RELIABLE, WATCH, RISKY).
--         The app now uses French labels (FIABLE, A SURVEILLER, RISQUE).
--         PostgreSQL enums cannot have values removed, so we convert to VARCHAR.
-- ==========================================================================

-- 1. Drop the default value first to untie the column from the Enum type
ALTER TABLE public.users
  ALTER COLUMN risk_class DROP DEFAULT;

-- 2. Drop the enum constraint by changing the column type to VARCHAR
--    (This preserves existing data while removing the enum restriction)
ALTER TABLE public.users
  ALTER COLUMN risk_class TYPE VARCHAR(50)
  USING risk_class::TEXT;

-- 3. Migrate existing English labels → French labels
UPDATE public.users SET risk_class = 'FIABLE'       WHERE risk_class = 'RELIABLE';
UPDATE public.users SET risk_class = 'A SURVEILLER' WHERE risk_class = 'WATCH';
UPDATE public.users SET risk_class = 'RISQUE'       WHERE risk_class = 'RISKY';

-- 4. Set a safe default for any NULLs and restore the new default
UPDATE public.users SET risk_class = 'STANDARD' WHERE risk_class IS NULL;

ALTER TABLE public.users
  ALTER COLUMN risk_class SET DEFAULT 'STANDARD';

-- 5. Add a CHECK constraint to enforce only valid French labels going forward
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS chk_risk_class_valid;

ALTER TABLE public.users
  ADD CONSTRAINT chk_risk_class_valid
  CHECK (risk_class IN ('ELITE', 'FIABLE', 'STANDARD', 'A SURVEILLER', 'RISQUE'));

-- 6. Drop the old unused enum type (now safe since no columns reference it)
DROP TYPE IF EXISTS public.risk_class_type CASCADE;

-- 7. Verification
DO $$
DECLARE
  v_bad_count INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_bad_count FROM public.users
    WHERE risk_class NOT IN ('ELITE', 'FIABLE', 'STANDARD', 'A SURVEILLER', 'RISQUE');

  SELECT COUNT(*) INTO v_total FROM public.users;

  IF v_bad_count > 0 THEN
    RAISE WARNING 'ATTENTION: % / % users ont une risk_class invalide après migration!', v_bad_count, v_total;
  ELSE
    RAISE NOTICE 'OK: Tous les % utilisateurs ont une risk_class valide (French labels).', v_total;
  END IF;
END;
$$;
