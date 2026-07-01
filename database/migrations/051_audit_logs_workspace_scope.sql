-- Migration 051: Scope audit_logs to a workspace (multi-tenant isolation fix)
-- Root cause: audit_logs (migration 002) was created before the workspace model
-- and has no workspace_id column. Its only RLS policy is the open
-- "Allow all operations for authenticated users", and the server queries it with
-- the service-role key (RLS bypassed) without any workspace filter. Result: any
-- authenticated user could read every tenant's audit trail.
--
-- Fix: add a nullable workspace_id, index it, replace the open policy with a
-- workspace-isolation policy. The server (routes/audit-logs.js) now scopes every
-- read with scopeQuery(req) and stamps every write with tenantStamp(req).
--
-- Backfill: existing rows carry no tenant marker and cannot be reliably
-- attributed, so they keep NULL workspace_id. scopeQuery filters them out for
-- workspace users; only platform admins (unscoped) see them. A later migration
-- may tighten workspace_id to NOT NULL once backfilled/purged.

ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id);

-- Replace the open policy with workspace-scoped isolation.
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.audit_logs;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation_audit_logs" ON public.audit_logs;
CREATE POLICY "workspace_isolation_audit_logs" ON public.audit_logs
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );
