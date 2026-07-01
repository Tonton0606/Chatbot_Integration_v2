# Omnichannel Social Chatbot — Consolidation & Expansion Plan

**Status:** 🚧 Design Phase — NOT yet implemented (awaiting approval)
**Priority:** High
**Goal:** One module — *Social Media Chatbot* — with omnichannel 24/7 autoreplies.
**Reference product (north-star):** [Botcake](https://botcake.io/) — ManyChat-style
omnichannel conversational marketing + commerce (Messenger, WhatsApp, Instagram,
TikTok, LINE; AI replies, comment auto-reply, broadcast/sequences, e-commerce,
human handoff, visual flow builder).
**Last Updated:** 2026-06-28

---

## 1. Goal

Collapse three overlapping Facebook surfaces (Admin Connect, Admin Override, Client
Connect) into a **single Social Chatbot module**, and generalize the
Facebook-only reply engine into a **channel-agnostic engine** so the same 24/7
autoreply brain serves multiple platforms.

> 24/7 autoreply already exists for Facebook today: the webhook processes inbound
> messages server-side independent of any human being online, with
> `handoffManager.js` for human takeover. This plan **preserves** that and extends
> it to new channels — it does not rebuild it.

---

## 2. Current State (verified)

### Frontend — three overlapping entry points
| File | Lines | Role |
|---|---|---|
| `client/src/pages/Admin/Admin_FacebookConnect.jsx` | 1054 | Full connect/config UI (pages, business type, products, knowledge, AI instructions, token gen) |
| `client/src/pages/Admin/Admin_FacebookConnectOverride.jsx` | 418 | Thin wrapper: workspace picker → `<ClientFacebookConnect adminOverrideMode … />` |
| `client/src/pages/Client/Modules/ClientFacebookConnect.jsx` | 650 | Client connect page — already supports `adminOverrideMode` |

**Finding:** "Override" is an **admin-impersonation/RBAC** capability, not a channel
feature. The Override page is already a wrapper around the client page's override
mode. Consolidation is mostly frontend and does not require touching the engine.

### Backend — engine is already factory/DI based (the key enabler)
- `createFacebookGraphApi({ getFacebookConfig })` — **the transport/send layer**
  (`sendFacebookMessage`, `sendQuickReplies`, `sendProductCarousel`,
  `sendSenderAction`, `postCommentReply`, `sendPrivateReply`).
- `createFacebookChatbotReplyService({…})` — `generateChatbotReply(input, context)`
  is **channel-agnostic** (produces text/structured replies from knowledge, sales
  flow, lead qualification — all *content*, not transport).
- `createFacebookConfigService({…})` — reads `fb_pages` / `client_facebook_page_settings`.
- Webhook ingestion (`server/routes/integrations/facebook.js`) is the FB-specific
  entry; hard-rejects `object !== "page"`, subscribes to Messenger/feed fields only.

**Conclusion:** The abstraction seam already exists. Omnichannel =
**extract a `ChannelAdapter` interface from `facebookGraphApi.js`**, generalize
config + webhook ingestion, and add sibling adapters. The ~40-file content engine
is reused as-is.

### Today's reach
Facebook Messenger + comment auto-reply only. **No Instagram, WhatsApp, Telegram,
or web chat exists.**

---

## 3. Reference Product — Botcake parity map

Botcake is the closest commercial analog to the target. We already have most of
its *engine* features for Facebook; the gap is **multi-channel reach** + a few
authoring/utility tools. Honest map (§0.6):

| Botcake capability | Hermes today | Plan |
|---|---|---|
| Messenger AI replies, 24/7 | ✅ `facebookChatbotReply` + webhook | Keep |
| Comment auto-reply | ✅ `facebookCommentAutoReply/Automation` | Generalize per channel |
| Human handoff | ✅ `handoffManager` | Keep |
| Lead gen + capture | ✅ `facebookLeadQualification` + `facebookLeadCrmSync` | Keep |
| Sales/objection/sequences | ✅ `facebookSalesFlow`, `facebookObjectionHandling`, `facebookFollowUp*` | Keep |
| E-commerce: product cards | ✅ `sendProductCarousel` + `facebookTemplateIntegration` | Generalize |
| E-commerce: order tracking / coupons | ⚠️ partial | Backlog |
| Broadcast / bulk / remarketing | ⚠️ gated design | Already tracked → `BROADCAST_COMPLIANCE_GATE.md` |
| **Multi-channel (IG/WhatsApp/TikTok/LINE)** | ❌ FB only | **This plan (§4–5)** |
| **Visual flow builder** | ❌ flows are code-defined | Optional later phase (§5, Phase 6) |
| Utility generators (WA button/link, webform) | ❌ | Backlog (low effort, standalone) |

## 3.1 Recommended Channels (priority order, PH SMB market)

1. **Instagram DM** — *first.* Same Meta Graph API + webhook, ~80% adapter reuse.
   Highest ROI second channel; IG usage is huge in PH.
2. **Web chat widget** — *second.* Leverages the existing
   `POST /api/ai/landing-chat/ask` endpoint + the landing pages the platform
   already manages. Own property, no third-party app-review friction, fast.
3. **WhatsApp Business (Cloud API)** + **TikTok Messaging** — *third tier.*
   WhatsApp adds the 24h window + template approval; TikTok is very high-value in
   PH but its business-messaging API is less mature — validate API access before
   committing. Both sit behind the same `ChannelAdapter`.
4. **Defer:** LINE (Botcake supports it; low PH relevance), Telegram, Viber —
   add later behind the same interface if demanded.

---

## 4. Target Architecture

### 4.1 Contracts (new, channel-neutral)
- `IncomingMessage` — `{ workspaceId, channel, externalAccountId, senderId, text,
  attachments[], messageId, raw }`.
- `OutboundMessage` — text / quickReplies / richCard / typing.
- `ChannelAdapter` interface (extracted from the FB Graph API):
  `verifyWebhook(req)`, `parseInbound(req) → IncomingMessage[]`,
  `sendMessage()`, `sendQuickReplies()`, `sendRichCard()`,
  `sendTypingIndicator()`, `subscribe()`.

### 4.2 Adapters
- `MessengerAdapter` — **refactor of existing `facebookGraphApi.js`**, behavior
  preserved bit-for-bit (kal va'chomer: the proven case stays proven).
- `InstagramAdapter` — reuses Meta Graph transport, IG-specific IDs/fields.
- `WhatsAppAdapter` — Cloud API send + template/window handling.
- `WebChatAdapter` — WebSocket/HTTP transport reusing landing-chat plumbing.

### 4.3 Shared engine (unchanged)
`generateChatbotReply` + knowledge/sales/lead/handoff services consume
`IncomingMessage` and emit `OutboundMessage`; the adapter does the channel I/O.

### 4.4 Config / DB
- New `channel_connections` table keyed by `(workspace_id, channel,
  external_account_id)` holding tokens/config/access_mode (workspace_id NOT NULL,
  RLS, created_at/updated_at per §7).
- **Backward compatibility:** keep `fb_pages` working; migrate-by-view or
  dual-write so production Messenger keeps running during rollout (§0 production
  is sacred). No destructive drops.

### 4.5 Webhook routing
- Generalize to `POST /api/webhooks/:channel` (keep `/api/webhooks/facebook` as an
  alias so Meta's configured callback URL never breaks). Per-channel signature
  verification inside each adapter (preserve `facebookWebhookSecurity` HMAC).

### 4.6 Frontend — one module
- New **Social Chatbot** module replacing all three pages: channel tabs
  (Messenger / Instagram / WhatsApp / Web), each with connect + AI config; a
  workspace selector visible to admins (override = RBAC, not a separate page).
- Update `client/src/constants/modules.js`, `App.jsx` routes (keep redirects from
  old paths), `AdminLayout.jsx` nav.

---

## 5. Phased Delivery (each phase independently shippable & validated)

- **Phase 0 — Interface extraction (no behavior change).** Define contracts;
  refactor `facebookGraphApi.js` into `MessengerAdapter` behind the interface.
  Proof: existing `facebook/__tests__` pass unchanged; Messenger still replies.
- **Phase 1 — Config generalization.** Add `channel_connections` (migration NNN),
  dual-read with `fb_pages`. No UI change yet.
- **Phase 2 — Frontend consolidation.** One Social Chatbot module; old routes
  redirect. Messenger-only behind the new UI.
- **Phase 3 — Instagram adapter.** First real second channel (lowest effort).
- **Phase 4 — Web chat widget.** Reuse landing-chat.
- **Phase 5 — WhatsApp + TikTok adapters.** Cloud API + template/window rules;
  TikTok pending business-messaging API access.
- **Phase 6 (optional) — Visual flow builder.** Botcake's drag-drop authoring over
  the existing code-defined sales flow. Largest UI effort; sequence after channels
  prove value. Only if the product wants self-serve flow editing.

---

## 6. Risks & Rollback (§0.6 machloket — stated honestly)

- **Protected engine (§6.3).** The reply engine is a tightly coupled state
  machine. Mitigation: Phase 0 is a pure refactor proven by the existing test
  suite before any new channel is added.
- **Production Messenger continuity.** Mitigation: keep `/api/webhooks/facebook`
  alias + `fb_pages` dual-read; each phase is reversible by config flag.
- **Meta app review.** IG/WhatsApp require Meta permissions/app review — an
  external dependency outside the codebase; flagged, not assumed.
- **Token security (§5.4).** New per-channel tokens never logged; stored
  server-side only; client sees masked values (as `fb_pages` does today).

---

## 7. Validation Standard (every phase, per §4 / §14)

- `npm audit --audit-level=high` (server + client) — 0 vulns.
- `npm run build --prefix client` — succeeds.
- `npm test --prefix server` — full suite green (+ new adapter tests).
- No `console.*` added to server; new routes `requireAuth` + workspace-scoped;
  new table has workspace_id FK + RLS; new env vars in `.env.example`.

---

## 8. Open Decisions for the User

1. Confirm channel **priority** (default: IG → Web → WhatsApp).
2. Confirm **Phase 0 + 1 + 2 first** (consolidate + groundwork, Messenger-only)
   before building any new channel — recommended, lowest risk.
