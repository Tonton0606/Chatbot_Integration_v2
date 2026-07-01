-- Migration 032: Unified Leads Table
-- Normalizes leads from Facebook, Google Maps, web forms, and manual imports
-- into a single `leads` table with source tracking, scoring, and assignment.

CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source        text NOT NULL CHECK (source IN ('facebook', 'google_maps', 'web_form', 'manual', 'csv_import')),
  external_id   text,                              -- FB PSID, Google Maps place ID, etc.
  name          text,
  email         text,
  phone         text,
  company_name  text,
  score         int NOT NULL DEFAULT 0,             -- lead score (0-100)
  status        text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'archived')),
  assigned_to   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  raw_data      jsonb,                              -- original source payload
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_workspace   ON public.leads(workspace_id);
CREATE INDEX idx_leads_source      ON public.leads(source);
CREATE INDEX idx_leads_status      ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_score       ON public.leads(score);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.leads
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();