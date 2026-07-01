-- Migration 042: Schedule security table cleanup via pg_cron
--
-- The purge_expired_security_rows() function was defined in migration 018
-- (018_security_hardening.sql). This migration activates a nightly cron job
-- to call it, preventing revoked_tokens and login_otp_challenges from
-- accumulating indefinitely.
--
-- Prereqs:
--   - pg_cron extension enabled in the Supabase project
--     (Dashboard → Database → Extensions → pg_cron)
--   - migration 018_security_hardening.sql already applied
--
-- Safe to re-run: cron.schedule uses upsert semantics on the job name,
-- so a duplicate run updates the schedule rather than creating a duplicate job.

DO $$
BEGIN
  -- Only schedule if pg_cron is available; skip silently otherwise.
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'purge-security-tables',      -- job name (unique key)
      '0 3 * * *',                  -- daily at 03:00 UTC
      $cron$SELECT purge_expired_security_rows()$cron$
    );
    RAISE NOTICE 'pg_cron job "purge-security-tables" scheduled (daily 03:00 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping security cleanup schedule. Enable the extension in Supabase Dashboard → Database → Extensions.';
  END IF;
END$$;
