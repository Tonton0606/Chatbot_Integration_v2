import { supabase } from "../../config/supabaseClient";
import {
  DOMAIN_STATUS,
  SSL_STATUS,
} from "./landingTypes";

/**
 * Hermes2 / ExponifyPH
 * Landing Domains Service
 *
 * Handles:
 * - custom domains
 * - verification state
 * - SSL status
 * - DNS instructions
 *
 * workspace_domains is the canonical domain table.
 * workspace_landing_pages.custom_domain fields are treated as legacy/fallback metadata.
 */

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function normalizeDomain(domain = "") {
  return String(domain)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function normalizeDomainPayload(payload = {}) {
  return {
    workspace_id: payload.workspace_id,
    landing_page_id: payload.landing_page_id || null,
    domain: normalizeDomain(payload.domain),
    status: payload.status || DOMAIN_STATUS[1],
    dns_record: payload.dns_record || {},
    ssl_status: payload.ssl_status || SSL_STATUS[0],
    verified_at: payload.verified_at || null,
    last_checked_at: payload.last_checked_at || null,
    created_by: payload.created_by || null,
    updated_at: new Date().toISOString(),
  };
}

function buildDomainUpdatePayload(payload = {}) {
  const update = {};

  if ("landing_page_id" in payload) {
    update.landing_page_id = payload.landing_page_id || null;
  }

  if ("domain" in payload) {
    update.domain = normalizeDomain(payload.domain);
  }

  if ("status" in payload) {
    update.status = payload.status || DOMAIN_STATUS[1];
  }

  if ("dns_record" in payload) {
    update.dns_record = payload.dns_record || {};
  }

  if ("ssl_status" in payload) {
    update.ssl_status = payload.ssl_status || SSL_STATUS[0];
  }

  if ("verified_at" in payload) {
    update.verified_at = payload.verified_at || null;
  }

  if ("last_checked_at" in payload) {
    update.last_checked_at = payload.last_checked_at || null;
  }

  if ("created_by" in payload) {
    update.created_by = payload.created_by || null;
  }

  update.updated_at = new Date().toISOString();

  return update;
}

async function syncLandingDomainFallback({
  landingPageId,
  domain,
  status,
  verifiedAt = null,
}) {
  if (!landingPageId) {
    return null;
  }

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({
      custom_domain: domain || null,
      custom_domain_status: status || "not_configured",
      custom_domain_verified_at: verifiedAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/*
-------------------------------------
LOAD
-------------------------------------
*/

export async function getWorkspaceDomains(workspaceId) {
  requireValue(workspaceId, "workspaceId is required.");

  const { data, error } = await supabase
    .from("workspace_domains")
    .select(
      `
      *,
      landing:workspace_landing_pages(
        id,
        title,
        slug
      )
    `
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getDomain(domain) {
  requireValue(domain, "domain is required.");

  const normalizedDomain = normalizeDomain(domain);

  const { data, error } = await supabase
    .from("workspace_domains")
    .select("*")
    .eq("domain", normalizedDomain)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLandingDomain(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_domains")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/*
-------------------------------------
CREATE
-------------------------------------
*/

export async function createDomain(payload) {
  requireValue(payload?.workspace_id, "workspace_id is required.");
  requireValue(payload?.domain, "domain is required.");

  const normalizedDomain = normalizeDomain(payload.domain);

  const existingDomain = await getDomain(normalizedDomain);

  if (existingDomain) {
    return existingDomain;
  }

  const cleanPayload = normalizeDomainPayload({
    ...payload,
    domain: normalizedDomain,
    dns_record:
      payload.dns_record ||
      buildDNSInstructions(normalizedDomain),
  });

  const { data, error } = await supabase
    .from("workspace_domains")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await syncLandingDomainFallback({
    landingPageId: data.landing_page_id,
    domain: data.domain,
    status: data.status,
    verifiedAt: data.verified_at,
  });

  return data;
}

/*
-------------------------------------
UPDATE
-------------------------------------
*/

export async function updateDomain(id, payload) {
  requireValue(id, "domain id is required.");

  const cleanPayload = buildDomainUpdatePayload(payload);

  const { data, error } = await supabase
    .from("workspace_domains")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await syncLandingDomainFallback({
    landingPageId: data.landing_page_id,
    domain: data.domain,
    status: data.status,
    verifiedAt: data.verified_at,
  });

  return data;
}

/*
-------------------------------------
VERIFY
-------------------------------------
*/

export async function verifyDomain(id) {
  requireValue(id, "domain id is required.");

  const verifiedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspace_domains")
    .update({
      status: "verified",
      ssl_status: "active",
      verified_at: verifiedAt,
      last_checked_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await syncLandingDomainFallback({
    landingPageId: data.landing_page_id,
    domain: data.domain,
    status: data.status,
    verifiedAt: data.verified_at,
  });

  return data;
}

export async function markDomainFailed(id) {
  requireValue(id, "domain id is required.");

  const checkedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspace_domains")
    .update({
      status: "failed",
      ssl_status: "failed",
      last_checked_at: checkedAt,
      updated_at: checkedAt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await syncLandingDomainFallback({
    landingPageId: data.landing_page_id,
    domain: data.domain,
    status: data.status,
    verifiedAt: data.verified_at,
  });

  return data;
}

/*
-------------------------------------
DELETE / DISABLE
-------------------------------------
*/

export async function disableDomain(id) {
  requireValue(id, "domain id is required.");

  const { data, error } = await supabase
    .from("workspace_domains")
    .update({
      status: "disabled",
      ssl_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await syncLandingDomainFallback({
    landingPageId: data.landing_page_id,
    domain: data.domain,
    status: data.status,
    verifiedAt: data.verified_at,
  });

  return data;
}

export async function deleteDomain(id, { hardDelete = false } = {}) {
  requireValue(id, "domain id is required.");

  if (!hardDelete) {
    return disableDomain(id);
  }

  const { data: domain, error: loadError } = await supabase
    .from("workspace_domains")
    .select("*")
    .eq("id", id)
    .single();

  if (loadError) {
    throw loadError;
  }

  const { error } = await supabase
    .from("workspace_domains")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  await syncLandingDomainFallback({
    landingPageId: domain.landing_page_id,
    domain: null,
    status: "not_configured",
    verifiedAt: null,
  });

  return true;
}

/*
-------------------------------------
DNS
-------------------------------------
*/

export function buildDNSInstructions(domain) {
  const normalizedDomain = normalizeDomain(domain);

  return {
    type: "CNAME",
    name: normalizedDomain,
    value: "pages.exponify.ph",
    ttl: "Auto",
  };
}

export { normalizeDomain };
