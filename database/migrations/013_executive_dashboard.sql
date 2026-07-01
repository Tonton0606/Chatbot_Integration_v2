-- Migration: Executive Dashboard data model
-- Adds tables for durable executive KPI snapshots, metric history, goals, system health, and activity feed.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.executive_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  pipeline_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  avg_deal_size NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  online_users INTEGER NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  active_deals INTEGER NOT NULL DEFAULT 0,
  new_leads INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(7,2) NOT NULL DEFAULT 0,
  churn_rate NUMERIC(7,2) NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_projects INTEGER NOT NULL DEFAULT 0,
  total_documents INTEGER NOT NULL DEFAULT 0,
  storage_used_mb NUMERIC(12,2) NOT NULL DEFAULT 0,
  system_load NUMERIC(7,2) NOT NULL DEFAULT 0,
  api_calls INTEGER NOT NULL DEFAULT 0,
  error_rate NUMERIC(7,2) NOT NULL DEFAULT 0,
  response_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.executive_metric_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  metric_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  metric_unit TEXT NOT NULL DEFAULT 'number' CHECK (metric_unit IN ('number', 'currency', 'percentage', 'milliseconds', 'megabytes')),
  division_key TEXT DEFAULT 'executive',
  source_table TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (metric_date, metric_key, division_key)
);

CREATE TABLE IF NOT EXISTS public.executive_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_key TEXT UNIQUE NOT NULL,
  target_label TEXT NOT NULL,
  target_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_unit TEXT NOT NULL DEFAULT 'number' CHECK (target_unit IN ('number', 'currency', 'percentage', 'milliseconds', 'megabytes')),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.executive_system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_key TEXT NOT NULL,
  service_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'degraded', 'offline', 'unknown')),
  uptime_percentage NUMERIC(7,2) NOT NULL DEFAULT 0,
  response_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (service_key)
);

CREATE TABLE IF NOT EXISTS public.executive_activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('booking', 'user', 'deal', 'system', 'project', 'document', 'lead')),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_table TEXT,
  related_id UUID,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS executive_kpi_snapshots_snapshot_date_idx
  ON public.executive_kpi_snapshots (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS executive_metric_history_metric_date_idx
  ON public.executive_metric_history (metric_date DESC, metric_key);

CREATE INDEX IF NOT EXISTS executive_activity_feed_occurred_at_idx
  ON public.executive_activity_feed (occurred_at DESC);

ALTER TABLE public.executive_kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_metric_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view executive kpi snapshots" ON public.executive_kpi_snapshots;
CREATE POLICY "Admins can view executive kpi snapshots" ON public.executive_kpi_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

DROP POLICY IF EXISTS "Admins can manage executive kpi snapshots" ON public.executive_kpi_snapshots;
CREATE POLICY "Admins can manage executive kpi snapshots" ON public.executive_kpi_snapshots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

DROP POLICY IF EXISTS "Admins can view executive metric history" ON public.executive_metric_history;
CREATE POLICY "Admins can view executive metric history" ON public.executive_metric_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

DROP POLICY IF EXISTS "Admins can manage executive metric history" ON public.executive_metric_history;
CREATE POLICY "Admins can manage executive metric history" ON public.executive_metric_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

DROP POLICY IF EXISTS "Admins can manage executive targets" ON public.executive_targets;
CREATE POLICY "Admins can manage executive targets" ON public.executive_targets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

DROP POLICY IF EXISTS "Admins can manage executive system health" ON public.executive_system_health;
CREATE POLICY "Admins can manage executive system health" ON public.executive_system_health
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

DROP POLICY IF EXISTS "Admins can manage executive activity feed" ON public.executive_activity_feed;
CREATE POLICY "Admins can manage executive activity feed" ON public.executive_activity_feed
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'SuperAdmin')));

INSERT INTO public.executive_targets (target_key, target_label, target_value, target_unit, period)
VALUES
  ('monthly_revenue', 'Monthly Revenue Target', 100000, 'currency', 'monthly'),
  ('conversion_rate', 'Conversion Rate Target', 15, 'percentage', 'monthly'),
  ('system_uptime', 'System Uptime Target', 99, 'percentage', 'monthly'),
  ('response_time', 'Response Time Target', 500, 'milliseconds', 'monthly')
ON CONFLICT (target_key) DO NOTHING;

INSERT INTO public.executive_system_health (service_key, service_label, status, uptime_percentage, response_time_ms)
VALUES
  ('database', 'Database', 'unknown', 0, 0),
  ('api', 'API Server', 'unknown', 0, 0),
  ('ai', 'AI Services', 'unknown', 0, 0)
ON CONFLICT (service_key) DO NOTHING;
