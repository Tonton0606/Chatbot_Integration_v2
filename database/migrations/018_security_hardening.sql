-- ============================================================
-- Migration 018: Security Hardening
-- • login_otp_challenges  — OTP table with bcrypt hash, IP tracking, failure flag
-- • revoked_tokens        — token blacklist for session revocation
-- ============================================================

-- ── login_otp_challenges ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_otp_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  otp_hash     TEXT NOT NULL,          -- bcrypt hash (cost 10)
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  verified_at  TIMESTAMPTZ,
  consumed_at  TIMESTAMPTZ,
  failed       BOOLEAN NOT NULL DEFAULT FALSE,  -- true after any failed verify attempt
  client_ip    TEXT,                    -- for IP-based rate limiting
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lookup patterns
CREATE INDEX IF NOT EXISTS idx_otp_challenges_user_id  ON login_otp_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_ip_failed ON login_otp_challenges(client_ip, failed, created_at);

-- Auto-purge expired challenges (keep table lean)
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires  ON login_otp_challenges(expires_at);

-- RLS: only service role can read/write (server uses service key)
ALTER TABLE login_otp_challenges ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — access only via service role key on backend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'login_otp_challenges' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY service_role_only ON login_otp_challenges
      USING (auth.role() = 'service_role');
  END IF;
END$$;

-- ── revoked_tokens ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL UNIQUE,    -- SHA-256 of the raw JWT
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,    -- mirrors JWT exp — row auto-queryable
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash    ON revoked_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user    ON revoked_tokens(user_id);

ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'revoked_tokens' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY service_role_only ON revoked_tokens
      USING (auth.role() = 'service_role');
  END IF;
END$$;

-- ── Cleanup function: purge expired rows ────────────────────────────────────
-- Call this from a pg_cron job: SELECT cron.schedule('purge-security-tables', '0 3 * * *', $$SELECT purge_expired_security_rows()$$);

CREATE OR REPLACE FUNCTION purge_expired_security_rows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM login_otp_challenges WHERE expires_at < now() - INTERVAL '1 hour';
  DELETE FROM revoked_tokens        WHERE expires_at < now();
END;
$$;

COMMENT ON TABLE login_otp_challenges IS 'OTP challenges for 2FA login flow. Hashed with bcrypt. Includes IP tracking for rate limiting.';
COMMENT ON TABLE revoked_tokens       IS 'Blacklisted JWT tokens. Checked on every authenticated request. Rows expire with the token.';
