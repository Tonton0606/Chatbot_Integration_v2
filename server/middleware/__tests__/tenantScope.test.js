/**
 * Cross-tenant isolation regression test for the tenant-scope middleware.
 *
 * Guards the multi-tenant contract that protects the legacy admin/CRM routes
 * (analytics, revenue, reports, tasks) which use the RLS-bypassing service-role
 * key. If any assertion fails the test fails (CI fails).
 */

const {
  requireWorkspace,
  scopeQuery,
  tenantStamp,
  resolveWorkspaceId,
} = require("../tenantScope");

// Minimal Supabase query-builder stub that records .eq() filters.
function mockQuery() {
  const filters = {};
  const q = {
    _filters: filters,
    eq(col, val) {
      filters[col] = val;
      return q;
    },
    select() {
      return q;
    },
  };
  return q;
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
}

// ── requireWorkspace: fail-closed gate ───────────────────────────────────────
it("allows a tenant user that has workspace context", () => {
  let nexted = false;
  requireWorkspace({ isAdmin: false, workspaceId: "A" }, mockRes(), () => {
    nexted = true;
  });
  expect(nexted).toBe(true);
});

it("BLOCKS a non-admin with no workspace (no silent global read)", () => {
  const res = mockRes();
  let nexted = false;
  requireWorkspace({ isAdmin: false, workspaceId: null }, res, () => {
    nexted = true;
  });
  expect(nexted).toBe(false);
  expect(res.statusCode).toBe(400);
});

it("allows an admin with no workspace (platform-wide owner view)", () => {
  let nexted = false;
  requireWorkspace({ isAdmin: true, workspaceId: null }, mockRes(), () => {
    nexted = true;
  });
  expect(nexted).toBe(true);
});

// ── scopeQuery: the actual isolation ─────────────────────────────────────────
it("scopes tenant A reads to workspace_id = A", () => {
  const q = scopeQuery(mockQuery(), { workspaceId: "A" });
  expect(q._filters.workspace_id).toBe("A");
});

it("tenant A and tenant B never resolve to the same filter", () => {
  const a = scopeQuery(mockQuery(), { workspaceId: "A" });
  const b = scopeQuery(mockQuery(), { workspaceId: "B" });
  expect(a._filters.workspace_id).not.toBe(b._filters.workspace_id);
});

it("admin with no workspace stays unfiltered (platform-wide)", () => {
  const q = scopeQuery(mockQuery(), { isAdmin: true, workspaceId: null });
  expect(q._filters.workspace_id).toBeUndefined();
});

// ── tenantStamp: writes land in the right tenant ─────────────────────────────
it("stamps a single insert row with the workspace", () => {
  const row = tenantStamp({ workspaceId: "A" }, { amount: 100 });
  expect(row.workspace_id).toBe("A");
});

it("stamps every row of an array insert", () => {
  const rows = tenantStamp({ workspaceId: "B" }, [{ x: 1 }, { x: 2 }]);
  expect(rows.every((r) => r.workspace_id === "B")).toBe(true);
});

it("does not stamp when there is no workspace (admin)", () => {
  const row = tenantStamp({ isAdmin: true, workspaceId: null }, { x: 1 });
  expect(row.workspace_id).toBeUndefined();
});

// ── resolveWorkspaceId ───────────────────────────────────────────────────────
it("resolveWorkspaceId returns null when absent", () => {
  expect(resolveWorkspaceId({})).toBeNull();
});

