# External Landing Page → Hermes CRM (embeddable lead capture)

How a client landing page hosted **anywhere** (Vercel, WordPress, plain HTML, etc.)
sends fill-up-form submissions straight into that client's Hermes workspace CRM.

## How it works

The pasted snippet **auto-detects the fill-up form**, scrapes its fields on submit
(by input `type` and name/placeholder/aria-label keywords), and posts the lead
cross-origin to the public capture surface — no manual wiring on the page:

- `POST https://hermesbackend-j1w5.onrender.com/api/landing/public/capture` → creates **contact + lead** (+ unified `leads` pipeline row).
- `POST https://hermesbackend-j1w5.onrender.com/api/landing/public/book` → creates **contact + lead + booking** (when the form has a date + time).

It binds on the submit event in the capture phase, non-blocking, so it never
interferes with the site's own form handling, and only sends when an email or
phone is present (so search/newsletter forms are ignored). Add
`data-hermes-form` to a specific `<form>` to capture only that one.

The workspace is chosen by **`landing_slug`** in the body — the slug of a
**published** `workspace_landing_pages` row in that client's workspace. The origin
is not used for attribution, so the page can be hosted on any domain. These
endpoints are unauthenticated by design, rate-limited (`publicFormLimiter`), and
field-allowlisted; CORS reflects the request origin with credentials disabled.

> Requirement: the client's landing page must exist and be **published**
> (`published = true`, `status = 'published'`, `enable_landing = true`,
> `maintenance_mode = false`). Confirm the `slug` in the workspace's Landing
> Pages admin and paste it as `LANDING_SLUG` below.

## Drop-in snippet

The exact, copy-ready snippet is generated per landing page in the app:
**Social Media Hub → Website Connect** (or the client **Connect Website** module).
It is produced by `buildEmbedSnippet()` in
`client/src/services/marketing/websiteConnect.js` and looks like:

```html
<script>
(function () {
  /* ===== Hermes — auto-capture website form -> CRM ===== */
  var API_BASE = "https://hermesbackend-j1w5.onrender.com/api";
  var LANDING_SLUG = "REPLACE_WITH_LANDING_SLUG"; // published slug in the client workspace
  // scrapes name/email/phone/company/message/service + optional date/time,
  // binds form submit (capture phase, non-blocking), re-scans for dynamic forms.
})();
</script>
```

## Notes / boundaries

- The external page needs its own CSP to permit the request. If the page sets a
  Content-Security-Policy, add the backend to `connect-src`:
  `connect-src 'self' https://hermesbackend-j1w5.onrender.com;`
- If the page keeps a same-origin proxy (e.g. a Vercel `/api/book` function),
  that function must forward to the endpoints above **with `landing_slug`** —
  otherwise resolution fails with `"landing_slug is required."`.
- Verify end-to-end by submitting once and checking the workspace CRM
  (Contacts → new contact, Leads → new lead, Bookings if scheduled).
</content>
