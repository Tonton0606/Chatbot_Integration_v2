/**
 * Tenant-scoping helpers for the legacy single-tenant admin tables
 * (analytics_events, revenue_entries, deals, tasks, team_members, ...).
 *
 * Background: the server uses the Supabase service-role key, which BYPASSES
 * Row Level Security. So multi-tenant isolation for these routes is enforced
 * here, in application code, by filtering every query on workspace_id.
 *
 * Isolation contract:
 *   - Platform admin (req.isAdmin) with NO workspace selected → unscoped /
 *     platform-wide. Preserves the original single-tenant owner dashboard.
 *   - Any request WITH a workspace context → scoped to that workspace.
 *   - Non-admin with NO workspace context → blocked fail-closed (400) by
 *     requireWorkspace, so a missing filter can never silently leak global data.
 *
 * requireAuth (middleware/auth.js) has already validated that req.workspaceId,
 * when present, is a workspace the user is actually a member of. These helpers
 * only apply the filter; they trust that prior membership check.
 */

function resolveWorkspaceId(req) {
  return req && req.workspaceId ? req.workspaceId : null;
}

/**
 * Fail-closed workspace gate. Mount on routes that read tenant-owned data.
 * Admins may proceed without a workspace (platform-wide view); everyone else
 * must supply a workspace (x-workspace-id header / workspaceId param).
 */
function requireWorkspace(req, res, next) {
  if (req.isAdmin) return next();
  if (resolveWorkspaceId(req)) return next();

  return res.status(400).json({
    success: false,
    error:
      "Workspace context required. Send the x-workspace-id header for this request.",
    path: req.originalUrl,
  });
}

/**
 * Apply the tenant filter to a Supabase select/update/delete query builder.
 * No-ops (platform-wide) only when there is no workspace context — which, by
 * requireWorkspace, can only happen for an admin.
 *
 *   let q = scopeQuery(supabase.from("revenue_entries").select("*"), req);
 */
function scopeQuery(query, req) {
  const wsId = resolveWorkspaceId(req);
  return wsId ? query.eq("workspace_id", wsId) : query;
}

/**
 * Stamp an insert payload with the current workspace so new rows are owned by
 * the right tenant. Accepts a single row object or an array of rows.
 */
function tenantStamp(req, row) {
  const wsId = resolveWorkspaceId(req);
  if (!wsId) return row;

  if (Array.isArray(row)) {
    return row.map((r) => ({ ...r, workspace_id: wsId }));
  }

  return { ...row, workspace_id: wsId };
}

module.exports = {
  requireWorkspace,
  resolveWorkspaceId,
  scopeQuery,
  tenantStamp,
};
