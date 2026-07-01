const logger = require('../../config/logger');
const { supabase } = require("../../config/supabase");

const TRUSTED_PLATFORM_DOMAINS = new Set([
  "exponify.ph",
  "www.exponify.ph",
  "localhost",
  "127.0.0.1",
]);

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  const email = cleanText(value).toLowerCase();
  return email || null;
}

function normalizeDomain(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/:\d+$/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function isTrustedPlatformDomain(domain) {
  const cleanDomain = normalizeDomain(domain);

  return (
    TRUSTED_PLATFORM_DOMAINS.has(cleanDomain) ||
    cleanDomain.endsWith(".onrender.com") ||
    /^192\.168\.\d+\.\d+$/.test(cleanDomain) ||
    /^10\.\d+\.\d+\.\d+$/.test(cleanDomain) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(cleanDomain)
  );
}

function buildFullName(payload = {}) {
  const firstName = cleanText(payload.first_name);
  const lastName = cleanText(payload.last_name);
  const fullName = cleanText(payload.full_name);

  return `${firstName} ${lastName}`.trim() || fullName || "Landing Page Visitor";
}

function buildLeadTitle({ fullName, serviceInterest }) {
  if (serviceInterest) {
    return `${serviceInterest} Inquiry - ${fullName}`;
  }

  return `Landing Page Inquiry - ${fullName}`;
}

function buildLeadNotes({
  landingPage,
  payload,
  sourceDomain,
  sourcePlatform,
}) {
  return [
    "Created from external landing page submission.",
    landingPage?.title ? `Landing Page: ${landingPage.title}` : null,
    landingPage?.slug ? `Landing Slug: ${landingPage.slug}` : null,
    sourceDomain ? `Source Domain: ${sourceDomain}` : null,
    sourcePlatform ? `Source Platform: ${sourcePlatform}` : null,
    payload?.service_interest ? `Service Interest: ${payload.service_interest}` : null,
    payload?.message ? `Message: ${payload.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function assertLandingAvailable(landingPage) {
  if (
    !landingPage ||
    landingPage.published !== true ||
    landingPage.status !== "published" ||
    landingPage.enable_landing === false ||
    landingPage.maintenance_mode === true
  ) {
    throw new Error("Landing page not found or not available.");
  }
}

function getCaptureSettings(mapping) {
  return {
    createContact:
      mapping?.create_contact === undefined
        ? true
        : Boolean(mapping.create_contact),
    createLead:
      mapping?.create_lead === undefined ? true : Boolean(mapping.create_lead),
  };
}

function assertCaptureAllowed(mapping) {
  const settings = getCaptureSettings(mapping);

  if (!settings.createContact && !settings.createLead) {
    throw new Error("Lead and contact capture are disabled for this landing page.");
  }

  if (!settings.createContact && settings.createLead) {
    throw new Error(
      "Contact capture is required because client leads require a contact."
    );
  }

  return settings;
}

async function resolveLandingBySlug(slug) {
  const cleanSlug = cleanText(slug);

  if (!cleanSlug) {
    throw new Error("landing_slug is required.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("*")
    .eq("slug", cleanSlug)
    .eq("published", true)
    .eq("status", "published")
    .eq("enable_landing", true)
    .eq("maintenance_mode", false)
    .maybeSingle();

  if (error) throw error;

  assertLandingAvailable(data);

  return data;
}

async function resolveLandingByDomain(domain) {
  const cleanDomain = normalizeDomain(domain);

  if (!cleanDomain) {
    return null;
  }

  const { data: domainRecord, error: domainError } = await supabase
    .from("workspace_domains")
    .select("*, landing_page:workspace_landing_pages(*)")
    .eq("domain", cleanDomain)
    .eq("status", "verified")
    .maybeSingle();

  if (domainError) throw domainError;

  if (!domainRecord?.landing_page) {
    return null;
  }

  assertLandingAvailable(domainRecord.landing_page);

  return domainRecord.landing_page;
}

async function resolveLandingTarget({ landing_slug, source_domain }) {
  const cleanSlug = cleanText(landing_slug);
  const cleanSourceDomain = normalizeDomain(source_domain);

  // An explicit landing slug is the workspace-scoped identifier the client
  // embeds on their external site. It is authoritative and takes precedence
  // over origin/domain-based attribution, so a form posted from any external
  // host (e.g. a page hosted on Vercel) resolves to the correct landing page.
  if (cleanSlug) {
    return resolveLandingBySlug(cleanSlug);
  }

  // No slug provided — fall back to verified custom-domain attribution.
  if (cleanSourceDomain && !isTrustedPlatformDomain(cleanSourceDomain)) {
    const domainLanding = await resolveLandingByDomain(cleanSourceDomain);

    if (!domainLanding) {
      throw new Error(
        "Source domain is not connected to a verified landing page, and no landing_slug was provided."
      );
    }

    return domainLanding;
  }

  return resolveLandingBySlug(cleanSlug);
}

async function getLandingBookingMapping({ workspaceId, landingPageId }) {
  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("landing_page_id", landingPageId)
    .is("service_card_id", null)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  return data?.[0] || null;
}

async function findExistingContact({ workspaceId, email, phone }) {
  let query = supabase
    .from("client_contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (email) {
    query = query.eq("email", email);
  } else if (phone) {
    query = query.eq("phone", phone);
  } else {
    return null;
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) throw error;

  return data || null;
}

async function createOrUpdateContact({
  workspaceId,
  fullName,
  email,
  phone,
  companyName,
}) {
  const existing = await findExistingContact({
    workspaceId,
    email,
    phone,
  });

  if (existing) {
    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (fullName && existing.full_name !== fullName) {
      updatePayload.full_name = fullName;
    }

    if (phone && existing.phone !== phone) {
      updatePayload.phone = phone;
    }

    if (companyName && existing.company_name !== companyName) {
      updatePayload.company_name = companyName;
    }

    if (Object.keys(updatePayload).length === 1) {
      return existing;
    }

    const { data, error } = await supabase
      .from("client_contacts")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from("client_contacts")
    .insert({
      workspace_id: workspaceId,
      full_name: fullName,
      email,
      phone,
      company_name: companyName,
      source: "external_landing_page",
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function createLead({
  workspaceId,
  contactId,
  title,
  notes,
  assignedOwner,
}) {
  if (!contactId) {
    throw new Error("contact_id is required to create a client lead.");
  }

  const payload = {
    workspace_id: workspaceId,
    contact_id: contactId,
    title,
    source: "external_landing_page",
    status: "new",
    notes,
  };

  if (assignedOwner) {
    payload.assignment_type = "user";
    payload.assigned_user_id = assignedOwner;
  }

  const { data, error } = await supabase
    .from("client_leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function trackLandingEvent({
  workspaceId,
  landingPageId,
  eventType,
  sourceDomain,
  sourcePlatform,
  metadata = {},
}) {
  const { error } = await supabase.from("workspace_landing_events").insert({
    workspace_id: workspaceId,
    landing_page_id: landingPageId,
    event_type: eventType,
    event_source: "external_landing_page",
    metadata: {
      source_domain: sourceDomain || null,
      source_platform: sourcePlatform || null,
      ...metadata,
    },
  });

  if (error) {
    logger.error({ err: error }, "External landing event tracking failed:");
  }
}

async function captureExternalLandingLead(payload = {}) {
  const sourceDomain = normalizeDomain(payload.source_domain);
  const sourcePlatform = cleanText(payload.source_platform) || "external_site";

  const landingPage = await resolveLandingTarget({
    landing_slug: payload.landing_slug,
    source_domain: sourceDomain,
  });

  const mapping = await getLandingBookingMapping({
    workspaceId: landingPage.workspace_id,
    landingPageId: landingPage.id,
  });

  const captureSettings = assertCaptureAllowed(mapping);

  const fullName = buildFullName(payload);
  const email = normalizeEmail(payload.email);
  const phone = cleanText(payload.phone) || null;
  const companyName = cleanText(payload.company || payload.company_name) || null;
  const serviceInterest = cleanText(payload.service_interest);

  if (!email && !phone) {
    throw new Error("Email or phone is required.");
  }

  let contact = null;
  let lead = null;

  if (captureSettings.createContact) {
    contact = await createOrUpdateContact({
      workspaceId: landingPage.workspace_id,
      fullName,
      email,
      phone,
      companyName,
    });
  }

  if (captureSettings.createLead) {
    lead = await createLead({
      workspaceId: landingPage.workspace_id,
      contactId: contact?.id || null,
      title: buildLeadTitle({
        fullName,
        serviceInterest,
      }),
      notes: buildLeadNotes({
        landingPage,
        payload,
        sourceDomain,
        sourcePlatform,
      }),
      assignedOwner: mapping?.assigned_owner || null,
    });
  }

  await trackLandingEvent({
    workspaceId: landingPage.workspace_id,
    landingPageId: landingPage.id,
    eventType: captureSettings.createLead
      ? "external_lead_submit"
      : "external_contact_submit",
    sourceDomain,
    sourcePlatform,
    metadata: {
      contact_id: contact?.id || null,
      lead_id: lead?.id || null,
      create_contact: captureSettings.createContact,
      create_lead: captureSettings.createLead,
      service_interest: serviceInterest || null,
    },
  });

  return {
    landingPage,
    mapping,
    contact,
    lead,
  };
}

module.exports = {
  captureExternalLandingLead,
  resolveLandingTarget,
  trackLandingEvent,
};
