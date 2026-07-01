# Broadcast / Marketing Messages — Compliance Gate

**Status:** 🚧 Design Phase — NOT yet implemented  
**Priority:** High  
**Last Updated:** 2026-06-25

---

## Why This is Gated

Meta's **Messenger Platform** restricts businesses from sending proactive (non-reply) messages to users outside the 24-hour standard messaging window. Sending unsolicited messages can result in:
- **Page messaging restrictions** (temporary or permanent)
- **Reduced deliverability**
- **Page access revocation**

To send broadcast-type messages (e.g., promotions, newsletters, re-engagement campaigns), you must use Meta's **Marketing Messages** product, which requires:
1. Meta Business **review and approval**
2. Explicit **opt-in/consent** from each user
3. **Opt-out handling** (unsubscribe mechanism)
4. Compliance with Meta's **Platform Terms** and **Philippine Data Privacy Act (RA 10173)**

---

## Prerequisites Checklist

### Step 1: Meta Business Approval
- [ ] Apply for **Marketing Messages** access in Meta Business Settings
- [ ] Complete **Business Verification** (if not already done)
- [ ] Submit **use case review** (describe how messages add value)
- [ ] Wait for approval before writing any broadcast code

### Step 2: Consent & Subscription Schema

Design a subscriber model:

```sql
-- database/migrations/020_broadcast_subscribers.sql
CREATE TABLE IF NOT EXISTS public.broadcast_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  customer_psid TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscribed_via TEXT NOT NULL DEFAULT 'manual',
    -- 'opt_in_message' | 'checkbox_plugin' | 'landing_page' | 'manual'
  opted_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,
  unsubscribe_token TEXT,  -- HMAC-SHA256 token for one-click unsubscribe links
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(workspace_id, customer_psid)
);

ALTER TABLE public.broadcast_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.broadcast_subscribers
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_broadcast_sub_workspace ON public.broadcast_subscribers(workspace_id);
CREATE INDEX idx_broadcast_sub_opted_in ON public.broadcast_subscribers(workspace_id, page_id)
  WHERE opted_out_at IS NULL;
```

### Step 3: Opt-In Capture Points

Users must explicitly opt in. Acceptable methods per Meta policy:

| Method | Implementation | Notes |
|--------|---------------|-------|
| Opt-in message | Send "Would you like to receive promos?" + quick reply | Must log consent to `broadcast_subscribers` |
| Checkbox plugin | Facebook Checkbox for Messenger on website | Requires Facebook SDK |
| Landing page | Public booking form checkbox | Must be clear about message frequency |
| Post-purchase | After successful order/conversion | Must be separate from transaction flow |

### Step 4: Opt-Out / Unsubscribe

**Required by both Meta and PH Data Privacy Act:**
- Every broadcast message must include an unsubscribe option
- Options:
  - Quick reply: "Unsubscribe" / "Stop"
  - NLP detection: "unsubscribe", "stop", "tumigil", "remove me"
  - Dedicated unsubscribe endpoint: `/api/email/unsubscribe` (already exists)
  - HMAC-signed token in message payload for one-click unsubscribe

### Step 5: Rate & Volume Limits

- Start with **1 message per subscriber per week** max
- Never message users who haven't interacted in 30+ days
- Respect Meta's **24-hour window** rules:
  - Standard messaging: reply within 24h of user's last message
  - Marketing Messages: requires approval + tag
  - Message tags (e.g., `CONFIRMED_EVENT_UPDATE`) for time-sensitive

---

## Implementation Plan (Sequenced — Do Not Skip Steps)

### Phase A: Compliance Setup (Week 1)
1. [ ] Submit Marketing Messages application to Meta
2. [ ] Design consent UI components (opt-in checkbox, unsubscribe button)
3. [ ] Create `020_broadcast_subscribers.sql` migration
4. [ ] Add `broadcast_subscribers` table to Supabase
5. [ ] Build `broadcastConsentService.js` (subscribe/unsubscribe/check)

### Phase B: Core Engine (Week 2)
6. [ ] Build `broadcastDeliveryService.js` (queue, rate-limit, send via Graph API)
7. [ ] Add `POST /api/broadcasts/send` (protected, workspace-scoped)
8. [ ] Add unsubscribe NLP handler in webhook
9. [ ] Add broadcast analytics (sent, delivered, opened, unsubscribed)

### Phase C: UI & Launch (Week 3)
10. [ ] Build Broadcast composer UI in client
11. [ ] Add subscriber list view (total, active, unsubscribed)
12. [ ] Add compliance documentation for clients (help center article)
13. [ ] Soft launch with 1 workspace, monitor deliverability

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta rejects Marketing Messages application | Blocked | Prepare detailed use case; apply under "customer re-engagement" |
| Low opt-in rates | Feature useless | A/B test opt-in prompts; offer incentive (discount code) |
| High unsubscribe rates | List decay | Segment by engagement; limit frequency; personalize content |
| PH Data Privacy Act violation | Legal liability | Store consent timestamps; log opt-out; delete on request |
| Page messaging restriction | Revenue impact | Never send >1msg/wk; check subscriber last interaction date |

---

## Code Patterns

### Opt-In Message (sent by chatbot)
```javascript
// In facebookSalesFlow.js or facebookFollowUpAutomation.js
function offerSubscription(customerPsid, pageConfig) {
  return {
    text: "Would you like to receive exclusive promos and updates? 🎉",
    quick_replies: [
      { content_type: "text", title: "Yes, sign me up! ✅", payload: "SUBSCRIBE_BROADCAST" },
      { content_type: "text", title: "No, thanks", payload: "DECLINE_BROADCAST" },
    ],
  };
}
```

### Subscribe Handler (in webhook)
```javascript
// In facebook.js POST / route, after sales flow
if (quickReplyPayload === "SUBSCRIBE_BROADCAST") {
  await supabase.from("broadcast_subscribers").upsert({
    workspace_id: workspaceId,
    page_id: pageId,
    customer_psid: senderId,
    customer_name: customerName,
    subscribed_via: "opt_in_message",
  });
  // Send confirmation
}
```

### Unsubscribe Detection (in webhook)
```javascript
// In handoffDetection.js or inline
const UNSUBSCRIBE_KEYWORDS = [
  "unsubscribe", "stop", "remove", "opt out", "tumigil na", "ayaw ko na",
  "wag na", "hindi na", "remove me", "unsub",
];
if (UNSUBSCRIBE_KEYWORDS.some(k => incomingText.toLowerCase().includes(k))) {
  // Mark as unsubscribed, send confirmation
}
```

---

## Decision Record

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-25 | Gate broadcast feature behind compliance | Meta restrictions + PH Data Privacy Act require consent and opt-out. Building without these risks page restrictions and legal liability. |

---

**Status:** 🚧 Design — not ready for implementation  
**Next Action:** Submit Meta Marketing Messages application  
**Owner:** AI Engineering Team