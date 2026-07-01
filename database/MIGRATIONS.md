# Database Migration Manifest

Canonical run order for all Hermes V2.2.1 migrations. Apply them in ascending
numeric order against the target Supabase project using the SQL Editor (or a
migration runner that processes files alphabetically).

Markers:
- **[SECURITY]** — must run before the server starts; auth or isolation depends on it
- **[BREAKING]** — alters existing table structure; requires data-backfill audit on non-empty databases
- **[PG_CRON]** — requires the `pg_cron` extension enabled in Supabase Dashboard

---

## Core Schema (001–017)

| File | Description |
|---|---|
| 001_hermes_v1_setup.sql | Initial schema — workspaces, profiles, base tables |
| 002_complete_admin_schema.sql | Admin workspace tables |
| 003_accounting_invoicing.sql | Accounting and invoicing module |
| 004_google_maps_leads.sql | Google Maps leads integration tables |
| 005_register_google_maps_leads_feature.sql | Feature flag registration for Maps leads |
| 006_ph_tax_compliance.sql | Philippine tax compliance fields |
| 007_workflow_automation.sql | Workflow automation engine tables |
| 008_subscription_campaigns.sql | Subscription and campaign tables |
| 010_fb_pages_profile_link.sql | Facebook pages ↔ workspace profile linkage |
| 011_missing_workspace_erp_tables.sql | ERP tables missing from earlier migrations |
| 012_user_presence.sql | Real-time user presence tracking |
| 013_executive_dashboard.sql | Executive KPI dashboard tables |
| 014_executive_dashboard_target_access.sql | Dashboard target/access controls |
| 015_add_demographics.sql | Demographics fields on profiles |
| 016_crm_stages_opportunities.sql | CRM pipeline stages and opportunities |
| 017_ai_chatbot_tester.sql | AI chatbot test session tables |

---

## Security & Isolation Layer (018–021) — **Run before server start**

| File | Description |
|---|---|
| 018_security_hardening.sql | **[SECURITY]** `login_otp_challenges` + `revoked_tokens` — required by `middleware/auth.js` token blacklist check and OTP login flow |
| 019_intelligence_decision_engine.sql | Intelligence/loop decision engine tables |
| 020_market_research_nav.sql | Market research navigation tables |
| 021_legacy_tables_workspace_isolation.sql | **[SECURITY] [BREAKING]** Adds `workspace_id` to 11 legacy tables, backfills rows to the oldest workspace, enables RLS as defense-in-depth. Run `scripts/verify-tenant-isolation.js` after applying. |

> **Production note for 021:** Before running on any database with existing rows,
> confirm all legacy tables are either empty or already have `workspace_id` values.
> The migration backfills NULLs to the oldest workspace — verify this is the correct
> owner for your historical data.

---

## Feature Modules (022–037)

| File | Description |
|---|---|
| 022_facebook_observer.sql | Facebook conversation observer tables |
| 023_intelligence_power_modules.sql | Intelligence analysis power modules |
| 024_intelligence_reports_table.sql | Intelligence report generation tables |
| 025_ph_intelligence_modules.sql | Philippine-specific intelligence modules |
| 026_je_number_sequence.sql | Journal entry number sequencing |
| 027_facebook_payments_delivery.sql | Facebook payments and delivery integration |
| 028_kpi_engine.sql | KPI calculation engine tables |
| 029_kpi_performance_summary.sql | KPI performance summary aggregates |
| 030_task_aging_notifications.sql | Task aging detection and notification tables |
| 031_commissions_and_deal_velocity.sql | Commission ledger and deal velocity tracking |
| 032_unified_leads.sql | Unified leads pipeline across channels |
| 033_deal_stage_history_trigger.sql | Trigger: records deal stage transitions |
| 034_kpi_threshold_alerts.sql | KPI threshold alerting tables |
| 035_facebook_comment_autoreply_toggle.sql | Per-page toggle for Facebook comment auto-reply (from the FB monitoring/hardening checkpoint) |
| 036_social_media_ads.sql | Social media ad campaigns module |
| 037_social_media_ad_connections.sql | Platform connection records for ad campaigns |

---

## Facebook Settings Extensions (038–041)

These migrations extend `client_facebook_page_settings` with chatbot configuration
columns. Originally numbered 018–021 in a parallel dev track; renumbered here to
avoid collision with the security layer.

| File | Description |
|---|---|
| 038_fb_page_settings_knowledge_base.sql | Adds `knowledge_base` column for AI FAQ authoring |
| 039_fb_page_settings_comment_automation.sql | Adds comment automation controls (enabled flag, reply template, keyword filter) |
| 040_facebook_business_logic_settings.sql | Adds JSONB columns for discovery mappings, behavioral weights, objection patterns |
| 041_loop_engine.sql | Loop Engine — OBSERVE → ANALYZE → DECIDE → ACT architecture tables |

---

## Operations (042+)

| File | Description |
|---|---|
| 042_schedule_security_cleanup.sql | **[PG_CRON]** Schedules `purge_expired_security_rows()` nightly at 03:00 UTC to prevent `revoked_tokens` / `login_otp_challenges` from growing unbounded |
| 043_profiles_privilege_lockdown.sql | **[SECURITY]** BEFORE UPDATE trigger blocking non-service-role sessions from changing `profiles.role/status/workspace_id`. Closes the browser self-escalation path (any user setting their own role to admin via the anon key) |

---

## Supabase-managed migrations

| File | Description |
|---|---|
| supabase/migrations/20260614_finance_accounting.sql | Finance and accounting schema managed via Supabase CLI |

---

## Applying migrations

```bash
# For each file in order, paste into Supabase Dashboard → SQL Editor → New Query
# Or use psql directly against your project's connection string:
for f in database/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DATABASE_URL" -f "$f"
done
```

After applying migration 021, run the isolation probe:

```bash
SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  node scripts/verify-tenant-isolation.js <workspaceA-id> <workspaceB-id>
```

---

## Known gaps & deployment notes

### Migration sequence is now contiguous (035 filled)
`035_facebook_comment_autoreply_toggle.sql` (Facebook comment auto-reply toggle) was
integrated from the Facebook monitoring/hardening checkpoint, filling the former gap
between `034` and `036`. The 035–043 sequence is now contiguous with no reserved slots.

### No automated DB rollback
`scripts/rollback.sh` reverts Docker image tags only — it does **not** roll back schema changes.
If a breaking migration (especially 021) fails mid-deploy:
1. Stop the server immediately to prevent partial-state queries.
2. Inspect which DDL statements completed: `SELECT * FROM information_schema.columns WHERE table_name = '<affected_table>';`
3. Manually revert by dropping the added column (only safe if the server has not yet written to it).
4. Re-run the migration cleanly before restarting the server.

A future improvement: wrap each migration in a transaction (`BEGIN; ... COMMIT;`) so failures auto-rollback within Supabase.

### Credential rotation reminder
After any audit session, rotate all API keys that may have been visible in `.env` files.
Keys to rotate: Groq, Cerebras, OpenRouter/OpenAI, Facebook App Secret.
The `.env` file is gitignored and was never committed, but rotation is standard practice
after any filesystem exposure.
