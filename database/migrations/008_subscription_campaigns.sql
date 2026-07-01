-- ============================================================
-- 008_subscription_campaigns.sql — Subscription + Campaign Tables
-- ============================================================

-- ── Workspace Subscription ──────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  plan VARCHAR(50) DEFAULT 'free',  -- 'free', 'starter', 'professional', 'enterprise'
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'past_due', 'cancelled', 'trialing'
  
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage subscriptions for their workspace"
  ON workspace_subscriptions FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── Email Campaigns ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  from_name VARCHAR(100) DEFAULT 'Exponify',
  
  status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  recipient_list JSONB DEFAULT '[]',  -- [{email, first_name, last_name}]
  segment_ids JSONB DEFAULT '[]',
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_log JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage campaigns for their workspace"
  ON email_campaigns FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── Email Events (opens, clicks, bounces) ───────────────────
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  
  event VARCHAR(20) NOT NULL,  -- 'open', 'click', 'bounce', 'unsubscribe'
  email VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);

-- ── Email Unsubscribes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email VARCHAR(255) PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflow Notifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  trigger_event VARCHAR(100),
  trigger_module VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage notifications for their workspace"
  ON workflow_notifications FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_workspace ON email_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_workspace ON workflow_notifications(workspace_id);