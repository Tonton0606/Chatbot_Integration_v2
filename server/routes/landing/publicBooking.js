const logger = require('../../config/logger');
const express = require("express");
const {
  createExternalLandingBooking,
} = require("../../services/landing/publicLandingBookingService");

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

router.post("/book", async (req, res) => {
  try {
    // Explicit field allowlist — never spread raw req.body into service/DB layer
    const b = req.body || {};
    const payload = {
      first_name:      String(b.first_name      || "").slice(0, 100),
      last_name:       String(b.last_name       || "").slice(0, 100),
      full_name:       String(b.full_name       || "").slice(0, 200),
      email:           String(b.email           || "").slice(0, 255).toLowerCase(),
      phone:           String(b.phone           || "").slice(0, 30),
      company:         String(b.company         || b.company_name || "").slice(0, 200),
      message:         String(b.message         || "").slice(0, 2000),
      service_interest:String(b.service_interest|| "").slice(0, 200),
      preferred_date:  String(b.preferred_date  || "").slice(0, 20),
      preferred_time:  String(b.preferred_time  || "").slice(0, 20),
      booking_type:    String(b.booking_type    || "").slice(0, 50),
      platform:        String(b.platform        || "").slice(0, 50),
      landing_slug:    String(b.landing_slug     || b.workspace_slug || "").slice(0, 100),
      landing_page_id: b.landing_page_id || null,
      source_domain:   b.source_domain || getOriginDomain(req),
    };

    const result = await createExternalLandingBooking(payload);

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking_id: result.booking?.id || null,
      contact_id: result.contact?.id || null,
      lead_id: result.lead?.id || null,
      landing_page_id: result.landingPage?.id || null,
    });
  } catch (error) {
    logger.error({ err: error }, "EXTERNAL LANDING BOOKING ERROR:");

    return res.status(400).json({
      success: false,
      error: error.message || "Failed to create landing booking.",
    });
  }
});

router.get("/book/test", (_req, res) => {
  return res.json({
    success: true,
    route: "landing-public-booking",
  });
});

module.exports = router;
