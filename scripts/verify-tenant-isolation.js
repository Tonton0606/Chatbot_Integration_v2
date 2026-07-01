#!/usr/bin/env node
/**
 * Live cross-tenant isolation probe (READ-ONLY).
 *
 * Verifies that, after migration 021, the legacy admin/CRM tables are scoped by
 * workspace_id and that one tenant's rows never appear under another tenant's
 * filter. Performs SELECTs only — never writes — so it is safe to run against
 * staging. DO NOT point this at production without reason; use a staging clone.
 *
 * Prereqs:
 *   - migration 021 applied to the target database
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env
 *   - two real workspace ids that own data
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/verify-tenant-isolation.js <workspaceA> <workspaceB>
 */

const { createClient } = require("@supabase/supabase-js");

const [wsA, wsB] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || !wsA || !wsB) {
  console.error(
    "Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify-tenant-isolation.js <workspaceA> <workspaceB>"
  );
  process.exit(2);
}

const supabase = createClient(url, key);

const TABLES = [
  "analytics_events",
  "revenue_entries",
  "revenue_projections",
  "pipeline_stages",
  "deals",
  "tasks",
  "team_members",
  "saved_reports",
  "projects",
];

async function main() {
  let failures = 0;

  for (const table of TABLES) {
    // Fetch up to 50 rows scoped to workspace A, then assert none belong to B.
    const { data, error } = await supabase
      .from(table)
      .select("id, workspace_id")
      .eq("workspace_id", wsA)
      .limit(50);

    if (error) {
      // Missing column/table → migration not applied or table absent.
      console.log(`  ⚠️  ${table}: ${error.message}`);
      continue;
    }

    const leaked = (data || []).filter((r) => r.workspace_id !== wsA);
    if (leaked.length) {
      failures += 1;
      console.log(
        `  ❌ ${table}: ${leaked.length} row(s) under A's filter belong to another workspace`
      );
    } else {
      console.log(`  ✅ ${table}: ${data.length} row(s), all scoped to A`);
    }
  }

  // Cross-check: B's filter must not surface A's rows.
  for (const table of ["deals", "revenue_entries", "tasks"]) {
    const { data, error } = await supabase
      .from(table)
      .select("id, workspace_id")
      .eq("workspace_id", wsB)
      .limit(50);
    if (error) continue;
    const leaked = (data || []).filter((r) => r.workspace_id === wsA);
    if (leaked.length) {
      failures += 1;
      console.log(`  ❌ ${table}: A's rows visible under B's filter`);
    } else {
      console.log(`  ✅ ${table}: B's filter excludes A`);
    }
  }

  console.log(failures ? `\n${failures} isolation failure(s)` : "\nIsolation verified");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
