-- Migration 043: Lock down privilege columns on profiles
--
-- Background: the profiles UPDATE policy is `auth.uid() = id`, which lets a user
-- update ANY column of their own row — including `role`. Combined with the anon
-- key available in the browser, any authenticated user could run
--   supabase.from('profiles').update({ role: 'SuperAdmin' }).eq('id', myId)
-- and self-escalate to admin. (The DebugAuth page that did exactly this was
-- removed, but the underlying hole must be closed at the database, not just the UI.)
--
-- Fix: a BEFORE UPDATE trigger that rejects changes to the privilege columns
-- (role, status, workspace_id) unless the connection is the service role. The
-- server uses the service-role key for all legitimate admin role changes and is
-- unaffected; browser/anon/authenticated sessions can no longer alter them.
--
-- Safe to re-run: function is CREATE OR REPLACE, trigger is dropped first.

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The service role (server-side, behind requireAuth + isAdmin checks) is allowed
  -- to change privilege columns. Everyone else is frozen at their current values.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not permitted';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Changing status is not permitted';
  END IF;

  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'Changing workspace is not permitted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_change ON public.profiles;

CREATE TRIGGER trg_prevent_profile_privilege_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_change();

COMMENT ON FUNCTION public.prevent_profile_privilege_change() IS
  'Blocks non-service-role sessions from changing profiles.role/status/workspace_id. Closes the browser self-escalation path.';
