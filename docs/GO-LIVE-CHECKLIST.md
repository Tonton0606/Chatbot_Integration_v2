# GO-LIVE CHECKLIST — Production Promotion of the Audit/Integration Trunk

> Decision of record (AGENTS.md §0). Candidate commit: **`29b886a`** on
> `INTEGRATION-HERMESV2.2.1`. Target: `PRODUCTION-HERMESV2.2.1`.
> Method: branch-and-propose → review → verify gates → fast-forward. **No direct
> push to the production default branch. No agent-run production migrations.**

---

## 1. What this promotion contains

40 commits ahead of production main (`2ea0235`, 2026-06-24). Two reconciled
lineages already merged on the integration trunk:

- **Interior hardening (audit):** tenant isolation (`tenantScope`, `requireWorkspace`),
  profile self-escalation lockdown (migration `043`), PostgREST `.or()` injection
  sanitizer, production error masking, Stripe webhook signature + auth fix,
  NaN/financial-input guards, `x-request-id` on every response.
- **Perimeter hardening (checkpoint):** Facebook webhook IP-allowlist / alerting /
  monitoring, conversation analytics + cache, bot/honeypot `securityMiddleware`,
  public-form rate limiting, migration `035`.

**Proof (re-run before promoting):**
```bash
cd server && npm test          # expect 103/103 across 4 suites
npm audit --audit-level=high   # expect 0 vulnerabilities (server AND client)
# full app boot (no listener), catches broken require/export:
SUPABASE_URL=https://test.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.test \
PORT=5099 NODE_ENV=test LOG_LEVEL=silent \
node -e "const a=require('./server.js'); if(!(a&&a.use))process.exit(1); console.log('BOOT_OK')"
```

---

## 2. Merge mechanics (verified)

- Production main `2ea0235` **is a direct ancestor** of the candidate → clean
  fast-forward, **0 conflicts** (`git merge-tree` exit 0).
- No commits exist on production main that the candidate lacks.

---

## 3. RUNTIME GATES — must be verified on staging before the FF (BLOCKING)

These cannot be verified from the repo. **Named boundaries (AGENTS.md):** they
require the live/staging DB and secrets, which no agent touches.

- [ ] **Rotate all `.env` secrets** — priority: `SUPABASE_SERVICE_ROLE_KEY`,
      `FACEBOOK_APP_SECRET`/`FB_APP_SECRET`. Fix weak `FACEBOOK_VERIFY_TOKEN=testtoken`
      → long random. Set in Render env, not files.
- [ ] **Apply migrations on staging** (035–043), then **verify migration 043**
      rejects self-escalation — as a non-service-role session:
      ```sql
      begin;
        select set_config('request.jwt.claims',
          json_build_object('sub','<uuid>','role','authenticated')::text, true);
        set local role authenticated;
        update profiles set role='SuperAdmin' where id='<uuid>';
        -- EXPECTED: ERROR: Changing role is not permitted
      rollback;
      ```
- [ ] **Run the tenant-isolation probe** (after migration 021):
      ```bash
      SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
        node scripts/verify-tenant-isolation.js <wsA> <wsB>   # expect 0 leaks
      ```
- [ ] **Enable `pg_cron`** then apply `042`; confirm the job registered:
      ```sql
      select jobname, schedule from cron.job where jobname='purge-security-tables';
      ```

---

## 4. MACHLOKET — parallel production security campaign (HUMAN SEQUENCING)

The production repo has an **unmerged, structurally-divergent** `devin/*` security
campaign (10 commits, off `2ea0235`):
`phase1-s4-rls-lockdown`, `kill-client-side-secrets`, `security-hotfix-cmdinjection`,
`phase1-s3-fb-fail-closed`, `mount-and-retrofit`, plus nested-folder cleanup.

It overlaps this audit's **themes** (RLS lockdown ≈ our `043`; kill-client-secrets ≈
our `sb_secret_` guard; fb-fail-closed ≈ our `requireWorkspace`) but **diverges
structurally**: it uses `server/app.js` (we use `server/server.js`), numbers its RLS
migration `003_rls_lockdown.sql` (we use `043`), and removes a `HermesV2-master/`
nested folder absent from our trunk.

**Open question only the team can resolve:** sequencing. A fast-forward of prod main
to this candidate lands 40 commits and forces the devin campaign to rebase against
them. Decide together:
1. Land this candidate first, then rebase/reconcile devin on top, **or**
2. Land devin first, then re-merge this candidate, **or**
3. Co-reconcile both into one release branch before either touches main.

This was **not** resolved unilaterally — it requires the devin team's intent
(why `app.js`? why the `003` numbering? is the nested folder deliberate?).

---

## 5. Promotion procedure (after §3 gates pass and §4 is decided)

1. This candidate is proposed as a **release branch + PR** on the production repo —
   never a direct default-branch push.
2. Elders review the PR (this checklist is the handoff).
3. Once gates are green and sequencing is agreed, a **human** performs the
   fast-forward / merge to `PRODUCTION-HERMESV2.2.1` and applies migrations.

---

## Verdict at time of writing

Code: ✅ boots, 103/103, 0 vulns, clean FF, 0 conflicts.
Runtime gates: ⛔ unverified (§3). Sequencing: ⛔ undecided (§4).
**Not cleared for the live default branch yet — proposed for review.**
