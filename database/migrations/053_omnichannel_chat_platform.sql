-- Migration 053: Omni-Channel Chat Platform
--
-- Extends the existing Facebook-only conversation system to support
-- Instagram, TikTok, Shopee, and Lazada — the top 5 channels used by
-- Filipino SMBs for customer communication.
--
-- Design:
--   1. `omnichannel_conversations` — unified conversation table across all channels
--   2. `omnichannel_messages` — unified message store
--   3. `omnichannel_channel_configs` — per-workspace, per-channel configuration
--   4. `omnichannel_follow_ups` — cross-channel 24h re-engagement tracking
--
-- The existing `client_facebook_conversations` and `client_facebook_messages`
-- tables remain untouched — Facebook data continues to flow through them.
-- The new tables are for non-Facebook channels. A future migration may
-- consolidate them into a single unified view.
--
-- Safe to run repeatedly: every statement is guarded.

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 1: Omni-Channel Conversations
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.omnichannel_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Channel identity
  channel         TEXT NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'shopee', 'lazada')),
  page_id         TEXT NOT NULL,          -- platform-specific account/shop ID
  page_name       TEXT DEFAULT '',
  customer_id     TEXT NOT NULL,          -- platform-specific user ID (PSID, IG ID, etc.)
  customer_name   TEXT DEFAULT '',
  customer_avatar TEXT DEFAULT '',

  -- Conversation state
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'human_handoff', 'resolved', 'closed')),
  bot_paused      BOOLEAN NOT NULL DEFAULT false,
  needs_human     BOOLEAN NOT NULL DEFAULT false,

  -- Sales flow state (reuses the same flow stages as Facebook)
  current_state   TEXT DEFAULT 'new',
  lead_stage      TEXT DEFAULT 'new',
  intent          TEXT DEFAULT '',
  intent_confidence REAL DEFAULT 0,
  lead_score      INT DEFAULT 0,
  lead_priority   TEXT DEFAULT 'new' CHECK (lead_priority IN ('new', 'cold', 'warm', 'hot')),

  -- Follow-up tracking
  follow_up_wave  INT DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,

  -- Ad attribution
  ad_id           TEXT DEFAULT '',
  adset_id        TEXT DEFAULT '',
  campaign_id     TEXT DEFAULT '',
  ad_ref          TEXT DEFAULT '',
  ad_source       TEXT DEFAULT '',
  inquiry_source  TEXT DEFAULT '',

  -- Metadata
  last_message    TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_sender_type TEXT DEFAULT '' CHECK (last_sender_type IN ('', 'customer', 'bot', 'agent')),
  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, channel, page_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_conv_workspace
  ON public.omnichannel_conversations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_conv_channel_page
  ON public.omnichannel_conversations (channel, page_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_conv_customer
  ON public.omnichannel_conversations (customer_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_conv_status
  ON public.omnichannel_conversations (status);
CREATE INDEX IF NOT EXISTS idx_omnichannel_conv_follow_up
  ON public.omnichannel_conversations (last_sender_type, bot_paused, follow_up_wave, updated_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 2: Omni-Channel Messages
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.omnichannel_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.omnichannel_conversations(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  sender_type     TEXT NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent')),
  sender_name     TEXT DEFAULT '',
  message_text    TEXT DEFAULT '',
  message_type    TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'product', 'order', 'system')),
  image_url       TEXT DEFAULT '',
  media_type      TEXT DEFAULT '',
  platform_msg_id TEXT DEFAULT '',       -- message ID from the platform (for dedup)

  -- AI metadata
  ai_generated    BOOLEAN DEFAULT false,
  intent          TEXT DEFAULT '',
  reply_source    TEXT DEFAULT '',       -- 'sales_flow', 'knowledge', 'fallback', etc.

  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_msg_conv
  ON public.omnichannel_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_omnichannel_msg_workspace
  ON public.omnichannel_messages (workspace_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_msg_platform_id
  ON public.omnichannel_messages (platform_msg_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 3: Channel Configurations (per workspace, per channel)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.omnichannel_channel_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  channel         TEXT NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'shopee', 'lazada')),
  page_id         TEXT NOT NULL,          -- IG business ID, TikTok business ID, Shopee shop ID, Lazada seller ID
  page_name       TEXT DEFAULT '',

  -- Connection credentials (encrypted at rest by Supabase)
  access_token    TEXT DEFAULT '',
  token_expires_at TIMESTAMPTZ,
  refresh_token   TEXT DEFAULT '',

  -- Chatbot settings
  chatbot_enabled         BOOLEAN DEFAULT true,
  comment_autoreply_enabled BOOLEAN DEFAULT true,
  media_autoreply_enabled BOOLEAN DEFAULT true,
  media_autoreply_message TEXT DEFAULT '',

  -- Business context (same fields as Facebook page config)
  business_type           TEXT DEFAULT '',
  product_services        TEXT DEFAULT '',
  product_service_price_ranges TEXT DEFAULT '',
  website_link            TEXT DEFAULT '',
  knowledge               TEXT DEFAULT '',
  ai_instruction          TEXT DEFAULT '',

  -- Channel-specific settings
  -- Instagram: connected IG account ID
  -- TikTok: business ID, welcome message, suggested questions
  -- Shopee: shop ID, partner ID, partner key
  -- Lazada: seller ID, API key, country (PH)
  channel_settings        JSONB DEFAULT '{}',

  -- Access mode: 'enable' (bot active), 'disable' (bot off), 'human_only' (no bot)
  access_mode             TEXT DEFAULT 'enable' CHECK (access_mode IN ('enable', 'disable', 'human_only')),

  -- Verification (for webhook setup)
  verify_token            TEXT DEFAULT '',
  is_connected            BOOLEAN DEFAULT false,
  connected_at            TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, channel, page_id)
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_config_workspace
  ON public.omnichannel_channel_configs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_config_channel
  ON public.omnichannel_channel_configs (channel, page_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 4: Cross-Channel Follow-Up Tracking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.omnichannel_follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.omnichannel_conversations(id) ON DELETE CASCADE,

  channel         TEXT NOT NULL,
  wave            INT NOT NULL DEFAULT 1,    -- 1 = 24h, 2 = 48h, 3 = final
  template_name   TEXT DEFAULT '',
  message_text    TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at         TIMESTAMPTZ,
  error_message   TEXT DEFAULT '',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_fu_workspace
  ON public.omnichannel_follow_ups (workspace_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_fu_pending
  ON public.omnichannel_follow_ups (status, channel);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 5: RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
  tables_with_rls TEXT[] := ARRAY[
    'omnichannel_conversations',
    'omnichannel_messages',
    'omnichannel_channel_configs',
    'omnichannel_follow_ups'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_rls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl || '_workspace_isolation', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I
           USING (
             workspace_id IN (
               SELECT workspace_id FROM public.workspace_members
               WHERE user_id = auth.uid()
             )
           )',
        tbl || '_workspace_isolation', tbl
      );

      RAISE NOTICE 'RLS enabled and workspace isolation applied to %', tbl;
    END IF;
  END LOOP;
END $$;
