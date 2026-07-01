-- Social Media Ads campaign planning and performance tracking.

CREATE TABLE IF NOT EXISTS public.social_media_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  objective TEXT NOT NULL DEFAULT 'brand_awareness',
  campaign_type TEXT NOT NULL DEFAULT 'standard',
  product_service_name TEXT,
  destination_type TEXT NOT NULL DEFAULT 'website_page',
  destination_url TEXT,
  page_name TEXT,
  headline TEXT,
  primary_text TEXT,
  description TEXT,
  call_to_action TEXT NOT NULL DEFAULT 'learn_more',
  image_url TEXT,
  audience_locations TEXT[] NOT NULL DEFAULT '{}',
  audience_age_min INTEGER NOT NULL DEFAULT 18 CHECK (audience_age_min BETWEEN 13 AND 65),
  audience_age_max INTEGER NOT NULL DEFAULT 65 CHECK (audience_age_max BETWEEN 13 AND 65),
  audience_gender TEXT NOT NULL DEFAULT 'all' CHECK (audience_gender IN ('all', 'male', 'female')),
  audience_interests TEXT[] NOT NULL DEFAULT '{}',
  customer_type TEXT,
  language TEXT NOT NULL DEFAULT 'all',
  audience_notes TEXT,
  daily_budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (daily_budget >= 0),
  total_budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_budget >= 0),
  budget_type TEXT NOT NULL DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime')),
  bid_strategy TEXT NOT NULL DEFAULT 'lowest_cost',
  schedule_type TEXT NOT NULL DEFAULT 'continuous',
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'ready_to_publish',
    'active', 'paused', 'completed', 'archived', 'failed', 'needs_connection'
  )),
  approval_status TEXT NOT NULL DEFAULT 'not_submitted',
  rejection_reason TEXT,
  internal_notes TEXT,
  ai_suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
  publication_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  activity_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_clicks BIGINT NOT NULL DEFAULT 0,
  metrics_impressions BIGINT NOT NULL DEFAULT 0,
  metrics_reach BIGINT NOT NULL DEFAULT 0,
  metrics_messages BIGINT NOT NULL DEFAULT 0,
  metrics_leads BIGINT NOT NULL DEFAULT 0,
  metrics_bookings BIGINT NOT NULL DEFAULT 0,
  metrics_conversions BIGINT NOT NULL DEFAULT 0,
  metrics_spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_ads_valid_age_range CHECK (audience_age_min <= audience_age_max),
  CONSTRAINT social_ads_valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.social_media_ad_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.social_media_ad_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  messages BIGINT NOT NULL DEFAULT 0,
  leads BIGINT NOT NULL DEFAULT 0,
  bookings BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_social_ads_workspace_status
  ON public.social_media_ad_campaigns(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_ads_workspace_platforms
  ON public.social_media_ad_campaigns USING GIN(platforms);
CREATE INDEX IF NOT EXISTS idx_social_ads_metrics_workspace_date
  ON public.social_media_ad_daily_metrics(workspace_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_social_ads_metrics_campaign_date
  ON public.social_media_ad_daily_metrics(campaign_id, metric_date DESC);

ALTER TABLE public.social_media_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_ad_daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_media_ads_workspace_isolation ON public.social_media_ad_campaigns;
CREATE POLICY social_media_ads_workspace_isolation
  ON public.social_media_ad_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_media_ad_campaigns.workspace_id
        AND wm.user_id = auth.uid()
        AND COALESCE(wm.status, 'active') NOT IN ('removed', 'archived', 'inactive', 'disabled')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_media_ad_campaigns.workspace_id
        AND wm.user_id = auth.uid()
        AND COALESCE(wm.status, 'active') NOT IN ('removed', 'archived', 'inactive', 'disabled')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS social_media_ads_metrics_workspace_isolation ON public.social_media_ad_daily_metrics;
CREATE POLICY social_media_ads_metrics_workspace_isolation
  ON public.social_media_ad_daily_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_media_ad_daily_metrics.workspace_id
        AND wm.user_id = auth.uid()
        AND COALESCE(wm.status, 'active') NOT IN ('removed', 'archived', 'inactive', 'disabled')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_media_ad_daily_metrics.workspace_id
        AND wm.user_id = auth.uid()
        AND COALESCE(wm.status, 'active') NOT IN ('removed', 'archived', 'inactive', 'disabled')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-ad-creatives', 'social-ad-creatives', true, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  SELECT id INTO v_division_id FROM public.erp_divisions
  WHERE division_key = 'marketing' OR LOWER(title) = 'marketing' LIMIT 1;

  IF v_division_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.erp_features WHERE feature_key = 'social_media_ads'
    ) INTO v_feature_exists;

    IF v_feature_exists THEN
      UPDATE public.erp_features SET
        division_id = v_division_id,
        label = 'Social Media Ads',
        icon = 'Megaphone',
        description = 'Create, approve, schedule, and track social media ad campaigns.',
        admin_route = '/Admin/SocialMediaAds',
        client_route = '/Client/SocialMediaAds',
        admin_visible = true,
        client_visible = true,
        status = 'active',
        auto_enable_with_division = true,
        order_index = 18
      WHERE feature_key = 'social_media_ads';
    ELSE
      INSERT INTO public.erp_features (
        division_id, feature_key, label, icon, description,
        admin_route, client_route, admin_visible, client_visible,
        status, auto_enable_with_division, order_index
      ) VALUES (
        v_division_id, 'social_media_ads', 'Social Media Ads', 'Megaphone',
        'Create, approve, schedule, and track social media ad campaigns.',
        '/Admin/SocialMediaAds', '/Client/SocialMediaAds', true, true,
        'active', true, 18
      );
    END IF;

    INSERT INTO public.workspace_feature_access (workspace_id, feature_key, is_enabled)
    SELECT w.id, 'social_media_ads', true FROM public.workspaces w
    ON CONFLICT (workspace_id, feature_key) DO NOTHING;
  END IF;
END $$;
