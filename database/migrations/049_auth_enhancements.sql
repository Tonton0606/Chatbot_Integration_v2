-- ============================================================
-- Migration 049: Auth Enhancements
-- • trusted_devices  — device trust system (skip OTP for trusted devices)
-- • login_magic_links — magic link tokens for passwordless login
-- ============================================================

-- ── trusted_devices ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trusted_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash   TEXT NOT NULL,           -- SHA-256 of user-agent + IP subnet
  device_label  TEXT,                    -- human-readable label (browser/OS)
  expires_at    TIMESTAMPTZ NOT NULL,     -- 30-day trust period
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user       ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_hash       ON trusted_devices(device_hash);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires    ON trusted_devices(expires_at);

ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trusted_devices' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY service_role_only ON trusted_devices
      USING (auth.role() = 'service_role');
  END IF;
END$$;

-- ── login_magic_links ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_magic_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,     -- SHA-256 of the raw token
  expires_at    TIMESTAMPTZ NOT NULL,      -- 15-minute expiry
  used_at       TIMESTAMPTZ,
  client_ip     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_user    ON login_magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_hash    ON login_magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON login_magic_links(expires_at);

ALTER TABLE login_magic_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'login_magic_links' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY service_role_only ON login_magic_links
      USING (auth.role() = 'service_role');
  END IF;
END$$;

-- ── Extend purge function ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION purge_expired_auth_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM login_otp_challenges WHERE expires_at < now() - INTERVAL '1 hour';
  DELETE FROM revoked_tokens        WHERE expires_at < now();
  DELETE FROM trusted_devices       WHERE expires_at < now();
  DELETE FROM login_magic_links     WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;

COMMENT ON TABLE trusted_devices    IS 'Trusted devices for 30-day OTP skip. Hashed device fingerprint.';
COMMENT ON TABLE login_magic_links  IS 'Magic link tokens for passwordless login. Hashed with SHA-256.';
