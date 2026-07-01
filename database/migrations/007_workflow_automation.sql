-- ============================================================
-- 007_workflow_automation.sql — Workflow Automation System
-- Trigger → Action rules for automating business processes
-- ============================================================

-- ── Workflow Rules ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Trigger definition
  trigger_module VARCHAR(50) NOT NULL,  -- 'invoicing', 'bookings', 'deals', 'contacts', 'tasks'
  trigger_event VARCHAR(50) NOT NULL,   -- 'created', 'updated', 'status_changed', 'overdue', 'paid'
  trigger_conditions JSONB DEFAULT '{}', -- filter conditions: { "field": "status", "op": "eq", "value": "overdue" }
  
  -- Action definition
  action_type VARCHAR(50) NOT NULL,     -- 'send_email', 'send_notification', 'update_record', 'create_task', 'webhook'
  action_config JSONB NOT NULL,         -- action-specific config
  
  -- Execution tracking
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  last_error TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflow Execution Log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  trigger_event VARCHAR(100) NOT NULL,
  trigger_record_id UUID,
  trigger_data JSONB DEFAULT '{}',
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  result JSONB DEFAULT '{}',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workflow_rules_workspace ON workflow_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger ON workflow_rules(trigger_module, trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_active ON workflow_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_rule ON workflow_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace ON workflow_executions(workspace_id);

-- ── RLS Policies ────────────────────────────────────────────
-- auth.uid() returns NULL for unauthenticated callers; comparing UUID columns
-- directly against auth.uid() is safe. Membership is verified through profiles.
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow rules for their workspace"
  ON workflow_rules FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflow rules for their workspace"
  ON workflow_rules FOR ALL
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

CREATE POLICY "Users can view workflow executions for their workspace"
  ON workflow_executions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert workflow executions"
  ON workflow_executions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── Seed: Default workflow templates ────────────────────────
-- These are templates; actual rules are created per workspace
COMMENT ON TABLE workflow_rules IS 'Automation rules: trigger → action pipeline for business processes';
COMMENT ON TABLE workflow_executions IS 'Audit log of all workflow rule executions';