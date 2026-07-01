/**
 * Lead Router — auto-assignment engine for unified leads.
 * Two strategies:
 *   1. Round-robin: distributes leads evenly across active sales reps
 *   2. Score-based: leads with score >= 70 go to top-performing rep
 *
 * Tracks state in workspace_settings JSONB (no separate counter table).
 */

const { supabase } = require('../../config/supabase');
const logger = require('../../config/logger');

/**
 * Get active sales reps for a workspace.
 * Returns users with role in ('sales_rep', 'agent', 'member') and active status.
 */
async function getActiveSalesReps(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        full_name,
        email
      )
    `)
    .eq('workspace_id', workspaceId)
    .in('role', ['sales_rep', 'agent', 'member'])
    .not('status', 'in', '("removed","archived","inactive","disabled")');

  if (error) {
    logger.error({ err: error, workspaceId }, 'leadRouter: failed to fetch sales reps');
    throw error;
  }

  return (data || []).filter(r => r.profiles);
}

/**
 * Get or initialize the round-robin counter from workspace_settings.
 */
async function getRoundRobinIndex(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_settings')
    .select('settings')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, workspaceId }, 'leadRouter: failed to get workspace settings');
    return 0;
  }

  const settings = data?.settings || {};
  return settings.last_assigned_rep_index || 0;
}

/**
 * Persist the round-robin counter back to workspace_settings.
 */
async function setRoundRobinIndex(workspaceId, index) {
  // Upsert the settings row — create if it doesn't exist
  const { data: existing } = await supabase
    .from('workspace_settings')
    .select('settings')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const settings = existing?.settings || {};
  settings.last_assigned_rep_index = index;

  const { error } = await supabase
    .from('workspace_settings')
    .upsert(
      { workspace_id: workspaceId, settings },
      { onConflict: 'workspace_id' }
    );

  if (error) {
    logger.error({ err: error, workspaceId }, 'leadRouter: failed to save round-robin index');
  }
}

/**
 * Get the top-performing rep (most closed_won deals in last 30 days).
 */
async function getTopPerformer(workspaceId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('crm_opportunities')
    .select('assigned_to, profiles:assigned_to(full_name)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'closed_won')
    .gte('updated_at', thirtyDaysAgo)
    .not('assigned_to', 'is', null);

  if (error) {
    logger.error({ err: error, workspaceId }, 'leadRouter: top performer query failed');
    return null;
  }

  // Count wins per rep
  const winCounts = {};
  for (const deal of data || []) {
    winCounts[deal.assigned_to] = (winCounts[deal.assigned_to] || 0) + 1;
  }

  // Find rep with most wins
  let topRep = null;
  let maxWins = 0;
  for (const [userId, count] of Object.entries(winCounts)) {
    if (count > maxWins) {
      maxWins = count;
      topRep = userId;
    }
  }

  return topRep;
}

/**
 * Check if auto-assignment is enabled for a workspace.
 */
async function isAutoAssignEnabled(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_settings')
    .select('settings')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error || !data) return false;
  return data.settings?.auto_assign_leads === true;
}

/**
 * Assign a lead using round-robin strategy.
 *
 * @param {string} leadId
 * @param {string} workspaceId
 * @returns {Promise<Object|null>} The assigned rep user_id, or null if no reps available
 */
async function assignLead(leadId, workspaceId) {
  const reps = await getActiveSalesReps(workspaceId);
  if (reps.length === 0) {
    logger.warn({ workspaceId }, 'leadRouter: no active sales reps available for assignment');
    return null;
  }

  if (reps.length === 1) {
    // Single rep — no rotation needed
    const repId = reps[0].user_id;
    await supabase
      .from('leads')
      .update({ assigned_to: repId })
      .eq('id', leadId)
      .eq('workspace_id', workspaceId);

    logger.info({ leadId, assignedTo: repId, strategy: 'single_rep' }, 'leadRouter: lead assigned');
    return repId;
  }

  // Round-robin
  const currentIndex = await getRoundRobinIndex(workspaceId);
  const nextIndex = currentIndex % reps.length;
  const assignedRep = reps[nextIndex].user_id;

  await supabase
    .from('leads')
    .update({ assigned_to: assignedRep })
    .eq('id', leadId)
    .eq('workspace_id', workspaceId);

  // Advance counter
  await setRoundRobinIndex(workspaceId, nextIndex + 1);

  logger.info({ leadId, assignedTo: assignedRep, strategy: 'round_robin', repIndex: nextIndex }, 'leadRouter: lead assigned');
  return assignedRep;
}

/**
 * Assign a high-scoring lead (>= 70) to the top-performing rep.
 * Falls back to round-robin if no top performer data available.
 *
 * @param {Object} lead - The full lead object (must have score and id)
 * @param {string} workspaceId
 * @returns {Promise<Object|null>} The assigned rep user_id, or null
 */
async function assignByScore(lead, workspaceId) {
  if (!lead || lead.score < 70) {
    // Not high-value enough for score-based — use round-robin
    return assignLead(lead.id, workspaceId);
  }

  const topRep = await getTopPerformer(workspaceId);
  if (topRep) {
    await supabase
      .from('leads')
      .update({ assigned_to: topRep })
      .eq('id', lead.id)
      .eq('workspace_id', workspaceId);

    logger.info({ leadId: lead.id, assignedTo: topRep, strategy: 'top_performer', score: lead.score }, 'leadRouter: high-value lead assigned');
    return topRep;
  }

  // Fallback to round-robin
  return assignLead(lead.id, workspaceId);
}

module.exports = { assignLead, assignByScore, isAutoAssignEnabled };