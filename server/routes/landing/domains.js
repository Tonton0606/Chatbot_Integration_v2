const express = require("express");
const dns = require("dns").promises;
const { supabase } = require("../../config/supabase");

const router = express.Router();

const RENDER_TARGET =
  process.env.RENDER_CUSTOM_DOMAIN_TARGET ||
  process.env.RENDER_EXTERNAL_HOSTNAME ||
  "";

const RENDER_APEX_IPS = ["216.24.57.1"];

const DNS_NOT_FOUND_CODES = new Set([
  "ENODATA",
  "ENOTFOUND",
  "ENODOMAIN",
  "NOTFOUND",
]);

function normalizeDomain(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function isValidDomain(domain) {
  return (
    typeof domain === "string" &&
    domain.length >= 4 &&
    domain.length <= 253 &&
    !domain.includes(" ") &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)
  );
}

function normalizeDnsTarget(value = "") {
  return String(value).trim().toLowerCase().replace(/\.$/, "");
}

function inferKnownProvider(targets = []) {
  const joined = targets.join(" ").toLowerCase();

  if (joined.includes("myshopify.com")) return "Shopify";
  if (joined.includes("wixdns") || joined.includes("wix.com")) return "Wix";
  if (joined.includes("wordpress") || joined.includes("wpengine")) {
    return "WordPress / WP Engine";
  }
  if (joined.includes("squarespace")) return "Squarespace";
  if (joined.includes("godaddy")) return "GoDaddy";
  if (joined.includes("namecheap")) return "Namecheap";
  if (joined.includes("cloudflare")) return "Cloudflare";
  if (joined.includes("sendnow.ph")) return "SendNow / Mail Infrastructure";
  if (joined.includes("dot.ph")) return "dotPH";
  if (joined.includes("onrender.com")) return "Render";
  if (RENDER_APEX_IPS.some((ip) => joined.includes(ip))) return "Render";

  return null;
}

function buildDnsInstructions({ domain, expectedTarget }) {
  return {
    client_explanation:
      "Your public landing page stays the same content, but your custom domain/subdomain must point to Exponify's hosting target. Visitors will see the configured domain in the browser.",
    current_exponify_url_hint:
      "Example default URL: https://www.exponify.ph/l/your-landing-slug",
    custom_domain_goal: domain,
    technical_dns_target: expectedTarget,
    preferred_record: {
      type: "CNAME",
      host: domain,
      value: expectedTarget,
      note:
        "For Exponify-managed client subdomains, create one CNAME record such as clientname.exponify.ph pointing to this target. For root/apex domains, use Render's required A record.",
    },
    apex_record: {
      type: "A",
      host: "@",
      value: RENDER_APEX_IPS[0],
      note:
        "Use this A record for root/apex domains such as example.com when the DNS provider does not support CNAME flattening.",
    },
    do_not_modify: [
      "MX records",
      "Email DNS records",
      "TXT/SPF/DKIM/DMARC records",
    ],
  };
}

async function safeResolveCname(domain) {
  try {
    const cname = await dns.resolveCname(domain);

    return {
      values: cname.map(normalizeDnsTarget),
      error: null,
    };
  } catch (error) {
    if (DNS_NOT_FOUND_CODES.has(error.code)) {
      return { values: [], error: null };
    }

    return {
      values: [],
      error: error.code || error.message,
    };
  }
}

async function safeResolveA(domain) {
  try {
    const a = await dns.resolve4(domain);

    return {
      values: a.map(normalizeDnsTarget),
      error: null,
    };
  } catch (error) {
    if (DNS_NOT_FOUND_CODES.has(error.code)) {
      return { values: [], error: null };
    }

    return {
      values: [],
      error: error.code || error.message,
    };
  }
}

async function safeResolveMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);

    return {
      values: mx
        .map((record) => ({
          exchange: normalizeDnsTarget(record.exchange),
          priority: record.priority,
        }))
        .sort((a, b) => a.priority - b.priority),
      error: null,
    };
  } catch (error) {
    if (DNS_NOT_FOUND_CODES.has(error.code)) {
      return { values: [], error: null };
    }

    return {
      values: [],
      error: error.code || error.message,
    };
  }
}

async function safeReverse(ip) {
  try {
    const hostnames = await dns.reverse(ip);

    return {
      ip,
      hostnames: hostnames.map(normalizeDnsTarget),
      error: null,
    };
  } catch (error) {
    return {
      ip,
      hostnames: [],
      error: error.code || error.message,
    };
  }
}

async function inspectDns(domain) {
  const result = {
    domain,
    cname: [],
    a: [],
    mx: [],
    reverse: [],
    current_targets: [],
    website_targets: [],
    email_targets: [],
    current_provider: null,
    has_dns: false,
    has_website_dns: false,
    has_email_dns: false,
    cname_error: null,
    a_error: null,
    mx_error: null,
  };

  const [cnameResult, aResult, mxResult] = await Promise.all([
    safeResolveCname(domain),
    safeResolveA(domain),
    safeResolveMx(domain),
  ]);

  result.cname = cnameResult.values;
  result.a = aResult.values;
  result.mx = mxResult.values;

  result.cname_error = cnameResult.error;
  result.a_error = aResult.error;
  result.mx_error = mxResult.error;

  if (result.a.length > 0) {
    result.reverse = await Promise.all(result.a.map((ip) => safeReverse(ip)));
  }

  const reverseTargets = result.reverse.flatMap((item) => item.hostnames || []);
  const mxTargets = result.mx.map((record) => record.exchange);

  result.website_targets = [
    ...result.cname,
    ...result.a,
    ...reverseTargets,
  ];

  result.email_targets = mxTargets;

  result.current_targets = [
    ...result.website_targets,
    ...result.email_targets,
  ];

  result.has_website_dns = result.cname.length > 0 || result.a.length > 0;
  result.has_email_dns = result.mx.length > 0;
  result.has_dns = result.has_website_dns || result.has_email_dns;
  result.current_provider = inferKnownProvider(result.current_targets);

  return result;
}

function evaluateDns({ dnsResult, expectedTarget }) {
  const normalizedExpected = normalizeDnsTarget(expectedTarget);

  if (!normalizedExpected) {
    return {
      status: "failed",
      safe_to_continue: false,
      risk_level: "high",
      message:
        "Server is missing RENDER_CUSTOM_DOMAIN_TARGET. Configure it before verifying domains.",
      summary: {
        website: "Unable to check website DNS.",
        email: "Unable to check email DNS.",
        action_required: "Configure server Render target first.",
      },
      instructions: buildDnsInstructions({
        domain: dnsResult.domain,
        expectedTarget,
      }),
    };
  }

  const pointsToRender = dnsResult.website_targets.some((target) => {
    const normalizedTarget = normalizeDnsTarget(target);

    return (
      normalizedTarget === normalizedExpected ||
      RENDER_APEX_IPS.includes(normalizedTarget)
    );
  });

  if (pointsToRender) {
    return {
      status: "verified",
      safe_to_continue: true,
      risk_level: "none",
      message:
        "Domain points correctly to Exponify's hosting target. Visitors can use this domain after Render certificate issuance is complete.",
      summary: {
        website: "Website DNS already points to Exponify.",
        email: dnsResult.has_email_dns
          ? "Email DNS was detected and does not need to be changed."
          : "No email DNS records were detected.",
        action_required:
          "No DNS change required. If this was newly added, wait for Render SSL issuance to complete.",
      },
      instructions: buildDnsInstructions({
        domain: dnsResult.domain,
        expectedTarget,
      }),
    };
  }

  if (!dnsResult.has_website_dns) {
    return {
      status: "pending",
      safe_to_continue: true,
      risk_level: dnsResult.has_email_dns ? "low" : "none",
      message:
        "No website DNS record was found yet. Add a CNAME record pointing to Exponify's hosting target, then recheck.",
      summary: {
        website: "No website DNS record found.",
        email: dnsResult.has_email_dns
          ? "Email DNS was detected. Do not modify email records."
          : "No email DNS records were detected.",
        action_required:
          "Add a CNAME record pointing to Exponify's hosting target.",
      },
      instructions: buildDnsInstructions({
        domain: dnsResult.domain,
        expectedTarget,
      }),
    };
  }

  const providerLabel = dnsResult.current_provider
    ? ` It appears connected to ${dnsResult.current_provider}.`
    : "";

  return {
    status: "warning",
    safe_to_continue: true,
    risk_level: "website",
    message:
      `This domain currently points somewhere else.${providerLabel} Changing website DNS may disconnect an existing website. Continuing will not change DNS automatically.`,
    summary: {
      website:
        "Existing website DNS was detected. Changing it may disconnect the current website.",
      email: dnsResult.has_email_dns
        ? "Email DNS records were detected. Changing website DNS usually does not affect email, but do not modify MX/TXT email records."
        : "No email DNS records were detected.",
      action_required:
        "Continue only if you own this domain and intend to point its website traffic to Exponify.",
    },
    instructions: buildDnsInstructions({
      domain: dnsResult.domain,
      expectedTarget,
    }),
  };
}

async function loadLandingPage({ landingPageId, workspaceId }) {
  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("id, workspace_id, slug")
    .eq("id", landingPageId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function syncLandingFallback({
  landingPageId,
  domain,
  status,
  verifiedAt = null,
  errorMessage = null,
}) {
  const { error } = await supabase
    .from("workspace_landing_pages")
    .update({
      custom_domain: domain || null,
      custom_domain_status: status || "not_configured",
      custom_domain_verified_at: verifiedAt || null,
      custom_domain_error: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId);

  if (error) throw error;
}

router.post("/check", async (req, res, next) => {
  try {
    const landingPageId = req.body?.landingPageId;
    const workspaceId = req.body?.workspaceId;
    const domain = normalizeDomain(req.body?.domain);

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        status: "failed",
        safe_to_continue: false,
        message: "landingPageId is required.",
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        status: "failed",
        safe_to_continue: false,
        message: "workspaceId is required.",
      });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        success: false,
        status: "failed",
        safe_to_continue: false,
        message: "Invalid domain format.",
      });
    }

    const landingPage = await loadLandingPage({
      landingPageId,
      workspaceId,
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        status: "failed",
        safe_to_continue: false,
        message: "Landing page was not found for this workspace.",
      });
    }

    const { data: duplicateDomain, error: duplicateError } = await supabase
      .from("workspace_domains")
      .select("id, workspace_id, landing_page_id, domain, status")
      .eq("domain", domain)
      .neq("landing_page_id", landingPageId)
      .not("status", "eq", "released")
      .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (duplicateDomain) {
      return res.status(409).json({
        success: false,
        status: "duplicate",
        safe_to_continue: false,
        message:
          "This domain is already connected to another Exponify landing page.",
        domain,
        duplicate: duplicateDomain,
      });
    }

    const dnsResult = await inspectDns(domain);

    const evaluation = evaluateDns({
      dnsResult,
      expectedTarget: RENDER_TARGET,
    });

    const checkedAt = new Date().toISOString();

    const defaultUrl = landingPage.slug
      ? `https://www.exponify.ph/l/${landingPage.slug}`
      : null;

    const domainPayload = {
      workspace_id: workspaceId,
      landing_page_id: landingPageId,
      domain,
      status: evaluation.status,
      dns_record: {
        type: "CNAME",
        name: domain,
        value: RENDER_TARGET,
        apex: {
          type: "A",
          name: "@",
          value: RENDER_APEX_IPS[0],
        },
        current: dnsResult,
      },
      ssl_status: evaluation.status === "verified" ? "active" : "pending",
      verified_at: evaluation.status === "verified" ? checkedAt : null,
      last_checked_at: checkedAt,
      check_result: {
        ...dnsResult,
        default_exponify_url: defaultUrl,
        custom_domain_goal: domain,
        technical_dns_target: RENDER_TARGET,
        expected_target: RENDER_TARGET,
        accepted_apex_ips: RENDER_APEX_IPS,
        safe_to_continue: evaluation.safe_to_continue,
        risk_level: evaluation.risk_level,
        summary: evaluation.summary,
        instructions: evaluation.instructions,
        message: evaluation.message,
      },
      error_message:
        evaluation.status === "verified" ? null : evaluation.message,
      updated_at: checkedAt,
    };

    const { data: existingDomain, error: existingError } = await supabase
      .from("workspace_domains")
      .select("id")
      .eq("domain", domain)
      .eq("landing_page_id", landingPageId)
      .maybeSingle();

    if (existingError) throw existingError;

    let savedDomain;

    if (existingDomain?.id) {
      const { data, error } = await supabase
        .from("workspace_domains")
        .update(domainPayload)
        .eq("id", existingDomain.id)
        .select("*")
        .single();

      if (error) throw error;
      savedDomain = data;
    } else {
      const { data, error } = await supabase
        .from("workspace_domains")
        .insert({
          ...domainPayload,
          created_by: req.body?.userId || null,
        })
        .select("*")
        .single();

      if (error) throw error;
      savedDomain = data;
    }

    await syncLandingFallback({
      landingPageId,
      domain,
      status: evaluation.status,
      verifiedAt: evaluation.status === "verified" ? checkedAt : null,
      errorMessage:
        evaluation.status === "verified" ? null : evaluation.message,
    });

    return res.json({
      success: true,
      domain,
      default_exponify_url: defaultUrl,
      custom_domain_goal: domain,
      status: evaluation.status,
      safe_to_continue: evaluation.safe_to_continue,
      risk_level: evaluation.risk_level,
      message: evaluation.message,
      summary: evaluation.summary,
      provider: dnsResult.current_provider,
      website_dns: {
        cname: dnsResult.cname,
        a: dnsResult.a,
        reverse: dnsResult.reverse,
        targets: dnsResult.website_targets,
      },
      email_dns: {
        mx: dnsResult.mx,
        targets: dnsResult.email_targets,
      },
      instructions: evaluation.instructions,
      technical_dns_target: RENDER_TARGET,
      expected_target: RENDER_TARGET,
      accepted_apex_ips: RENDER_APEX_IPS,
      dns: dnsResult,
      record: savedDomain,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/release", async (req, res, next) => {
  try {
    const landingPageId = req.body?.landingPageId;
    const workspaceId = req.body?.workspaceId;
    const domain = normalizeDomain(req.body?.domain);

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        message: "landingPageId is required.",
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "workspaceId is required.",
      });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        success: false,
        message: "Invalid domain format.",
      });
    }

    const landingPage = await loadLandingPage({
      landingPageId,
      workspaceId,
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page was not found for this workspace.",
      });
    }

    const releasedAt = new Date().toISOString();

    const { data: releasedDomain, error: releaseError } = await supabase
      .from("workspace_domains")
      .update({
        status: "released",
        ssl_status: "pending",
        verified_at: null,
        last_checked_at: releasedAt,
        updated_at: releasedAt,
        error_message: "Domain released by owner.",
        check_result: {
          released: true,
          released_at: releasedAt,
          message: "Domain released by owner.",
        },
      })
      .eq("domain", domain)
      .eq("landing_page_id", landingPageId)
      .eq("workspace_id", workspaceId)
      .neq("status", "released")
      .select("*")
      .maybeSingle();

    if (releaseError) throw releaseError;

    await syncLandingFallback({
      landingPageId,
      domain: null,
      status: "not_configured",
      verifiedAt: null,
      errorMessage: null,
    });

    return res.json({
      success: true,
      status: "released",
      message: "Domain released. It can now be used by another landing page.",
      domain,
      record: releasedDomain || null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
