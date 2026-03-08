-- Update check_user_role to ALWAYS return true if the user is an owner, since owner has access to EVERYTHING
CREATE OR REPLACE FUNCTION public.check_user_role(target_roles public.user_role[])
RETURNS boolean AS $$
BEGIN
  -- If the user is an owner, always give them access, even if the policy only asks for 'superadmin' or 'admin_loan'
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'owner'
  ) THEN
    RETURN true;
  END IF;

  -- Otherwise, just do a normal check against target_roles
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = ANY(target_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
