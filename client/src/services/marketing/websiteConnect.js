import { supabase } from "../../config/supabaseClient";

// Connect Website — lets a client wire any external site's fill-up form into
// their Hermes workspace CRM. The form posts to the public capture surface
// (/api/landing/public/{capture,book}) with the landing page slug; the workspace
// is resolved from the slug server-side. See docs/landing-external-embed.md.

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

// Base for the public capture endpoints — VITE_API_BASE_URL already includes
// the "/api" prefix (e.g. https://hermesbackend-j1w5.onrender.com/api).
export function getCaptureApiBase() {
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://hermesbackend-j1w5.onrender.com/api";

  return String(base).replace(/\/+$/, "");
}

// Event types written by the public capture pipeline (see
// server/services/landing/publicLandingSubmitService.js -> trackLandingEvent).
export const EXTERNAL_SUBMIT_EVENTS = [
  "external_lead_submit",
  "external_contact_submit",
  "external_booking_submit",
];

export const SUBMIT_EVENT_LABELS = {
  external_lead_submit: "Lead",
  external_contact_submit: "Contact",
  external_booking_submit: "Booking",
};

// Normalize a typed website into a bare domain (drops protocol, path, www, port).
export function normalizeWebsite(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/:\d+$/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function websiteUrl(domain = "") {
  const d = normalizeWebsite(domain);
  return d ? `https://${d}` : "";
}

// Persist the connected website on the landing page (stored as custom_domain,
// the page's external address). Minimal write — does not touch publish state.
export async function saveLandingWebsite({ landingPageId, website }) {
  if (!landingPageId) throw new Error("Select a landing page first.");

  const domain = normalizeWebsite(website);

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({ custom_domain: domain || null, updated_at: new Date().toISOString() })
    .eq("id", landingPageId)
    .select("id, custom_domain")
    .single();

  if (error) throw error;

  return data;
}

export function isLandingPageLive(page) {
  return Boolean(
    page &&
      page.published === true &&
      page.status === "published" &&
      page.enable_landing !== false &&
      page.maintenance_mode !== true
  );
}

// Workspaces the current user can connect a website for. RLS scopes the result:
// an admin sees all active workspaces; a client sees their own. Used to drive the
// workspace selector so the module works regardless of where it is mounted.
export async function getSelectableWorkspaces() {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, status")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(300);

  if (error) throw error;

  return data || [];
}

export async function getConnectableLandingPages(workspaceId) {
  requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select(
      "id, title, slug, status, published, enable_landing, maintenance_mode, custom_domain, custom_domain_status"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((page) => ({
    ...page,
    is_live: isLandingPageLive(page),
  }));
}

// Live connection health for a landing page, derived from the submissions it
// has actually received. Drives the "Connected / Awaiting first submission"
// state, the activity feed, and the list of source domains posting to it.
export async function getLandingActivity({ workspaceId, landingPageId, recentLimit = 8 }) {
  requireWorkspaceId(workspaceId);

  if (!landingPageId) {
    return { connected: false, total: 0, lastAt: null, domains: [], recent: [] };
  }

  const { data, error } = await supabase
    .from("workspace_landing_events")
    .select("id, event_type, metadata, created_at")
    .eq("workspace_id", workspaceId)
    .eq("landing_page_id", landingPageId)
    .in("event_type", EXTERNAL_SUBMIT_EVENTS)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const events = data || [];
  const domains = [
    ...new Set(events.map((e) => e.metadata?.source_domain).filter(Boolean)),
  ];

  const recent = events.slice(0, recentLimit).map((e) => ({
    id: e.id,
    type: e.event_type,
    label: SUBMIT_EVENT_LABELS[e.event_type] || "Submission",
    domain: e.metadata?.source_domain || null,
    serviceInterest: e.metadata?.service_interest || null,
    leadId: e.metadata?.lead_id || null,
    at: e.created_at,
  }));

  return {
    connected: events.length > 0,
    total: events.length,
    lastAt: events[0]?.created_at || null,
    domains,
    recent,
  };
}

// Drop-in <script> the client pastes once. It auto-detects the fill-up form,
// scrapes its fields on submit, and posts the lead to this workspace's CRM.
// To capture one specific form only, add data-hermes-form to that <form>.
// Posts to /book when a date + time are present, otherwise to /capture.
export function buildEmbedSnippet({ slug, apiBase = getCaptureApiBase() } = {}) {
  const safeSlug = String(slug || "REPLACE_WITH_LANDING_SLUG");
  const safeBase = String(apiBase).replace(/\/+$/, "");

  return `<script>
(function () {
  /* ===== Hermes — auto-capture website form -> CRM (contact + lead [+ booking]) ===== */
  var API_BASE = ${JSON.stringify(safeBase)};
  var LANDING_SLUG = ${JSON.stringify(safeSlug)};

  function field(form, types, keywords) {
    for (var t = 0; t < types.length; t++) {
      var byType = form.querySelector('input[type="' + types[t] + '"]');
      if (byType && byType.value) return byType.value.trim();
    }
    var els = form.querySelectorAll("input, textarea, select");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.value || el.type === "password" || el.type === "hidden") continue;
      var hay = ((el.name || "") + " " + (el.id || "") + " " +
        (el.placeholder || "") + " " + (el.getAttribute("aria-label") || "")).toLowerCase();
      for (var k = 0; k < keywords.length; k++) {
        if (hay.indexOf(keywords[k]) !== -1) return el.value.trim();
      }
    }
    return "";
  }

  function scrape(form) {
    return {
      full_name: field(form, [], ["name", "fullname", "full name", "pangalan"]),
      email: field(form, ["email"], ["email", "e-mail"]),
      phone: field(form, ["tel"], ["phone", "mobile", "cell", "contact number", "telepono"]),
      company: field(form, [], ["company", "business", "organization", "negosyo"]),
      message: field(form, [], ["message", "comment", "note", "inquiry", "concern", "details"]),
      service_interest: field(form, [], ["service", "interest", "product", "plan", "package"]),
      preferred_date: field(form, ["date"], ["date", "schedule", "araw"]),
      preferred_time: field(form, ["time"], ["time", "oras"])
    };
  }

  function send(data) {
    if (!data.email && !data.phone) return; // skip non-lead forms (search, etc.)
    var hasSchedule = data.preferred_date && data.preferred_time;
    var body = {
      landing_slug: LANDING_SLUG,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      message: data.message,
      service_interest: data.service_interest
    };
    if (hasSchedule) {
      body.preferred_date = data.preferred_date;
      body.preferred_time = data.preferred_time;
    }
    try {
      fetch(API_BASE + (hasSchedule ? "/landing/public/book" : "/landing/public/capture"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function bind(form) {
    if (form.__hermesBound) return;
    form.__hermesBound = true;
    // Capture phase + non-blocking: never interferes with the site's own handler.
    form.addEventListener("submit", function () {
      try { send(scrape(form)); } catch (e) {}
    }, true);
  }

  function scan() {
    var tagged = document.querySelectorAll("form[data-hermes-form]");
    var forms = tagged.length ? tagged : document.querySelectorAll("form");
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState !== "loading") scan();
  else document.addEventListener("DOMContentLoaded", scan);
  // Re-scan for forms added dynamically (popups, single-page apps).
  if (window.MutationObserver) {
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
</script>`;
}

// Fires one clearly-tagged submission against the client's own workspace so they
// can confirm the wiring end-to-end. Creates a real (tagged) contact + lead in
// their CRM, which they can archive afterwards.
export async function sendTestSubmission({ slug, apiBase = getCaptureApiBase() }) {
  if (!slug) throw new Error("Select a published landing page first.");

  const stamp = new Date().toISOString();
  const res = await fetch(`${String(apiBase).replace(/\/+$/, "")}/landing/public/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      landing_slug: slug,
      full_name: "✅ Website Connect Test",
      email: `connect-test+${Date.now()}@hermes.test`,
      service_interest: "Connection Test",
      message: `Automated test from Connect Website module at ${stamp}. Safe to archive.`,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || "Test submission failed.");
  }

  return data;
}
