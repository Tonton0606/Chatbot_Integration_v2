const logger = require('../../config/logger');
const express = require("express");
const {
  captureExternalLandingLead,
} = require("../../services/landing/publicLandingSubmitService");
const { upsertLead } = require('../../domains/leads/leadIngestor');

const router = express.Router();

function getOriginDomain(req) {
  const origin = req.headers.origin || req.headers.referer || "";

  return String(origin)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

router.post("/capture", async (req, res) => {
  try {
    // Explicit field allowlist — never spread raw req.body into service/DB layer
    const b = req.body || {};
    const payload = {
      first_name:       String(b.first_name       || "").slice(0, 100),
      last_name:        String(b.last_name        || "").slice(0, 100),
      full_name:        String(b.full_name        || "").slice(0, 200),
      email:            String(b.email            || "").slice(0, 255).toLowerCase(),
      phone:            String(b.phone            || "").slice(0, 30),
      company:          String(b.company          || b.company_name || "").slice(0, 200),
      message:          String(b.message          || "").slice(0, 2000),
      service_interest: String(b.service_interest || "").slice(0, 200),
      platform:         String(b.platform         || "").slice(0, 50),
      landing_slug:     String(b.landing_slug      || b.workspace_slug || "").slice(0, 100),
      landing_page_id:  b.landing_page_id || null,
      source_domain:    b.source_domain || getOriginDomain(req),
    };

    const result = await captureExternalLandingLead(payload);

    // Bridge into unified leads table for the Lead-to-Revenue pipeline
    try {
      const landingPage = result.landingPage;
      if (landingPage?.workspace_id) {
        await upsertLead({
          workspaceId: landingPage.workspace_id,
          source: 'web_form',
          name: payload.full_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || undefined,
          email: payload.email || undefined,
          phone: payload.phone || undefined,
          companyName: payload.company || undefined,
          notes: payload.message || undefined,
          rawData: {
            landing_page_id: landingPage.id,
            landing_page_slug: landingPage.slug,
            service_interest: payload.service_interest,
            platform: payload.platform,
            source_domain: payload.source_domain,
            contact_id: result.contact?.id || null,
            client_lead_id: result.lead?.id || null,
          },
        });
      }
    } catch (bridgeErr) {
      // Non-fatal: landing capture succeeded, unified lead sync is best-effort
      logger.warn({ err: bridgeErr, landingSlug: payload.landing_slug }, 'landing: unified lead bridge failed (non-fatal)');
    }

    return res.status(201).json({
      success: true,
      message: "Lead captured successfully.",
      contact_id: result.contact?.id || null,
      lead_id: result.lead?.id || null,
      landing_page_id: result.landingPage?.id || null,
    });
  } catch (error) {
    logger.error({ err: error }, "EXTERNAL LANDING CAPTURE ERROR:");

    return res.status(400).json({
      success: false,
      error: error.message || "Failed to capture landing lead.",
    });
  }
});

router.get("/test", (_req, res) => {
  return res.json({
    success: true,
    route: "landing-public-submit",
  });
});

module.exports = router;
