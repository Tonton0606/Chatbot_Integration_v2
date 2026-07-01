const logger = require('../config/logger');
const { safeError } = require('../utils/safeError');

const express = require('express');
const router = express.Router();

// ── Service bridge ────────────────────────────────────────────────────────────
// Loaded lazily so a broken Python/supabase env doesn't crash the whole server.
// gmapsService = null means "service unavailable" — routes return 503 gracefully.
let gmapsService = null;
let gmapsLoadError = null;

try {
  gmapsService = require('../services/googleMapsLeads/index');
} catch (err) {
  gmapsLoadError = err.message;
  logger.warn({ message: err.message }, '[gmaps-routes] Google Maps service failed to load: %s');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function serviceUnavailable(res) {
  return res.status(503).json({
    success: false,
    error: 'Google Maps lead service is unavailable.',
    detail: gmapsLoadError || 'Module did not load. Check Python dependencies and SERPER_API_KEY.',
  });
}

// ── GET /health  (public — mounted directly in server.js before requireAuth) ─
function healthHandler(_req, res) {
  res.json({
    success: true,
    data: {
      service_available: gmapsService !== null,
      load_error: gmapsLoadError || null,
      serper_configured: !!process.env.SERPER_API_KEY,
      llm_configured: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
      llm_provider: process.env.OPENROUTER_API_KEY
        ? 'openrouter'
        : process.env.OPENAI_API_KEY
          ? 'openai'
          : 'none',
      python_command: process.env.PYTHON_CMD || 'python3',
    },
  });
}
router.get('/health', healthHandler);

// ── All routes below require the outer requireAuth from server.js ─────────────
// req.user, req.workspaceId, req.isAdmin are already set by that middleware.
// We do NOT run a second auth pass here — avoids double Supabase round-trips
// and the "not a member of workspace_members" false-positive.

/**
 * GET /configs — list saved search configs for this workspace
 */
router.get('/configs', async (req, res) => {
  if (!gmapsService) return serviceUnavailable(res);
  if (!req.workspaceId) {
    return res.status(400).json({ success: false, error: 'x-workspace-id header is required.' });
  }
  try {
    const configs = await gmapsService.getSearchConfigs(req.workspaceId);
    res.json({ success: true, data: configs });
  } catch (err) {
    logger.error({ err }, '[gmaps-routes] getSearchConfigs failed');
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /search — start a new Google Maps search (async, returns when done)
 */
router.post('/search', async (req, res) => {
  if (!gmapsService) return serviceUnavailable(res);
  if (!req.workspaceId) {
    return res.status(400).json({ success: false, error: 'x-workspace-id header is required.' });
  }

  const { location, search_query, num_pages, search_label, enrichment_enabled } = req.body;

  if (!location || !search_query) {
    return res.status(400).json({ success: false, error: 'location and search_query are required.' });
  }

  const pages = Math.min(Math.max(parseInt(num_pages, 10) || 1, 1), 10);

  try {
    const result = await gmapsService.runFullSearch(
      req.workspaceId,
      req.user.id,
      {
        location,
        search_query,
        num_pages: pages,
        search_label: search_label || `${search_query} in ${location}`,
        enrichment_enabled: enrichment_enabled !== false,
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Search failed.',
        configId: result.searchConfigId,
      });
    }

    res.json({
      success: true,
      data: {
        configId: result.searchConfigId,
        total_found: result.total_found,
        total_enriched: result.total_enriched,
        status: 'completed',
      },
    });
  } catch (err) {
    logger.error({ err }, '[gmaps-routes] runFullSearch failed');
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

/**
 * GET /configs/:configId/leads — leads for a search config
 */
router.get('/configs/:configId/leads', async (req, res) => {
  if (!gmapsService) return serviceUnavailable(res);
  const filters = {};
  if (req.query.enrichment_status) filters.enrichment_status = req.query.enrichment_status;
  if (req.query.lead_status)       filters.lead_status       = req.query.lead_status;
  try {
    const leads = await gmapsService.getLeads(req.params.configId, filters);
    res.json({ success: true, data: leads });
  } catch (err) {
    logger.error({ err }, '[gmaps-routes] getLeads failed');
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

/**
 * PATCH /leads/:leadId — update a lead
 */
router.patch('/leads/:leadId', async (req, res) => {
  if (!gmapsService) return serviceUnavailable(res);
  const allowed = ['lead_status', 'notes', 'assigned_to'];
  const updates = {};
  for (const field of allowed) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: `No valid update fields. Allowed: ${allowed.join(', ')}.`,
    });
  }
  try {
    const lead = await gmapsService.updateLead(req.params.leadId, updates);
    res.json({ success: true, data: lead });
  } catch (err) {
    logger.error({ err }, '[gmaps-routes] updateLead failed');
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

/**
 * DELETE /configs/:configId — delete a search config and its leads
 */
router.delete('/configs/:configId', async (req, res) => {
  if (!gmapsService) return serviceUnavailable(res);
  try {
    await gmapsService.deleteSearchConfig(req.params.configId);
    res.json({ success: true, message: 'Search config deleted.' });
  } catch (err) {
    logger.error({ err }, '[gmaps-routes] deleteSearchConfig failed');
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /configs/:configId/enrich — trigger enrichment on pending leads
 */
router.post('/configs/:configId/enrich', async (req, res) => {
  if (!gmapsService) return serviceUnavailable(res);
  try {
    const result = await gmapsService.runEnrichment(req.params.configId, req.workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, '[gmaps-routes] runEnrichment failed');
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
module.exports.healthHandler = healthHandler;
