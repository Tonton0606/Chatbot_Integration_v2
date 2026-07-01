import { supabase } from "../../config/supabaseClient";

export const PIPELINE_ANALYTICS_OWNERS = ["Unassigned"];

export const PIPELINE_ANALYTICS_SOURCES = [
  "manual",
  "website",
  "facebook",
  "referral",
  "email_campaign",
  "linkedin",
  "landing_page",
  "demo_request",
  "demo_booking",
];

export const PIPELINE_DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
];

const DEFAULT_STAGES = [
  { key: "new", name: "New", probability: 10, is_won: false, is_lost: false },
  { key: "qualified", name: "Qualified", probability: 30, is_won: false, is_lost: false },
  { key: "proposal", name: "Proposal", probability: 60, is_won: false, is_lost: false },
  { key: "negotiation", name: "Negotiation", probability: 80, is_won: false, is_lost: false },
  { key: "won", name: "Won", probability: 100, is_won: true, is_lost: false },
  { key: "lost", name: "Lost", probability: 0, is_won: false, is_lost: true },
];

function toNumber(value) {
  return Number(value || 0);
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function daysBetween(start, end) {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
  );
}

function normalizeOpportunity(row) {
  const stage = row.stage || {};
  const contact = row.contact || {};

  const isWon = row.status === "won" || stage.is_won === true;
  const isLost = row.status === "lost" || stage.is_lost === true;

  const stageName =
    stage.name ||
    (isWon ? "Won" : isLost ? "Lost" : row.status || "Open");

  const stageKey =
    stage.key ||
    (isWon ? "won" : isLost ? "lost" : row.status || "open");

  const probability =
    row.probability ?? stage.probability ?? (isWon ? 100 : isLost ? 0 : 0);

  return {
    id: row.id,
    deal_id: row.id,
    deal_name: row.title || "Untitled Opportunity",
    customer_name:
      contact.company_name ||
      contact.full_name ||
      "Unassigned Customer",
    contact_id: row.contact_id || null,
    stage_id: row.stage_id || null,
    stage: stageName,
    stage_key: stageKey,
    is_won: isWon,
    is_lost: isLost,
    status: row.status || "open",
    value: toNumber(row.expected_revenue),
    probability: toNumber(probability),
    weighted_value: toNumber(row.expected_revenue) * (toNumber(probability) / 100),
    source: row.source || "manual",
    created_at: row.created_at,
    updated_at: row.updated_at,
    expected_close_date: row.expected_close_date,
    age_days: daysBetween(row.created_at, row.updated_at || new Date().toISOString()),
  };
}

function normalizeLead(row) {
  return {
    id: row.id,
    source: row.source || "manual",
    status: row.status || "new",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildKPIs(opportunities, leads) {
  const open = opportunities.filter((deal) => !deal.is_won && !deal.is_lost);
  const won = opportunities.filter((deal) => deal.is_won);
  const lost = opportunities.filter((deal) => deal.is_lost);
  const closed = [...won, ...lost];

  const totalPipelineValue = open.reduce((sum, deal) => sum + deal.value, 0);
  const weightedForecast = open.reduce(
    (sum, deal) => sum + deal.weighted_value,
    0
  );

  const conversionBase = leads.length || opportunities.length;

  const conversionRate = pct(won.length, conversionBase);
  const winRate = pct(won.length, closed.length);

  const salesVelocityDays =
    won.length > 0
      ? Number(
          (
            won.reduce((sum, deal) => sum + deal.age_days, 0) / won.length
          ).toFixed(1)
        )
      : 0;

  const averageTimeInStageDays =
    open.length > 0
      ? Number(
          (
            open.reduce((sum, deal) => sum + deal.age_days, 0) / open.length
          ).toFixed(1)
        )
      : 0;

  return {
    total_pipeline_value: totalPipelineValue,
    weighted_forecast: Math.round(weightedForecast),
    conversion_rate: conversionRate,
    sales_velocity_days: salesVelocityDays,
    average_time_in_stage_days: averageTimeInStageDays,
    win_rate: winRate,
  };
}

function buildStagePerformance(opportunities, stages) {
  const orderedStages = stages.length ? stages : DEFAULT_STAGES;

  return orderedStages
    .map((stage, index) => {
      const deals = opportunities.filter((deal) => deal.stage_key === stage.key);
      const wonDeals = deals.filter((deal) => deal.is_won);
      const lostDeals = deals.filter((deal) => deal.is_lost);
      const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
      const weightedValue = deals.reduce(
        (sum, deal) => sum + deal.weighted_value,
        0
      );

      return {
        id: `stage_perf_${stage.key || index}`,
        stage: stage.name,
        deals_count: deals.length,
        total_value: totalValue,
        weighted_value: Math.round(weightedValue),
        conversion_rate: pct(wonDeals.length, deals.length),
        average_days:
          deals.length > 0
            ? Number(
                (
                  deals.reduce((sum, deal) => sum + deal.age_days, 0) /
                  deals.length
                ).toFixed(1)
              )
            : 0,
        drop_off_rate: pct(lostDeals.length, deals.length),
      };
    })
    .filter((item) => item.deals_count > 0);
}

function buildFunnelData(leads, opportunities) {
  const qualifiedDeals = opportunities.filter((deal) => deal.stage_key === "qualified");
  const proposalDeals = opportunities.filter((deal) => deal.stage_key === "proposal");
  const negotiationDeals = opportunities.filter((deal) => deal.stage_key === "negotiation");
  const wonDeals = opportunities.filter((deal) => deal.is_won);

  return [
    {
      id: "funnel_leads",
      stage: "Leads",
      count: leads.length,
      value: 0,
    },
    {
      id: "funnel_qualified",
      stage: "Qualified",
      count: qualifiedDeals.length,
      value: qualifiedDeals.reduce((sum, deal) => sum + deal.value, 0),
    },
    {
      id: "funnel_proposal",
      stage: "Proposal",
      count: proposalDeals.length,
      value: proposalDeals.reduce((sum, deal) => sum + deal.value, 0),
    },
    {
      id: "funnel_negotiation",
      stage: "Negotiation",
      count: negotiationDeals.length,
      value: negotiationDeals.reduce((sum, deal) => sum + deal.value, 0),
    },
    {
      id: "funnel_won",
      stage: "Closed Won",
      count: wonDeals.length,
      value: wonDeals.reduce((sum, deal) => sum + deal.value, 0),
    },
  ];
}

function buildForecasting(opportunities) {
  const open = opportunities.filter((deal) => !deal.is_won && !deal.is_lost);

  const bestCase = open
    .filter((deal) => deal.probability >= 70)
    .reduce((sum, deal) => sum + deal.value, 0);

  const commit = open
    .filter((deal) => deal.probability >= 50)
    .reduce((sum, deal) => sum + deal.value, 0);

  const weighted = open.reduce((sum, deal) => sum + deal.weighted_value, 0);

  const atRiskDeals = open
    .filter((deal) => deal.age_days >= 7 || deal.probability < 50)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((deal, index) => ({
      id: `risk_${index + 1}`,
      deal_id: deal.id,
      deal_name: deal.deal_name,
      customer_name: deal.customer_name,
      value: deal.value,
      stage: deal.stage,
      risk_reason:
        deal.age_days >= 7
          ? `No major update for ${deal.age_days} days`
          : "Low probability opportunity",
      confidence: Math.max(40, Math.min(95, deal.probability || 50)),
    }));

  return {
    best_case: bestCase,
    commit,
    weighted: Math.round(weighted),
    at_risk_deals: atRiskDeals,
  };
}

function buildSourceAnalytics(leads, opportunities) {
  const sources = new Set([
    ...leads.map((lead) => lead.source || "manual"),
    ...opportunities.map((deal) => deal.source || "manual"),
  ]);

  return [...sources].map((source, index) => {
    const sourceLeads = leads.filter((lead) => lead.source === source);
    const sourceDeals = opportunities.filter((deal) => deal.source === source);
    const wonDeals = sourceDeals.filter((deal) => deal.is_won);

    const averageValue =
      sourceDeals.length > 0
        ? Math.round(
            sourceDeals.reduce((sum, deal) => sum + deal.value, 0) /
              sourceDeals.length
          )
        : 0;

    return {
      id: `source_${index + 1}`,
      source,
      leads_count: sourceLeads.length,
      converted_count: wonDeals.length,
      win_rate: pct(wonDeals.length, sourceLeads.length || sourceDeals.length),
      average_value: averageValue,
    };
  });
}

function buildInsights(kpis, stagePerformance, sourceAnalytics, forecasting, leads, opportunities) {
  const highestDropOff = [...stagePerformance].sort(
    (a, b) => b.drop_off_rate - a.drop_off_rate
  )[0];

  const bestSource = [...sourceAnalytics]
    .filter((source) => source.leads_count > 0 || source.converted_count > 0)
    .sort((a, b) => b.win_rate - a.win_rate)[0];

  const insights = [
    {
      id: "insight_data_depth",
      type: opportunities.length < 5 ? "warning" : "info",
      title: opportunities.length < 5 ? "Limited Pipeline Sample" : "Pipeline Data Active",
      description:
        opportunities.length < 5
          ? `Only ${opportunities.length} opportunity record(s) exist. Analytics are directional until more deals move through the pipeline.`
          : "Pipeline analytics are now derived from live CRM records.",
      confidence: 88,
    },
    {
      id: "insight_pipeline_source",
      type: bestSource?.win_rate > 0 ? "info" : "warning",
      title: bestSource?.win_rate > 0 ? "Best Performing Source" : "Source Data Still Building",
      description:
        bestSource?.win_rate > 0
          ? `${bestSource.source} currently has the strongest win signal at ${bestSource.win_rate}%.`
          : "Source analytics will become more useful once more leads convert into opportunities.",
      confidence: 84,
    },
    {
      id: "insight_forecast",
      type: forecasting.at_risk_deals.length > 0 ? "risk" : "info",
      title:
        forecasting.at_risk_deals.length > 0
          ? "At-Risk Deals Detected"
          : "No Open Forecast Risk",
      description:
        forecasting.at_risk_deals.length > 0
          ? `${forecasting.at_risk_deals.length} open deal(s) may need follow-up based on age or probability.`
          : "There are no open opportunities in forecast risk right now.",
      confidence: 82,
    },
    {
      id: "insight_conversion",
      type: kpis.conversion_rate > 25 ? "info" : "warning",
      title: "Lead-to-Won Conversion",
      description: `Current lead-to-won conversion is ${kpis.conversion_rate}% based on ${leads.length} lead(s) and won opportunities.`,
      confidence: 80,
    },
  ];

  if (highestDropOff?.drop_off_rate > 0) {
    insights.push({
      id: "insight_dropoff",
      type: "risk",
      title: `${highestDropOff.stage} Drop-off`,
      description: `${highestDropOff.stage} has a ${highestDropOff.drop_off_rate}% drop-off rate. Review qualification or proposal handoff.`,
      confidence: 78,
    });
  }

  return insights;
}

export async function getPipelineAnalyticsData() {
  const [
    { data: opportunityRows, error: opportunitiesError },
    { data: leadRows, error: leadsError },
    { data: stageRows, error: stagesError },
  ] = await Promise.all([
    supabase
      .from("crm_opportunities")
      .select(`
        id,
        lead_id,
        contact_id,
        stage_id,
        title,
        expected_revenue,
        probability,
        status,
        expected_close_date,
        description,
        assigned_admin_id,
        source,
        created_at,
        updated_at,
        contact:contacts (
          id,
          full_name,
          company_name,
          email
        ),
        stage:crm_stages (
          id,
          key,
          name,
          probability,
          is_won,
          is_lost
        )
      `)
      .order("created_at", { ascending: false }),

    supabase
      .from("crm_leads")
      .select("id, source, status, created_at, updated_at")
      .order("created_at", { ascending: false }),

    supabase
      .from("crm_stages")
      .select("id, key, name, probability, is_won, is_lost, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  if (opportunitiesError) throw opportunitiesError;
  if (leadsError) throw leadsError;
  if (stagesError) throw stagesError;

  const opportunities = (opportunityRows || []).map(normalizeOpportunity);
  const leads = (leadRows || []).map(normalizeLead);
  const stages = stageRows || DEFAULT_STAGES;

  const kpis = buildKPIs(opportunities, leads);
  const stagePerformance = buildStagePerformance(opportunities, stages);
  const funnelData = buildFunnelData(leads, opportunities);
  const forecasting = buildForecasting(opportunities);
  const sourceAnalytics = buildSourceAnalytics(leads, opportunities);
  const insights = buildInsights(
    kpis,
    stagePerformance,
    sourceAnalytics,
    forecasting,
    leads,
    opportunities
  );

  return {
    kpis,
    stagePerformance,
    funnelData,
    forecasting,
    sourceAnalytics,
    insights,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

export function formatShortCurrency(value) {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(2)}M`;
  }

  if (value >= 1000) {
    return `₱${Math.round(value / 1000)}K`;
  }

  return formatCurrency(value);
}
