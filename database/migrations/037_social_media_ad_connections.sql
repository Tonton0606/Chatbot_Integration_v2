-- Stores publishing connections used by the Social Media Ads module.

CREATE TABLE IF NOT EXISTS public.social_media_ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'needs_review',
  facebook_page_id TEXT,
  facebook_page_name TEXT,
  ad_account_id TEXT,
  ad_account_name TEXT,
  external_business_id TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_ad_connections_platform_check CHECK (
    platform IN ('facebook', 'instagram', 'messenger', 'tiktok', 'shopee', 'lazada', 'website')
  ),
  CONSTRAINT social_ad_connections_status_check CHECK (
    status IN ('connected', 'needs_token', 'needs_review', 'not_connected', 'coming_soon', 'disabled')
  ),
  UNIQUE (workspace_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_ad_connections_workspace
  ON public.social_media_ad_connections(workspace_id, platform);

ALTER TABLE public.social_media_ad_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_media_ad_connections_workspace_isolation
  ON public.social_media_ad_connections;

CREATE POLICY social_media_ad_connections_workspace_isolation
  ON public.social_media_ad_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_media_ad_connections.workspace_id
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
      WHERE wm.workspace_id = social_media_ad_connections.workspace_id
        AND wm.user_id = auth.uid()
        AND COALESCE(wm.status, 'active') NOT IN ('removed', 'archived', 'inactive', 'disabled')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );
