-- Migration 067: Workspace-specific Flow Sequence Triggers

CREATE TABLE IF NOT EXISTS public.client_facebook_sequence_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

ALTER TABLE public.client_facebook_sequence_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation_sequence_triggers" ON public.client_facebook_sequence_triggers
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_sequence_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sequence_triggers_updated_at_trigger
BEFORE UPDATE ON public.client_facebook_sequence_triggers
FOR EACH ROW EXECUTE FUNCTION update_sequence_triggers_updated_at();
