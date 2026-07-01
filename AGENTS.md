# AGENTS.md — Hermes Enterprise Portal
## Operating System for AI Development Agents

> This document governs every AI agent that touches this repository:
> Claude Code · ChatGPT Coding Agent · Cline · Kilo Code · and all future agents.
>
> Read it in full before writing a single line of code.

---

## 0. PRIME DIRECTIVES — Reasoning & Collaboration Rules

> These are the **major rules** for everyone who builds Hermes — every LLM agent
> (Claude, ChatGPT, Cline, Kilo Code, and future agents) **and** every human
> teammate and collaborator. They sit **above** every other section. When any
> rule below conflicts with speed, convenience, or a quick win, these win.

Hermes is reasoned about with a disciplined method adapted from classical
study-hall (chavruta / pilpul) reasoning. The goal is **depth over speed,
root-cause over patch, proof over assertion.** Eight directives:

1. **Ask "why" before "what."** Establish root cause and intent before writing a
   patch. Never fix a symptom you don't understand. *(A patch without a named
   root cause is rejected in review.)*

2. **Pilpul — chase the fine distinction.** The first reading hides the bug. Hunt
   the precise edge case and the distinction that actually matters. *(Example of
   record: graceful shutdown looked correct via signal handlers, but the real
   bug was PM2's `shutdown_with_message` using an IPC message, not SIGINT.)*

3. **Chavruta — argue the other side.** Before declaring a change correct,
   steelman why it is wrong, out loud, then resolve it. Pair every non-trivial
   change with an adversarial self-review (or a teammate review).

4. **Kal va'chomer — reason from the proven case.** Prefer established patterns
   over novelty. If the stricter case is safe, the lighter one is too. Reuse the
   primitive (e.g. `middleware/tenantScope.js`); don't reinvent per route.

5. **Make it concrete — prove, don't assert.** Every claim ships with a runnable
   proof: a test, a repro, observed output. "It should work" is not evidence.
   *(See `server/middleware/__tests__/tenantScope.test.js`, run in CI.)*

6. **Machloket — preserve the real question.** Surface trade-offs and unresolved
   risks honestly. State plainly what you did **not** verify. Never force a false
   resolution to look finished. Flag, don't paper over.

7. **Hadran — review and return.** Re-audit prior conclusions when new evidence
   appears. A finished task that new facts contradict is reopened, not defended.

8. **Lomdus — build the general principle.** Factor specifics into a reusable,
   named abstraction rather than scattering one-off fixes. Leave the codebase
   with a sharper concept than you found it.

### Collaboration rules (agents ↔ humans)

- **Production is sacred.** This repo is live (`exponify.ph`) with real
  service-role DB credentials. **No agent runs migrations, writes, or destructive
  commands against the production database.** Validate in isolation or against
  staging. Migrations are delivered as files for a human to apply.
- **Branch and propose; never push to the default branch without being asked.**
  Hand off with: what changed, *why* (root cause), how it was proven, and what
  remains unverified.
- **Name the boundary.** When a fact requires access you don't have (live DB,
  runtime behavior you can't execute), say so — don't reason past the gap.
- **Leave a trail.** Decisions of record live in `docs/`. Point-in-time status,
  audit, and handoff scratch do **not** accumulate — fold conclusions into code,
  tests, or this document, then delete the scratch.

---

## 1. PLATFORM IDENTITY

**Hermes** is a multi-tenant enterprise SaaS platform built for Philippine SMBs.
It handles accounting, invoicing, CRM, payroll, BIR tax compliance, Facebook AI chatbots,
Google Maps lead generation, email campaigns, and client workspace management.

This is not a prototype. Real businesses run on it. Real money flows through it.
Real customer data lives in it. Treat every change accordingly.

**Production URL:** `https://exponify.ph` / `https://hermesbackend-j1w5.onrender.com`
**Repository:** `KaliProton777/HERMESV2.2` — branch `HERMESV2.2.1`

---

## 2. ARCHITECTURE MAP

```
HERMESV2.2/
├── server/                    # Node.js/Express API (primary entry: server.js)
│   ├── server.js              # MAIN server — boot sequence, middleware, process signals
│   ├── router.js              # Central API router — all route registration lives here
│   ├── app.js                 # Legacy serverless adapter (not used in production)
│   ├── config/
│   │   ├── logger.js          # Pino structured logger — NEVER use console.*
│   │   └── supabase.js        # Supabase admin client (SERVICE_ROLE_KEY)
│   ├── middleware/
│   │   └── auth.js            # requireAuth — JWT verification + workspace scoping
│   ├── routes/                # Express route handlers (one file per domain)
│   ├── services/
│   │   ├── facebook/          # 20-file AI chatbot + sales state machine
│   │   ├── googleMapsLeads/   # Node→Python bridge for lead scraping
│   │   ├── emailService.js
│   │   ├── aiCache.js
│   │   └── landing/
│   └── templates/             # Email HTML templates
├── client/                    # React 18 / Vite frontend
│   ├── src/
│   │   ├── services/          # All Supabase/API calls — never call DB from components
│   │   ├── components/        # admin/, client/, auth/, ui/, marketing/
│   │   ├── contexts/          # React context providers
│   │   └── pages/             # 136 route pages
│   └── Dockerfile             # Client build image
├── database/
│   └── migrations/            # 001–016 SQL — run sequentially on Supabase
├── docker/
│   ├── Dockerfile.server      # PRODUCTION server image (Node + Python + Playwright)
│   ├── Dockerfile.server.dev  # Dev server with nodemon
│   ├── Dockerfile.client      # Production nginx client image
│   └── Dockerfile.client.dev  # Dev client with Vite HMR
├── .github/workflows/ci.yml   # CI pipeline: audit → build → docker
├── render.yaml                # Render deployment manifest
├── docker-compose.yml         # Production compose
└── docker-compose.override.yml # Dev compose (auto-applied by Docker Compose)
```

---

## 3. TECHNOLOGY STACK

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20.x |
| Framework | Express | ^4.22.x |
| Auth / Database | Supabase (PostgreSQL + JWT) | @supabase/supabase-js ^2 |
| Logging | Pino + pino-pretty | ^10 |
| Security headers | Helmet | ^8 |
| Rate limiting | express-rate-limit | ^7 |
| AI inference | Groq SDK + OpenRouter + Gemini | — |
| Email | Nodemailer (SMTP) | ^8 |
| Frontend | React 18 + Vite | — |
| Container | Docker (multi-stage, Alpine) | — |
| Hosting | Render (backend: Docker, frontend: static) | — |
| Scraping | Python 3 + Playwright (gmaps microservice) | — |

---

## 4. MANDATORY WORKFLOW — EVERY TASK

Do not skip steps. Do not reorder steps.

### Step 1 — ANALYZE (before any code)

Answer these questions in your response before touching a file:

1. What is the business purpose of this feature/module?
2. What are ALL the files involved (server routes, client services, DB tables)?
3. What breaks if this changes? Who depends on it?
4. Is there a simpler path to the same outcome?
5. Can this scale 10x without rewrites? 100x?

### Step 2 — PLAN

State explicitly:
- Root cause (for bugs) or rationale (for features)
- Exact files to change with line numbers where known
- Risk: what can go wrong, what is the rollback
- Validation: how you will prove it works

### Step 3 — IMPLEMENT

Rules:
- Smallest safe change. No scope creep.
- One concern per commit. Do not bundle unrelated changes.
- No refactoring adjacent code unless it is the task.
- No new abstractions unless the task demands it.
- No comments explaining WHAT the code does. Only WHY when non-obvious.

### Step 4 — VALIDATE

Run and confirm in your response:
```bash
# Server: zero vulnerabilities
npm audit --audit-level=high --prefix server

# Client: build must succeed
npm run build --prefix client

# No console.* remaining in server
grep -r "console\." server/ --include="*.js" --exclude-dir=node_modules | grep -v "//.*console"
```

### Step 5 — REPORT

Summarize:
- What changed and why
- What was tested and how
- Any remaining risks
- Next recommended action

---

## 5. THE NON-NEGOTIABLE RULES

### 5.1 Logging — PINO ONLY

```js
// CORRECT
const logger = require('../config/logger');        // routes
const logger = require('../../config/logger');     // services
logger.info({ workspaceId, userId }, 'booking created');
logger.error({ err, requestId: req.requestId }, 'payment failed');

// FORBIDDEN — CI will catch this
console.log(...)
console.error(...)
console.warn(...)
console.info(...)
console.debug(...)
```

Every log object must include relevant context fields. Bare string logs are not searchable.

### 5.2 Authentication — requireAuth EVERYWHERE

Every server route that accesses workspace data MUST be protected:

```js
// CORRECT — in server.js
app.use('/api/your-route', requireAuth, yourRouter);

// ALSO CORRECT — in the router itself
router.get('/endpoint', requireAuth, handler);

// NEVER — no auth on data routes
app.use('/api/your-route', yourRouter);
```

**Unprotected routes (intentional — do not add auth):**
- `GET /health` — uptime monitoring
- `GET /` — root response
- `GET /api/landing/public/*` — public booking/submit forms
- `GET /api/landing/domains/*` — public domain lookup
- `POST /api/webhooks/facebook` — has `facebookLimiter` + HMAC verification
- `GET|POST /api/email/unsubscribe` — one-click unsubscribe (HMAC-verified)
- `POST /api/auth/*` — auth flows (has `authLimiter`)
- `GET /api/client-bookings/*` — client-facing booking

### 5.3 Rate Limiters — Apply Correctly

```js
app.use('/api/', generalLimiter);          // global baseline
app.use('/api/auth/', authLimiter);        // login: 10 req / 15min
app.use('/api/ai', requireAuth, aiLimiter, aiRoutes);       // LLM cost control
app.use('/api/openclaude', requireAuth, aiLimiter, ...);    // same
app.use('/api/webhooks/facebook', facebookLimiter, ...);    // webhook anti-abuse
app.use('/api/zoom', requireAuth, emailLimiter, ...);       // email spam prevention
```

Do not create new rate limiter instances without justification. Reuse existing ones.

### 5.4 Environment Variables

**server/.env.example** is the source of truth for backend vars.
**client/.env.example** is the source of truth for frontend vars.

Rules:
- Never hardcode values that belong in env vars
- Never commit `.env` files (enforced by `.gitignore`)
- Never log env var values at any level
- Add new env vars to `.env.example` with placeholder values

Required server vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`
Optional but warned on missing: `GROQ_API_KEY`, `SMTP_USER`, `FACEBOOK_PAGE_ACCESS_TOKEN`, `REDIS_URL`

### 5.5 Security Checklist (run mentally before every PR)

- [ ] SQL injection: All DB access goes through Supabase client (parameterized). Never string-concatenate queries.
- [ ] XSS: Any HTML rendered from user data uses DOMPurify (client) or `escapeHtml()` (server email templates).
- [ ] CSRF: Supabase JWT Bearer tokens are not cookie-based — CSRF is not applicable to API routes.
- [ ] SSRF: Never make server-side HTTP requests to URLs from user input without an allowlist.
- [ ] RCE: `spawn()` in googleMapsLeads uses fixed args. Never interpolate user input into shell commands.
- [ ] Broken access control: All Supabase queries include `.eq('workspace_id', req.workspaceId)` — never cross-workspace leaks.
- [ ] Secret exposure: Run `git log --all -p | grep -i "sk-\|password\|secret"` before pushing after adding integrations.
- [ ] Error messages: In production, `err.message` is never sent to client (global error handler in server.js sanitizes).
- [ ] CORS: Never use `Access-Control-Allow-Origin: *` — always use the origin allowlist pattern.
- [ ] X-Powered-By: Always call `app.disable('x-powered-by')` after `const app = express()`.

---

## 6. CRITICAL BUSINESS MODULES — HANDLE WITH EXTREME CARE

These modules handle money, compliance, or customer trust. Never modify without full understanding.

### 6.1 Accounting & Finance

- `server/routes/accounting.js` — double-entry ledger logic
- `server/routes/invoicing.js` — invoice lifecycle (draft → sent → paid → void)
- `server/routes/finance.js` — treasury and cash flow
- `server/routes/revenue.js` — revenue recognition
- DB tables: `journal_entries`, `chart_of_accounts`, `invoices`, `invoice_line_items`

**Rule:** Never modify accounting logic without understanding the double-entry invariant.
Debits must always equal credits. Every financial mutation must be audit-logged.

### 6.2 PH Tax Compliance (BIR)

- `server/routes/bir.js` — BIR filing support
- `server/routes/payrollTax.js` — SSS/PhilHealth/Pag-IBIG/withholding
- `server/routes/fixedAssets.js` — depreciation schedules

**Rule:** Tax rates, brackets, and form formats are legally mandated. Validate against
current TRAIN Law / BIR regulations before any change. Wrong calculations = legal liability.

### 6.3 Facebook AI Chatbot Engine

`server/services/facebook/` — 20-file state machine. Each file has a specific role:

```
facebookWebhookSecurity.js     — HMAC-SHA256 webhook signature verification
facebookConfig.js              — page token + workspace config resolution
facebookConversationState.js   — conversation FSM state persistence
facebookFlowState.js           — multi-step sales flow state
facebookSalesFlow.js           — sales qualification logic
facebookLeadQualification.js   — AI-driven lead scoring
facebookLeadCrmSync.js         — CRM write-back after qualification
facebookKnowledgeManager.js    — workspace knowledge base for AI context
facebookChatbotReply.js        — reply dispatch + handoff detection
handoffManager.js              — human handoff state machine
```

**Rule:** These files form a tightly coupled state machine. Changing one without
understanding the full flow will break the chatbot for all pages. Read the entire
service chain before modifying anything in this directory.

### 6.4 CRM Pipeline

- `server/routes/workflows.js`
- `database/migrations/016_crm_stages_opportunities.sql`
- Client: `client/src/services/sales_crm/`

DB tables: `crm_stages`, `crm_opportunities`
`crm_stages` has a `seed_default_crm_stages(workspace_id)` SQL function — call once per new workspace.

### 6.5 Email Unsubscribe (PH Data Privacy Act Compliance)

`server/server.js` — `/api/email/unsubscribe` (GET + POST)
- HMAC-SHA256 token verification — changing the secret invalidates all existing unsubscribe links in the wild
- Must remain unprotected (no auth) — users click from email clients
- HTML output uses entity encoding (XSS-safe) — do not change to raw string interpolation

---

## 7. DATABASE RULES

### 7.1 Migrations

- Location: `database/migrations/NNN_description.sql`
- Numbering: sequential (currently 001–052, next = 053)
- Execution: manual via Supabase SQL Editor — in ascending order, one at a time
- **Never modify a migration that has been run on production.** Create a new migration instead.
- **Never drop tables or columns** without a migration that moves data first.
- All tables require: `workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE`
- All tables require RLS policies scoped to `workspace_id`
- All tables require `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`

### 7.2 Row-Level Security

Every new table needs RLS enabled and workspace-scoped policies:

```sql
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.your_table
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );
```

### 7.3 Query Pattern

Always scope queries to workspace in the server:

```js
const { data, error } = await supabase
  .from('your_table')
  .select('*')
  .eq('workspace_id', req.workspaceId);  // NEVER omit this
```

---

## 8. API DESIGN RULES

### 8.1 Route Registration

All routes are registered in `server/router.js` (the central API router).
`server/server.js` handles boot sequence, middleware, and process signals — it mounts the router.
`server/app.js` is a legacy serverless adapter, not used in production.

```js
const yourRoutes = require('./routes/your-feature');
app.use('/api/your-feature', requireAuth, yourRoutes);
```

### 8.2 Response Shape

All API responses follow this shape:

```js
// Success
res.json({ success: true, data: { ... } });

// Error (let global handler in server.js format this)
next(err);

// Or manual error
res.status(400).json({ success: false, error: 'Human readable message' });
```

Never expose `err.stack` or raw `err.message` in production responses.
The global error handler in `server.js` handles sanitization — do not bypass it.

### 8.3 Request Tracing

Every request has `req.requestId` (set by middleware). Include it in error logs:

```js
logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, 'operation failed');
```

---

## 9. FRONTEND RULES

### 9.1 Service Layer

All Supabase and API calls go through `client/src/services/`. Never call Supabase directly from components.

```
client/src/services/
├── api.js                     # Axios instance with auth headers
├── auth/                      # Auth flows
├── accounting/                # Accounting CRUD
├── sales_crm/                 # CRM pipeline
├── operations/                # Tasks, teams, workspace admin
├── marketing/                 # Google Maps leads
├── campaigns/                 # Email campaigns
├── workflows/                 # Workflow automation
├── subscription/              # Billing
├── clientBookings/            # Client-facing booking
└── ai/                        # AI service routing
```

### 9.2 XSS Prevention

Any HTML rendered from database content (email bodies, rich text, user-generated content):

```jsx
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

`dangerouslySetInnerHTML` without `DOMPurify.sanitize()` is never acceptable.

### 9.3 Environment Variables

All client env vars must be prefixed `VITE_` and documented in `client/.env.example`.
Never put secrets in client env vars — they are embedded in the build bundle and visible to anyone.

---

## 10. DOCKER & INFRASTRUCTURE

### 10.1 Which Dockerfile to Use

| Use case | Dockerfile | Build context |
|---|---|---|
| Production server (Render) | `docker/Dockerfile.server` | `.` (repo root) |
| Production client (Render) | `docker/Dockerfile.client` | `.` (repo root) |
| Dev server (hot reload) | `docker/Dockerfile.server.dev` | `.` |
| Dev client (Vite HMR) | `docker/Dockerfile.client.dev` | `.` |

### 10.2 Production Server Image

`docker/Dockerfile.server` includes Python 3 + Playwright + Chromium for the Google Maps microservice.
Do not remove these dependencies. The gmaps lead generation feature requires them at runtime.

Non-root user: `nodejs:nodejs` (uid 1001). Never run production containers as root.

### 10.3 Health Check

Server exposes `GET /health`:
- Probes Supabase DB connectivity (`workspaces` table, limit 1)
- Checks heap memory (>512 MB → degraded)
- Returns `200 { status: "ok" }` or `503 { status: "degraded", checks: {...}, heap_mb, latency_ms }`

Render health check in `render.yaml` → `healthCheckPath: /health`
Docker HEALTHCHECK in `docker/Dockerfile.server` → same endpoint

---

## 11. CI/CD PIPELINE

`.github/workflows/ci.yml` — jobs run in dependency order:

```
lint-and-audit
    ├── npm ci (server + client)
    ├── npm audit --audit-level=high (server) — BLOCKS on HIGH/CRITICAL
    ├── npm audit --audit-level=high (client) — BLOCKS on HIGH/CRITICAL
    └── ESLint (client)
         ↓
build-client
    ├── npm run build (Vite production)
    └── upload artifact: client-dist-{sha}
         ↓
build-server-docker  ← main/HERMESV2.2.1 only
    └── docker build context:. file:docker/Dockerfile.server
build-client-docker  ← main/HERMESV2.2.1 only
    └── docker build context:. file:docker/Dockerfile.client
```

**Required GitHub Secrets:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_META_PIXEL_ID`

Do not add `continue-on-error: true` to any step. The pipeline must fail loudly and block deploys.

---

## 12. GIT DISCIPLINE

### 12.1 Branch Strategy

- `main` — production-stable
- `HERMESV2.2.1` — current release branch (active development)
- `integration/safe-merge` — local integration branch
- `feature/*` — new features
- `fix/*` — bug fixes
- `hotfix/*` — emergency production patches

### 12.2 Commit Message Format

```
type(scope): short description (imperative, lowercase, no period)

Body: what and why (not how).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `chore` `refactor` `perf` `security` `docs` `ci`

### 12.3 Rules

- Never force push to `main` or `HERMESV2.2.1`
- Force push to personal feature branches is acceptable with team awareness
- Create a backup branch before any history-rewriting operation
- Never commit: `.env` files, API keys, tokens, `client/dist/`, `node_modules/`
- Before pushing new integrations: `git log --all -p | grep -i "sk-\|bearer\|password\|secret"`

---

## 13. PERFORMANCE GUIDELINES

### 13.1 Database

- Always add `.limit()` to list queries — never return unbounded result sets
- Add indexes for all foreign keys and frequently filtered columns
- Avoid N+1: if you fetch a list then query per item, batch it into a single query
- Use `.select('specific,columns')` not `.select('*')` in frequently called paths

### 13.2 Server

- AI routes (`/api/ai`, `/api/openclaude`) are protected by `aiLimiter` (20 req/min) — do not bypass
- Google Maps scraping is async/background — never block the HTTP response on it
- Python process timeout in `googleMapsLeads/index.js`: 10 minutes — do not reduce without measuring

### 13.3 Client

- Services layer is the only place for data fetching — components must not call Supabase directly
- Avoid importing entire libraries when tree-shaken partial imports are available
- `dangerouslySetInnerHTML` requires DOMPurify — no exceptions

---

## 14. COMPLETION STANDARD

A task is done when all of these are true:

```
✓ Analysis completed — business impact understood before coding
✓ Risks identified — rollback path documented
✓ Implementation validated — smallest safe change applied
✓ Zero console.* calls added to server/
✓ All new routes registered with requireAuth
✓ All new DB tables have workspace_id FK + RLS policies
✓ New migration file named 053_description.sql (next sequential number)
✓ New env vars added to .env.example with placeholder values
✓ npm audit --audit-level=high passes (0 vulnerabilities)
✓ Client Vite build succeeds
✓ No hardcoded workspace IDs, user IDs, or secrets
✓ Error paths log with logger.error({ err, requestId }, 'context')
✓ Response shape follows { success: bool, data/error: ... }
✓ Security reviewed — OWASP Top 10 checklist passed
✓ Production readiness verified
```

---

## 15. WHAT IS NEVER ACCEPTABLE

- `console.log/error/warn/info/debug` in server code — use Pino logger
- `dangerouslySetInnerHTML` without `DOMPurify.sanitize()`
- `Access-Control-Allow-Origin: *` — always use an explicit origin allowlist
- A route that accesses workspace data without `requireAuth`
- A Supabase query without `.eq('workspace_id', ...)` scope
- Hardcoded API keys, tokens, passwords, or production URLs in code
- Dropping or truncating tables without a migration
- Modifying an already-deployed migration file
- Returning `err.stack` or raw `err.message` in production API responses
- `continue-on-error: true` in CI pipeline steps
- Force pushing to `main` or `HERMESV2.2.1`
- Installing a new npm package without verifying its audit status first
- Making blind changes to auth, accounting, BIR, or the Facebook chatbot engine

---

## 16. QUICK REFERENCE — COMMON PATTERNS

### Add a new protected API endpoint

```js
// server/routes/your-feature.js
const router = require('express').Router();
const logger = require('../config/logger');
const { supabase } = require('../config/supabase');

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .eq('workspace_id', req.workspaceId);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'your-feature list failed');
    next(err);
  }
});

module.exports = router;

// Register in server/router.js
const yourFeatureRoutes = require('./routes/your-feature');
router.use('/your-feature', requireAuth, yourFeatureRoutes);
```

### Add a new migration

```sql
-- database/migrations/053_your_feature.sql
CREATE TABLE IF NOT EXISTS public.your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- your columns here
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.your_table
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_your_table_workspace ON public.your_table(workspace_id);
```

### Diagnose a production issue

```bash
# Check health endpoint
curl https://hermesbackend-j1w5.onrender.com/health

# Verify a route requires auth (must return 401, not data)
curl -X GET https://hermesbackend-j1w5.onrender.com/api/your-route

# Verify CI is green before deploying
gh run list --branch HERMESV2.2.1

# Check for accidental secret commits
git log --all -p | grep -i "sk-\|bearer\|password\|secret" | head -20
```

---

## 17. FINAL DIRECTIVE

Think like an owner. Act like a CTO. Build like this serves millions.

Every agent that opens this repository inherits responsibility for:
- The businesses running on this platform
- The customers whose data lives here
- The financial records that must be accurate
- The AI chatbots that represent those businesses to their customers

**Make the system better every time you touch it.**
Leave the codebase cleaner than you found it.
Leave the security posture stronger than you found it.
Leave the humans who depend on this platform better protected than you found them.

---

*Version: HERMESV2.2.1 | Updated: 2026-06-16*
