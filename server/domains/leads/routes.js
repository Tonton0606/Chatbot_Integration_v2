/**
 * Unified Leads API Routes
 * GET  /leads          — list leads (filterable by source, status, assigned_to)
 * PATCH /leads/:id     — update lead (status, assigned_to, score)
 * POST /leads/ingest   — ingest a lead from any source
 */

const express = require('express');
const multer = require('multer');
const csv = require('csv-parse/sync');
const { supabase } = require('../../config/supabase');
const logger = require('../../config/logger');
const { getWorkspaceId } = require('../../middleware/auth');
const { upsertLead, VALID_SOURCES, VALID_STATUSES } = require('./leadIngestor');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// Strip PostgREST filter metacharacters so a `search` value can't break out of
// the .or() filter expression (filter injection). Commas, parentheses and the
// wildcard/backslash chars are removed; the remainder is matched literally.
function sanitizeSearch(raw) {
  return String(raw || '').replace(/[,()\\%*]/g, '').trim().slice(0, 100);
}

// ── GET /leads ─────────────────────────────────────────────────────────────────
// List leads with optional filters

router.get('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' });

    const { source, status, assigned_to, search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (source && VALID_SOURCES.includes(source)) query = query.eq('source', source);
    if (status && VALID_STATUSES.includes(status)) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,company_name.ilike.%${safeSearch}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'leads: list failed');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /leads/:id ─────────────────────────────────────────────────────────────
// Get a single lead by ID

router.get('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' });

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Lead not found' });
      throw error;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, leadId: req.params.id }, 'leads: get failed');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PATCH /leads/:id ───────────────────────────────────────────────────────────
// Update lead status, assignment, score

router.patch('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' });

    const { status, assigned_to, score, notes } = req.body;

    const update = {};
    if (status && VALID_STATUSES.includes(status)) update.status = status;
    if (assigned_to) update.assigned_to = assigned_to;
    if (score !== undefined) update.score = Math.max(0, Math.min(100, Number(score)));
    if (notes !== undefined) update.notes = notes;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(update)
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Lead not found' });
      throw error;
    }

    logger.info({ leadId: data.id, updates: Object.keys(update) }, 'leads: updated');
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, leadId: req.params.id }, 'leads: patch failed');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /leads/ingest ─────────────────────────────────────────────────────────
// Ingest a lead from any source (used by webhooks, import scripts, manual entry)

router.post('/ingest', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' });

    const { source, externalId, name, email, phone, companyName, score, status, rawData, notes, assignedTo } = req.body;

    if (!source) return res.status(400).json({ success: false, error: 'source is required' });
    if (!VALID_SOURCES.includes(source)) {
      return res.status(400).json({ success: false, error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
    }

    const lead = await upsertLead({
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
    });

    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'leads: ingest failed');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /leads/import ─────────────────────────────────────────────────────────
// Bulk import leads from CSV (multipart/form-data, field name: 'file')
// Columns: name, email, phone, company_name, notes, source (default: manual)

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' });

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'CSV file is required (field name: file)' });
    }

    const MAX_ROWS = 1000;
    let records;
    try {
      records = csv.parse(req.file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseErr) {
      logger.error({ err: parseErr, workspaceId }, 'leads: csv parse failed');
      return res.status(400).json({ success: false, error: 'Invalid CSV format' });
    }

    if (records.length > MAX_ROWS) {
      return res.status(400).json({ success: false, error: `Maximum ${MAX_ROWS} rows per upload` });
    }

    let imported = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-indexed + header

      try {
        const source = row.source && VALID_SOURCES.includes(row.source) ? row.source : 'csv_import';
        const result = await upsertLead({
          workspaceId,
          source,
          externalId: row.external_id || row.id || undefined,
          name: row.name || undefined,
          email: row.email || undefined,
          phone: row.phone || undefined,
          companyName: row.company_name || row.company || undefined,
          notes: row.notes || undefined,
          rawData: { _csv_row: rowNum, _original: row },
        });

        // Determine if it was an insert or update by checking if the lead already existed
        // We infer: if the lead has an external_id matching the row, it's likely an update
        if (row.external_id || row.id) {
          updated++;
        } else {
          imported++;
        }
      } catch (rowErr) {
        errors.push({ row: rowNum, reason: rowErr.message || 'Unknown error' });
        logger.warn({ err: rowErr, workspaceId, row: rowNum }, 'leads: csv row failed');
      }
    }

    logger.info({ workspaceId, imported, updated, errors: errors.length, total: records.length }, 'leads: csv import complete');

    res.status(201).json({
      success: true,
      imported,
      updated,
      errors,
      total: records.length,
    });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'leads: csv import failed');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
// Exported for unit testing of the PostgREST filter-injection guard.
module.exports.sanitizeSearch = sanitizeSearch;
