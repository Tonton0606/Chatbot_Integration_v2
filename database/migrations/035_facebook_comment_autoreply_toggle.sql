-- ═══════════════════════════════════════════════════════════════════════════
-- 035 — Facebook comment autoreply toggle and webhook monitoring
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add comment autoreply toggle to client_facebook_page_settings ─────────
ALTER TABLE client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS comment_autoreply_enabled BOOLEAN DEFAULT TRUE;

-- ── 2. Add comment autoreply toggle to fb_pages for admin control ───────────
ALTER TABLE fb_pages
  ADD COLUMN IF NOT EXISTS comment_autoreply_enabled BOOLEAN DEFAULT TRUE;

-- ── 3. Create webhook event monitoring table ───────────────────────────────
CREATE TABLE IF NOT EXISTS facebook_webhook_monitoring (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID,
  page_id         TEXT,
  event_type      TEXT        NOT NULL,
  status          TEXT        NOT NULL,  -- 'success', 'failure', 'rate_limited', 'signature_failed'
  error_message   TEXT,
  processing_time_ms INTEGER,
  payload_size    INTEGER,
  sender_id       TEXT,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_webhook_monitoring_workspace
  ON facebook_webhook_monitoring (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_webhook_monitoring_page
  ON facebook_webhook_monitoring (page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_webhook_monitoring_status
  ON facebook_webhook_monitoring (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_webhook_monitoring_event_type
  ON facebook_webhook_monitoring (event_type, created_at DESC);

ALTER TABLE facebook_webhook_monitoring ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_monitoring_select" ON facebook_webhook_monitoring;
CREATE POLICY "webhook_monitoring_select"
  ON facebook_webhook_monitoring FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "webhook_monitoring_insert" ON facebook_webhook_monitoring;
CREATE POLICY "webhook_monitoring_insert"
  ON facebook_webhook_monitoring FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 4. Create webhook alert configuration table ─────────────────────────────
CREATE TABLE IF NOT EXISTS facebook_webhook_alerts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID        NOT NULL,
  page_id         TEXT,
  alert_type      TEXT        NOT NULL,  -- 'signature_failure', 'rate_limit', 'high_error_rate', 'webhook_down'
  threshold       INTEGER,    -- e.g., error count threshold
  window_minutes  INTEGER     DEFAULT 5,  -- time window for threshold
  enabled         BOOLEAN     DEFAULT TRUE,
  notification_channels JSONB  DEFAULT '["email"]',  -- email, slack, etc.
  last_triggered_at TIMESTAMPTZ,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_webhook_alerts_workspace
  ON facebook_webhook_alerts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_fb_webhook_alerts_page
  ON facebook_webhook_alerts (page_id);

ALTER TABLE facebook_webhook_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_alerts_select" ON facebook_webhook_alerts;
CREATE POLICY "webhook_alerts_select"
  ON facebook_webhook_alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "webhook_alerts_insert" ON facebook_webhook_alerts;
CREATE POLICY "webhook_alerts_insert"
  ON facebook_webhook_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "webhook_alerts_update" ON facebook_webhook_alerts;
CREATE POLICY "webhook_alerts_update"
  ON facebook_webhook_alerts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ── 5. Create conversation analytics summary table ─────────────────────────
CREATE TABLE IF NOT EXISTS facebook_conversation_analytics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID        NOT NULL,
  page_id         TEXT        NOT NULL,
  date            DATE        NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  new_conversations INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  ai_messages INTEGER DEFAULT 0,
  human_messages INTEGER DEFAULT 0,
  avg_response_time_seconds NUMERIC,
  leads_generated INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  human_handoffs INTEGER DEFAULT 0,
  comment_replies INTEGER DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  top_intents JSONB DEFAULT '{}',
  top_lead_stages JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, page_id, date)
);

CREATE INDEX IF NOT EXISTS idx_fb_conversation_analytics_workspace
  ON facebook_conversation_analytics (workspace_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fb_conversation_analytics_page
  ON facebook_conversation_analytics (page_id, date DESC);

ALTER TABLE facebook_conversation_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_analytics_select" ON facebook_conversation_analytics;
CREATE POLICY "conversation_analytics_select"
  ON facebook_conversation_analytics FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "conversation_analytics_insert" ON facebook_conversation_analytics;
CREATE POLICY "conversation_analytics_insert"
  ON facebook_conversation_analytics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "conversation_analytics_update" ON facebook_conversation_analytics;
CREATE POLICY "conversation_analytics_update"
  ON facebook_conversation_analytics FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ── 6. Add webhook IP allowlist configuration ─────────────────────────────
CREATE TABLE IF NOT EXISTS facebook_webhook_ip_allowlist (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID        NOT NULL,
  ip_address      TEXT        NOT NULL,  -- CIDR notation: 192.168.1.0/24
  description     TEXT,
  enabled         BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_webhook_ip_allowlist_workspace
  ON facebook_webhook_ip_allowlist (workspace_id);

ALTER TABLE facebook_webhook_ip_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_ip_allowlist_select" ON facebook_webhook_ip_allowlist;
CREATE POLICY "webhook_ip_allowlist_select"
  ON facebook_webhook_ip_allowlist FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "webhook_ip_allowlist_insert" ON facebook_webhook_ip_allowlist;
CREATE POLICY "webhook_ip_allowlist_insert"
  ON facebook_webhook_ip_allowlist FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "webhook_ip_allowlist_delete" ON facebook_webhook_ip_allowlist;
CREATE POLICY "webhook_ip_allowlist_delete"
  ON facebook_webhook_ip_allowlist FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ── 7. Add webhook payload size limit configuration ─────────────────────────
ALTER TABLE client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS max_webhook_payload_size_kb INTEGER DEFAULT 1024;  -- 1MB default

ALTER TABLE fb_pages
  ADD COLUMN IF NOT EXISTS max_webhook_payload_size_kb INTEGER DEFAULT 1024;

-- ── 8. Add media attachment support configuration ───────────────────────────
ALTER TABLE client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS media_autoreply_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS media_autoreply_message TEXT DEFAULT 'Thanks for the media! How can I help you?';

ALTER TABLE fb_pages
  ADD COLUMN IF NOT EXISTS media_autoreply_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS media_autoreply_message TEXT DEFAULT 'Thanks for the media! How can I help you?';

-- ── 9. Add updated_at trigger for analytics table ─────────────────────────
CREATE OR REPLACE FUNCTION update_facebook_conversation_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fb_conversation_analytics_updated_at
  ON facebook_conversation_analytics;

CREATE TRIGGER trigger_update_fb_conversation_analytics_updated_at
  BEFORE UPDATE ON facebook_conversation_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_conversation_analytics_updated_at();

-- ── 10. Add updated_at trigger for alerts table ─────────────────────────────
DROP TRIGGER IF EXISTS trigger_update_fb_webhook_alerts_updated_at
  ON facebook_webhook_alerts;

CREATE TRIGGER trigger_update_fb_webhook_alerts_updated_at
  BEFORE UPDATE ON facebook_webhook_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_conversation_analytics_updated_at();

-- ── 11. Comments for documentation ───────────────────────────────────────────
COMMENT ON COLUMN client_facebook_page_settings.comment_autoreply_enabled IS 'Enable/disable automatic replies to Facebook comments';
COMMENT ON COLUMN fb_pages.comment_autoreply_enabled IS 'Admin-level control for comment autoreply';
COMMENT ON TABLE facebook_webhook_monitoring IS 'Monitor webhook events for debugging and alerting';
COMMENT ON TABLE facebook_webhook_alerts IS 'Configure alert thresholds for webhook failures';
COMMENT ON TABLE facebook_conversation_analytics IS 'Daily aggregated conversation metrics';
COMMENT ON TABLE facebook_webhook_ip_allowlist IS 'Allowed IP ranges for webhook source verification';
COMMENT ON COLUMN client_facebook_page_settings.max_webhook_payload_size_kb IS 'Maximum webhook payload size in KB';
COMMENT ON COLUMN client_facebook_page_settings.media_autoreply_enabled IS 'Enable/disable automatic replies to media attachments';
