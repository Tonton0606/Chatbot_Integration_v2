-- ============================================================
-- Migration 022: Facebook Observer — Loop Engine OBSERVE source
-- Buffers webhook events + ad metric snapshots for the loop
-- ============================================================

-- ── facebook_events ──────────────────────────────────────────────────────────
-- Webhook event buffer: every incoming FB event lands here first
-- The Loop Engine's OBSERVE stage reads from this table

CREATE TABLE IF NOT EXISTS facebook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID,
  page_id         TEXT,
  event_type      TEXT NOT NULL,   -- 'message','lead','ad_event','page_event','feed'
  sender_id       TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_events_workspace    ON facebook_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_events_page         ON facebook_events(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_events_type         ON facebook_events(event_type, processed);
CREATE INDEX IF NOT EXISTS idx_fb_events_unprocessed  ON facebook_events(processed, created_at);

-- ── facebook_ad_snapshots ────────────────────────────────────────────────────
-- Stores campaign/ad set metric pulls from Meta Ads API per loop tick

CREATE TABLE IF NOT EXISTS facebook_ad_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID,
  page_id         TEXT,
  ad_account_id   TEXT,
  campaign_id     TEXT,
  campaign_name   TEXT,
  ad_set_id       TEXT,
  ad_set_name     TEXT,
  date_start      DATE,
  date_stop       DATE,
  impressions     INTEGER DEFAULT 0,
  reach           INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  spend           NUMERIC DEFAULT 0,
  leads           INTEGER DEFAULT 0,
  purchases       INTEGER DEFAULT 0,
  purchase_value  NUMERIC DEFAULT 0,
  ctr             NUMERIC DEFAULT 0,   -- click-through rate %
  cpc             NUMERIC DEFAULT 0,   -- cost per click
  cpm             NUMERIC DEFAULT 0,   -- cost per 1000 impressions
  cpp             NUMERIC DEFAULT 0,   -- cost per purchase
  roas            NUMERIC DEFAULT 0,   -- return on ad spend
  cost_per_lead   NUMERIC DEFAULT 0,
  raw_payload     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_ad_snapshots_workspace ON facebook_ad_snapshots(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_ad_snapshots_campaign  ON facebook_ad_snapshots(campaign_id, date_start DESC);
CREATE INDEX IF NOT EXISTS idx_fb_ad_snapshots_roas      ON facebook_ad_snapshots(workspace_id, roas);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE facebook_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['facebook_events','facebook_ad_snapshots'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_only') THEN
      EXECUTE format('CREATE POLICY service_role_only ON %I USING (auth.role() = ''service_role'')', t);
    END IF;
  END LOOP;
END $$;

-- ── Auto-purge old processed events (keep 30 days) ───────────────────────────

CREATE OR REPLACE FUNCTION purge_old_facebook_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM facebook_events
  WHERE processed = TRUE AND created_at < now() - INTERVAL '30 days';

  DELETE FROM facebook_ad_snapshots
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

COMMENT ON TABLE facebook_events       IS 'Webhook event buffer for Loop Engine OBSERVE stage';
COMMENT ON TABLE facebook_ad_snapshots IS 'Meta Ads API metric snapshots per loop tick';
