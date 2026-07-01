-- Intelligence Decision Engine
-- Config-driven modules, normalized snapshots, insights, predictions, and governed automations.

CREATE TABLE IF NOT EXISTS public.intelligence_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.intelligence_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('crm', 'marketing', 'meta_ads', 'google_ads', 'sales', 'orders', 'finance', 'external_api')),
  credentials_encrypted TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_strategy TEXT NOT NULL DEFAULT 'polling' CHECK (sync_strategy IN ('webhook', 'polling', 'manual')),
  sync_interval_seconds INTEGER NOT NULL DEFAULT 900 CHECK (sync_interval_seconds >= 60),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'archived')),
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intelligence_data_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.intelligence_modules(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC,
  dimension JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intelligence_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.intelligence_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('positive', 'info', 'warning', 'critical')),
  insight_type TEXT NOT NULL DEFAULT 'summary' CHECK (insight_type IN ('summary', 'trend', 'anomaly', 'recommendation', 'risk')),
  confidence NUMERIC NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intelligence_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.intelligence_modules(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  forecast_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  horizon_days INTEGER NOT NULL DEFAULT 30 CHECK (horizon_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intelligence_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.intelligence_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule JSONB NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intelligence_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.intelligence_automations(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.intelligence_modules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'approval_required', 'skipped', 'failed')),
  trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.intelligence_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_data_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intelligence_modules_workspace_isolation" ON public.intelligence_modules
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "intelligence_data_sources_workspace_isolation" ON public.intelligence_data_sources
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "intelligence_data_snapshots_workspace_isolation" ON public.intelligence_data_snapshots
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "intelligence_insights_workspace_isolation" ON public.intelligence_insights
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "intelligence_predictions_workspace_isolation" ON public.intelligence_predictions
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "intelligence_automations_workspace_isolation" ON public.intelligence_automations
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "intelligence_automation_runs_workspace_isolation" ON public.intelligence_automation_runs
  FOR ALL USING (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_intelligence_modules_workspace ON public.intelligence_modules(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_intelligence_data_sources_workspace ON public.intelligence_data_sources(workspace_id, type, status);
CREATE INDEX IF NOT EXISTS idx_intelligence_snapshots_metric ON public.intelligence_data_snapshots(workspace_id, metric_key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_workspace ON public.intelligence_insights(workspace_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_predictions_workspace ON public.intelligence_predictions(workspace_id, metric, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_automations_workspace ON public.intelligence_automations(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_intelligence_automation_runs_workspace ON public.intelligence_automation_runs(workspace_id, created_at DESC);
