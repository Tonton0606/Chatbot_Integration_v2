-- Migration 016: CRM Pipeline — crm_stages and crm_opportunities tables
-- Required by: sales_crm service, AdminPredictive, AI autoAIEngine

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pipeline stages (Kanban columns)
CREATE TABLE IF NOT EXISTS public.crm_stages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,               -- machine key: 'new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
  name         TEXT NOT NULL,               -- display name: 'New Lead', 'Qualified', etc.
  sort_order   INTEGER NOT NULL DEFAULT 0,
  probability  INTEGER NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  color        TEXT,
  is_won       BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, key)
);

-- CRM opportunities / deals
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id         UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  contact_id           UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage_id             UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  assigned_to          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_revenue     NUMERIC(15,2) DEFAULT 0,
  probability          INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','stalled')),
  source               TEXT DEFAULT 'manual',
  description          TEXT,
  expected_close_date  DATE,
  actual_close_date    DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_stages_workspace ON public.crm_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_workspace ON public.crm_opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON public.crm_opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_contact ON public.crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_status ON public.crm_opportunities(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_stages_updated_at ON public.crm_stages;
CREATE TRIGGER trg_crm_stages_updated_at
  BEFORE UPDATE ON public.crm_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crm_opportunities_updated_at ON public.crm_opportunities;
CREATE TRIGGER trg_crm_opportunities_updated_at
  BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_access_crm_stages" ON public.crm_stages;
CREATE POLICY "workspace_access_crm_stages" ON public.crm_stages
  USING (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "workspace_access_crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "workspace_access_crm_opportunities" ON public.crm_opportunities
  USING (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Seed default stages per workspace (run once per workspace on first use)
-- Applications should call this function after workspace creation:
-- SELECT seed_default_crm_stages('<workspace_id>');
CREATE OR REPLACE FUNCTION public.seed_default_crm_stages(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.crm_stages (workspace_id, key, name, sort_order, probability, color, is_won, is_lost)
  VALUES
    (p_workspace_id, 'new',          'New Lead',     0,  10,  '#6B7280', FALSE, FALSE),
    (p_workspace_id, 'qualified',    'Qualified',    1,  25,  '#3B82F6', FALSE, FALSE),
    (p_workspace_id, 'proposal',     'Proposal',     2,  50,  '#F59E0B', FALSE, FALSE),
    (p_workspace_id, 'negotiation',  'Negotiation',  3,  75,  '#8B5CF6', FALSE, FALSE),
    (p_workspace_id, 'won',          'Won',          4,  100, '#10B981', TRUE,  FALSE),
    (p_workspace_id, 'lost',         'Lost',         5,  0,   '#EF4444', FALSE, TRUE)
  ON CONFLICT (workspace_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
