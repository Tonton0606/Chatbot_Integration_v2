const logger = require('../../config/logger');
/**
 * Google Maps Lead Generator - Node.js Service Bridge
 * 
 * Orchestrates the Python microservice for Google Maps lead generation.
 * NOW: Calls the isolated gmaps HTTP microservice (separate container)
 * INSTEAD OF spawning a Python child process.
 * 
 * Service Discovery:
 *   - In Docker: GMAPS_SERVICE_URL=http://gmaps:8000 (set in docker-compose)
 *   - In dev:    GMAPS_SERVICE_URL=http://localhost:8000 (or set manually)
 *   - Fallback:  spawns Python directly if service is unreachable
 * 
 * Handles:
 *   - Creating search configs in Supabase
 *   - Executing the HTTP microservice
 *   - Storing results in Supabase
 *   - Status tracking and progress updates
 */

const { supabase } = require('../../config/supabase');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const GMAPS_SERVICE_URL = process.env.GMAPS_SERVICE_URL || 'http://gmaps:8000';
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function getAdminClient() {
  return supabase;
}

/**
 * Execute the gmaps microservice via HTTP API to the isolated container.
 * Falls back to spawning Python directly if the HTTP service is unreachable.
 * Returns parsed JSON output.
 */
async function runPythonService(action, params) {
  // Try HTTP call to the isolated gmaps container first
  try {
    logger.info(`[gmaps-service] Calling HTTP microservice: ${GMAPS_SERVICE_URL}/api/search`);
    
    if (action === 'search') {
      const response = await axios.post(`${GMAPS_SERVICE_URL}/api/search`, {
        location: params.location,
        search_query: params.search_query,
        num_pages: params.num_pages || 1,
        enrichment_enabled: params.enrichment_enabled !== false,
        callback_url: '',  // No callback — we poll or just wait
      }, {
        timeout: 600000,  // 10 minutes for long searches
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data && response.data.success) {
        // Poll for completion
        const taskId = response.data.task_id;
        return await _pollGmapsTask(taskId);
      }
    }
    
    if (action === 'enrich') {
      const response = await axios.post(`${GMAPS_SERVICE_URL}/api/enrich`, {
        leads: params.leads,
      }, {
        timeout: 300000,  // 5 minutes
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.data && response.data.success) {
        return response.data;
      }
    }
    
    throw new Error(`HTTP microservice returned error for action=${action}`);
  } catch (httpErr) {
    logger.warn(`[gmaps-service] HTTP microservice call failed: ${httpErr.message}. ` +
      `Falling back to direct Python spawn. Set GMAPS_SERVICE_URL to disable this fallback.`);
    
    // Fallback: spawn Python directly (for backward compatibility)
    return _spawnPythonFallback(action, params);
  }
}

/**
 * Poll the gmaps HTTP microservice for task completion.
 */
async function _pollGmapsTask(taskId, maxRetries = 120, interval = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${GMAPS_SERVICE_URL}/api/status/${taskId}`, {
        timeout: 10000,
      });
      
      const task = response.data.task;
      
      if (task.status === 'completed') {
        logger.info(`[gmaps-service] Task ${taskId} completed with ${task.result?.total_places || 0} places`);
        return {
          success: true,
          places: task.result?.places || [],
          total_places: task.result?.total_places || 0,
        };
      }
      
      if (task.status === 'failed') {
        throw new Error(`Task ${taskId} failed: ${task.error || 'Unknown error'}`);
      }
      
      // Still running — wait and retry
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (pollErr) {
      if (i === maxRetries - 1) {
        throw new Error(`Timed out polling task ${taskId}: ${pollErr.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Task ${taskId} timed out after ${maxRetries * interval / 1000}s`);
}

/**
 * Fallback: spawn Python directly (backward compatible).
 */
function _spawnPythonFallback(action, params) {
  const { spawn } = require('child_process');
  const PYTHON_CMD = process.env.PYTHON_CMD || 'python3';
  const SERVICE_DIR = __dirname;
  const SERVICE_SCRIPT = require('path').join(SERVICE_DIR, 'gmaps_service.py');

  return new Promise((resolve, reject) => {
    const tempOutputFile = require('path').join(OUTPUT_DIR, 
      `result_${Date.now()}_${require('crypto').randomBytes(4).toString('hex')}.json`);
    const paramsJson = JSON.stringify(params);

    const args = [
      SERVICE_SCRIPT,
      '--action', action,
      '--params', paramsJson,
      '--output', tempOutputFile,
    ];

    const proc = spawn(PYTHON_CMD, args, {
      cwd: SERVICE_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python service exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        if (require('fs').existsSync(tempOutputFile)) {
          const result = JSON.parse(require('fs').readFileSync(tempOutputFile, 'utf-8'));
          require('fs').unlinkSync(tempOutputFile);
          resolve(result);
        } else {
          resolve(JSON.parse(stdout.trim()));
        }
      } catch (err) {
        reject(new Error(`Failed to read Python output: ${err.message}`));
      }
    });

    proc.on('error', (err) => reject(new Error(`Failed to start Python: ${err.message}`)));
    setTimeout(() => { proc.kill(); reject(new Error('Python timed out after 10 min')); }, 600000);
  });
}

/**
 * Create a new Google Maps search config in Supabase
 */
async function createSearchConfig(workspaceId, userId, params) {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('google_maps_search_configs')
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      search_label: params.search_label || `${params.search_query} in ${params.location}`,
      location: params.location,
      search_query: params.search_query,
      num_pages: params.num_pages || 1,
      status: 'pending',
      total_found: 0,
      total_enriched: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update search config status and counts in Supabase
 */
async function updateSearchConfig(configId, updates) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('google_maps_search_configs')
    .update(updates)
    .eq('id', configId);

  if (error) throw error;
}

/**
 * Insert leads from places data into Supabase
 */
async function insertLeads(places, workspaceId, searchConfigId) {
  const supabase = getAdminClient();

  const leads = places.map((place, index) => ({
    workspace_id: workspaceId,
    search_config_id: searchConfigId,
    business_name: place.title || place.business_name || 'Unknown',
    address: place.address || '',
    website: place.website || '',
    phone: place.phoneNumber || place.phone || '',
    description: place.description || '',
    rating: place.rating || null,
    reviews: place.ratingCount ? parseInt(place.ratingCount, 10) : null,
    category: place.type || place.category || '',
    keywords: Array.isArray(place.types) ? place.types.join(' || ') : (place.keywords || ''),
    price_level: place.priceLevel || '',
    opening_hours: typeof place.openingHours === 'object'
      ? JSON.stringify(place.openingHours)
      : (place.opening_hours || ''),
    enrichment_status: place.website ? 'pending' : 'skipped',
    lead_status: 'new',
  }));

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('google_maps_leads').insert(batch);
    if (error) {
      logger.error({ err: error }, `[gmaps-service] Error inserting leads batch ${i}:`);
      throw error;
    }
    inserted += batch.length;
  }

  return inserted;
}

/**
 * Update lead enrichment data in Supabase from Python enrichment output
 */
async function updateLeadEnrichments(searchConfigId) {
  const supabase = getAdminClient();

  // Read enrichment JSONL file
  const enrichmentFile = path.join(OUTPUT_DIR, `enrichment_${searchConfigId.slice(0, 8)}.jsonl`);
  if (!fs.existsSync(enrichmentFile)) {
    logger.info(`[gmaps-service] No enrichment file found for ${searchConfigId.slice(0, 8)}`);
    return 0;
  }

  // Get enrichment records
  const lines = fs.readFileSync(enrichmentFile, 'utf-8').trim().split('\n');
  const enrichedRows = lines
    .filter(l => l.trim())
    .map(l => JSON.parse(l));

  if (enrichedRows.length === 0) return 0;

  // Get the leads for this search config (ordered by id)
  const { data: leads, error } = await supabase
    .from('google_maps_leads')
    .select('id, business_name')
    .eq('search_config_id', searchConfigId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  let updatedCount = 0;

  for (const record of enrichedRows) {
    const lead = leads[record.row_index];
    if (!lead) continue;

    const info = record.data;
    const { error: updateError } = await supabase
      .from('google_maps_leads')
      .update({
        email: info.email || '',
        facebook: info.facebook || '',
        twitter: info.twitter || '',
        instagram: info.instagram || '',
        linkedin: info.linkedin || '',
        youtube: info.youtube || '',
        contact_page: info.contact_page || info.contact || '',
        enrichment_status: 'enriched',
      })
      .eq('id', lead.id);

    if (updateError) {
      logger.error({ err: updateError }, `[gmaps-service] Error updating lead ${lead.id}:`);
    } else {
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Run the full search pipeline:
 * 1. Create search config in DB
 * 2. Run Python search
 * 3. Store results in DB
 * 4. Run enrichment
 * 5. Update enrichment results
 */
async function runFullSearch(workspaceId, userId, params) {
  let searchConfigId;

  try {
    // Step 1: Create config record
    const config = await createSearchConfig(workspaceId, userId, params);
    searchConfigId = config.id;

    // Step 2: Mark as running
    await updateSearchConfig(searchConfigId, { status: 'running' });

    // Step 3: Run Python search
    const paramsWithIds = {
      ...params,
      search_config_id: searchConfigId,
      workspace_id: workspaceId,
      enrichment_enabled: params.enrichment_enabled !== false,
    };

    const result = await runPythonService('search', paramsWithIds);

    if (!result.success) {
      await updateSearchConfig(searchConfigId, {
        status: 'failed',
        error_message: result.error || 'Search failed',
      });
      return { success: false, error: result.error, searchConfigId };
    }

    // Step 4: Insert places into DB
    const places = result.places || [];
    const totalFound = await insertLeads(places, workspaceId, searchConfigId);

    // Step 5: Update enrichment results
    let totalEnriched = 0;
    try {
      totalEnriched = await updateLeadEnrichments(searchConfigId);
    } catch (enrichError) {
      logger.error({ err: enrichError }, '[gmaps-service] Error during enrichment update:');
    }

    // Step 6: Mark as completed
    await updateSearchConfig(searchConfigId, {
      status: 'completed',
      total_found: totalFound,
      total_enriched: totalEnriched,
    });

    return {
      success: true,
      searchConfigId,
      total_found: totalFound,
      total_enriched: totalEnriched,
    };

  } catch (err) {
    logger.error({ err: err }, '[gmaps-service] Pipeline error:');

    if (searchConfigId) {
      await updateSearchConfig(searchConfigId, {
        status: 'failed',
        error_message: err.message,
      }).catch(e => logger.error({ err: e }, 'Failed to update error status:'));
    }

    return { success: false, error: err.message, searchConfigId };
  }
}

/**
 * Get all search configs for a workspace
 */
async function getSearchConfigs(workspaceId) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('google_maps_search_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all leads for a search config
 */
async function getLeads(searchConfigId, filters = {}) {
  const supabase = getAdminClient();
  let query = supabase
    .from('google_maps_leads')
    .select('*')
    .eq('search_config_id', searchConfigId)
    .order('created_at', { ascending: true });

  if (filters.enrichment_status) {
    query = query.eq('enrichment_status', filters.enrichment_status);
  }
  if (filters.lead_status) {
    query = query.eq('lead_status', filters.lead_status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Update a lead's status or notes
 */
async function updateLead(leadId, updates) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('google_maps_leads')
    .update(updates)
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a search config and all its leads
 */
async function deleteSearchConfig(configId) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('google_maps_search_configs')
    .delete()
    .eq('id', configId);

  if (error) throw error;
  // Leads cascade delete via FK constraint
  return { success: true };
}

/**
 * Run enrichment on leads that are still 'pending' enrichment.
 * Calls the Python microservice to do the actual web scraping.
 */
async function runEnrichment(searchConfigId, workspaceId) {
  const supabase = getAdminClient();

  // Get leads that need enrichment
  const { data: leads, error } = await supabase
    .from('google_maps_leads')
    .select('id, business_name, website, address')
    .eq('search_config_id', searchConfigId)
    .eq('enrichment_status', 'pending')
    .not('website', 'is', null)
    .not('website', 'eq', '');

  if (error) throw error;
  if (!leads || leads.length === 0) return { enriched: 0, total: 0 };

  await updateSearchConfig(searchConfigId, { status: 'running' });

  // Build lead list with row_index so the Python service can map results back
  const leadsWithIndex = leads.map((lead, idx) => ({
    row_index: idx,
    business_name: lead.business_name,
    website: lead.website,
    address: lead.address,
  }));

  // Call the Python enrichment service
  const result = await runPythonService('enrich', {
    workspace_id: workspaceId,
    search_config_id: searchConfigId,
    leads: leadsWithIndex,
  });

  if (!result.success) {
    await updateSearchConfig(searchConfigId, {
      status: 'failed',
      error_message: result.error || 'Enrichment failed',
    });
    throw new Error(result.error || 'Enrichment failed');
  }

  // Read the enrichment JSONL file the Python service wrote and push to DB
  const enrichedCount = await updateLeadEnrichments(searchConfigId);

  // Recount enriched leads for accuracy
  const { data: enrichedLeads } = await supabase
    .from('google_maps_leads')
    .select('id')
    .eq('search_config_id', searchConfigId)
    .eq('enrichment_status', 'enriched');

  await updateSearchConfig(searchConfigId, {
    status: 'completed',
    total_enriched: enrichedLeads?.length || enrichedCount,
  });

  return { enriched: enrichedCount, total: leads.length };
}

module.exports = {
  runFullSearch,
  getSearchConfigs,
  getLeads,
  updateLead,
  deleteSearchConfig,
  runEnrichment,
  createSearchConfig,
  updateSearchConfig,
};