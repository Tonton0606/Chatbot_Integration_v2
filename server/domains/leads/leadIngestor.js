/**
 * Unified Lead Ingestor
 * Normalizes leads from any source (facebook, google_maps, web_form, manual, csv_import)
 * into the unified `leads` table with deduplication and scoring.
 */

const { supabase } = require('../../config/supabase');
const logger = require('../../config/logger');
const { assignLead, assignByScore, isAutoAssignEnabled } = require('./leadRouter');

const VALID_SOURCES = ['facebook', 'google_maps', 'web_form', 'manual', 'csv_import'];
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost', 'archived'];

/**
 * Compute a simple lead score based on available data richness.
 * 0-100 scale: email/phone presence, company name, notes length.
 */
function computeScore(data = {}) {
  let score = 0;
  if (data.email) score += 25;
  if (data.phone) score += 25;
  if (data.company_name) score += 15;
  if (data.name) score += 10;
  if (data.notes && data.notes.length > 20) score += 10;
  if (data.raw_data && Object.keys(data.raw_data).length > 0) score += 15;
  return Math.min(score, 100);
}

/**
 * Find an existing lead by workspace + source + external_id,
 * or by email/phone for cross-source dedup.
 */
async function findExisting({ workspaceId, source, externalId, email, phone }) {
  // Prefer external_id match within same source
  if (externalId) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source', source)
      .eq('external_id', externalId)
      .maybeSingle();
    if (data) return data;
  }

  // Cross-source dedup by email
  if (email) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .maybeSingle();
    if (data) return data;
  }

  // Cross-source dedup by phone
  if (phone) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('phone', phone)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

/**
 * Normalize and upsert a lead from any source.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.source        - One of VALID_SOURCES
 * @param {string} [params.externalId]  - Source-specific external ID
 * @param {string} [params.name]
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @param {string} [params.companyName]
 * @param {number} [params.score]       - Override auto-score
 * @param {string} [params.status]      - Override default 'new'
 * @param {Object} [params.rawData]     - Original source payload
 * @param {string} [params.notes]
 * @param {string} [params.assignedTo]
 * @returns {Promise<Object>} The upserted lead record
 */
async function upsertLead({
  workspaceId,
  source,
  externalId,
  name,
  email,
  phone,
  companyName,
  score,
  status,
  rawData,
  notes,
  assignedTo,
}) {
  if (!workspaceId) throw new Error('workspaceId is required');
  if (!VALID_SOURCES.includes(source)) throw new Error(`Invalid source: ${source}. Must be one of: ${VALID_SOURCES.join(', ')}`);

  const existing = await findExisting({
    workspaceId,
    source,
    externalId,
    email,
    phone,
  });

  const payload = {
    workspace_id: workspaceId,
    source,
    external_id: externalId || null,
    name: name || null,
    email: email || null,
    phone: phone || null,
    company_name: companyName || null,
    score: score ?? computeScore({ name, email, phone, companyName, notes, rawData }),
    status: status && VALID_STATUSES.includes(status) ? status : 'new',
    raw_data: rawData || null,
    notes: notes || null,
    assigned_to: assignedTo || null,
  };

  if (existing?.id) {
    // Update — merge notes and bump score if this contact has richer data
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...payload,
        notes: [existing.notes, notes].filter(Boolean).join('\n---\n'),
        score: Math.max(payload.score, existing.score),
      })
      .eq('id', existing.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, workspaceId, source, externalId }, 'leadIngestor: update failed');
      throw error;
    }

    logger.info({ leadId: data.id, source }, 'leadIngestor: existing lead updated');
    return data;
  }

  // Create new lead
  const { data, error } = await supabase
    .from('leads')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logger.error({ err: error, workspaceId, source, externalId }, 'leadIngestor: insert failed');
    throw error;
  }

  // Auto-assign if no explicit assignment and workspace has auto_assign enabled
  if (!assignedTo) {
    try {
      const autoEnabled = await isAutoAssignEnabled(workspaceId);
      if (autoEnabled) {
        if (data.score >= 70) {
          await assignByScore(data, workspaceId);
        } else {
          await assignLead(data.id, workspaceId);
        }
      }
    } catch (assignErr) {
      // Non-fatal — lead was created, assignment is a best-effort optimization
      logger.warn({ err: assignErr, leadId: data.id }, 'leadIngestor: auto-assignment failed (non-fatal)');
    }
  }

  logger.info({ leadId: data.id, source, score: data.score }, 'leadIngestor: new lead created');
  return data;
}

module.exports = { upsertLead, computeScore, VALID_SOURCES, VALID_STATUSES };