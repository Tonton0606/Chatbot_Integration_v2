/**
 * Facebook Observer — Loop Engine OBSERVE Source
 *
 * Pulls two data streams:
 * 1. facebook_events table (webhook events buffered in real-time)
 * 2. Meta Ads API — campaign insights (ROAS, CTR, spend, leads, purchases)
 *
 * Returns normalized metrics compatible with the Loop Engine's mergeMetricMaps().
 */

const { supabase } = require("../../../config/supabase");
const logger = require("../../../config/logger");

const FB_GRAPH_BASE = "https://graph.facebook.com/v22.0";
const AD_INSIGHTS_FIELDS = [
  "campaign_id", "campaign_name", "adset_id", "adset_name",
  "impressions", "reach", "clicks", "spend",
  "actions", "action_values",
  "ctr", "cpc", "cpm", "cpp",
  "date_start", "date_stop",
].join(",");

// ── Meta Ads API helpers ─────────────────────────────────────────────────────

async function fetchAdInsights(adAccountId, accessToken, days = 7) {
  if (!adAccountId || !accessToken) return [];

  const datePreset = days <= 1 ? "today" : days <= 7 ? "last_7d" : days <= 28 ? "last_28d" : "last_month";

  const url = new URL(`${FB_GRAPH_BASE}/act_${adAccountId}/insights`);
  url.searchParams.set("fields", AD_INSIGHTS_FIELDS);
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("level", "adset");
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", accessToken);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.warn({ err, adAccountId }, "[fb:observer] insights API error");
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    logger.warn({ err: err.message, adAccountId }, "[fb:observer] insights fetch failed");
    return [];
  }
}

function extractActionValue(actions = [], type) {
  const match = actions.find(a => a.action_type === type);
  return match ? parseFloat(match.value || 0) : 0;
}

function normalizeInsightRow(row) {
  const spend        = parseFloat(row.spend || 0);
  const clicks       = parseInt(row.clicks || 0);
  const impressions  = parseInt(row.impressions || 0);
  const actions      = Array.isArray(row.actions) ? row.actions : [];
  const actionValues = Array.isArray(row.action_values) ? row.action_values : [];

  const leads        = extractActionValue(actions, "lead") || extractActionValue(actions, "onsite_web_lead");
  const purchases    = extractActionValue(actions, "purchase");
  const purchaseVal  = extractActionValue(actionValues, "purchase");

  const ctr          = parseFloat(row.ctr || 0);
  const cpc          = parseFloat(row.cpc || 0);
  const cpm          = parseFloat(row.cpm || 0);
  const cpp          = parseFloat(row.cpp || 0);
  const roas         = spend > 0 ? parseFloat((purchaseVal / spend).toFixed(3)) : 0;
  const costPerLead  = leads > 0 ? parseFloat((spend / leads).toFixed(2)) : 0;

  return {
    campaign_id:    row.campaign_id,
    campaign_name:  row.campaign_name || "Unknown Campaign",
    ad_set_id:      row.adset_id,
    ad_set_name:    row.adset_name || "Unknown Ad Set",
    date_start:     row.date_start,
    date_stop:      row.date_stop,
    impressions, reach: parseInt(row.reach || 0),
    clicks, spend, leads, purchases, purchase_value: purchaseVal,
    ctr, cpc, cpm, cpp, roas, cost_per_lead: costPerLead,
    raw_payload: row,
  };
}

// ── Persist ad snapshots to DB ───────────────────────────────────────────────

async function persistAdSnapshots(workspaceId, pageId, adAccountId, rows) {
  if (!rows.length) return;
  const records = rows.map(r => ({
    workspace_id:  workspaceId,
    page_id:       pageId,
    ad_account_id: adAccountId,
    ...r,
  }));
  const { error } = await supabase.from("facebook_ad_snapshots").insert(records);
  if (error) logger.warn({ error }, "[fb:observer] snapshot insert failed");
}

// ── Aggregate webhook events from buffer ─────────────────────────────────────

async function aggregateWebhookEvents(workspaceId, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("facebook_events")
    .select("event_type, payload, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) return {};

  const counts = { messages: 0, leads: 0, ad_events: 0, page_events: 0 };
  for (const ev of data) {
    if (ev.event_type === "message")   counts.messages++;
    else if (ev.event_type === "lead") counts.leads++;
    else if (ev.event_type === "ad_event") counts.ad_events++;
    else counts.page_events++;
  }

  return counts;
}

// ── Main OBSERVE function ─────────────────────────────────────────────────────

async function observeFacebook(workspaceId, days = 7) {
  // 1. Load FB page config for this workspace
  const { data: pages } = await supabase
    .from("fb_pages")
    .select("page_id, fb_token, fb_name")
    .or(`workspace_id.eq.${workspaceId},connected_workspace_id.eq.${workspaceId}`)
    .limit(5);

  const page = pages?.[0];
  const pageId      = page?.page_id || null;
  const accessToken = page?.fb_token || process.env.FB_PAGE_ACCESS_TOKEN || null;

  // 2. Pull ad insights if we have an ad account configured
  const adAccountId = process.env.FB_AD_ACCOUNT_ID || null;
  let adRows = [];

  if (adAccountId && accessToken) {
    const raw = await fetchAdInsights(adAccountId, accessToken, days);
    adRows = raw.map(normalizeInsightRow);
    await persistAdSnapshots(workspaceId, pageId, adAccountId, adRows);
  } else {
    // Fall back to latest snapshots from DB
    const { data: snapshots } = await supabase
      .from("facebook_ad_snapshots")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);
    adRows = snapshots || [];
  }

  // 3. Aggregate ad metrics
  const totals = adRows.reduce((acc, row) => {
    acc.fb_impressions   += Number(row.impressions   || 0);
    acc.fb_clicks        += Number(row.clicks        || 0);
    acc.fb_spend         += Number(row.spend         || 0);
    acc.fb_leads         += Number(row.leads         || 0);
    acc.fb_purchases     += Number(row.purchases     || 0);
    acc.fb_purchase_value+= Number(row.purchase_value|| 0);
    return acc;
  }, { fb_impressions: 0, fb_clicks: 0, fb_spend: 0, fb_leads: 0, fb_purchases: 0, fb_purchase_value: 0 });

  const fb_roas = totals.fb_spend > 0
    ? parseFloat((totals.fb_purchase_value / totals.fb_spend).toFixed(3))
    : 0;

  const fb_ctr = totals.fb_impressions > 0
    ? parseFloat(((totals.fb_clicks / totals.fb_impressions) * 100).toFixed(3))
    : 0;

  const fb_cost_per_lead = totals.fb_leads > 0
    ? parseFloat((totals.fb_spend / totals.fb_leads).toFixed(2))
    : 0;

  const fb_cost_per_purchase = totals.fb_purchases > 0
    ? parseFloat((totals.fb_spend / totals.fb_purchases).toFixed(2))
    : 0;

  // 4. Webhook event counts
  const eventCounts = await aggregateWebhookEvents(workspaceId, days);

  // 5. Best/worst campaigns
  const sortedByRoas = [...adRows].sort((a, b) => (b.roas || 0) - (a.roas || 0));
  const topCampaign   = sortedByRoas[0]?.campaign_name || null;
  const worstCampaign = sortedByRoas[sortedByRoas.length - 1]?.campaign_name || null;
  const lowRoasCampaigns = adRows.filter(r => r.roas > 0 && r.roas < 1.5).length;

  return {
    module: "Facebook",
    period_days: days,
    page_id: pageId,
    metrics: {
      ...totals,
      fb_roas,
      fb_ctr,
      fb_cost_per_lead,
      fb_cost_per_purchase,
      fb_active_campaigns: new Set(adRows.map(r => r.campaign_id).filter(Boolean)).size,
      fb_low_roas_campaigns: lowRoasCampaigns,
      fb_messages:    eventCounts.messages   || 0,
      fb_lead_events: eventCounts.leads      || 0,
      fb_page_events: eventCounts.page_events|| 0,
    },
    top_campaign:   topCampaign,
    worst_campaign: worstCampaign,
    campaigns:      adRows.slice(0, 10),
  };
}

// ── Mark webhook events as processed ─────────────────────────────────────────

async function markEventsProcessed(workspaceId, before = new Date().toISOString()) {
  await supabase
    .from("facebook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("processed", false)
    .lte("created_at", before);
}

module.exports = { observeFacebook, markEventsProcessed };
