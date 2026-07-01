import { supabase } from "../../config/supabaseClient";

export const CLIENT_PIPELINE_ANALYTICS_OWNERS = ["Unassigned", "Self"];

export const CLIENT_PIPELINE_ANALYTICS_SOURCES = [
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

export const CLIENT_PIPELINE_DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
];

const DEFAULT_STAGES = [
  {
    key: "new",
    name: "New",
    probability: 10,
    is_won: false,
    is_lost: false,
  },
  {
    key: "qualified",
    name: "Qualified",
    probability: 30,
    is_won: false,
    is_lost: false,
  },
  {
    key: "proposal",
    name: "Proposal",
    probability: 60,
    is_won: false,
    is_lost: false,
  },
  {
    key: "negotiation",
    name: "Negotiation",
    probability: 80,
    is_won: false,
    is_lost: false,
  },
  {
    key: "won",
    name: "Closed Won",
    probability: 100,
    is_won: true,
    is_lost: false,
  },
  {
    key: "lost",
    name: "Lost",
    probability: 0,
    is_won: false,
    is_lost: true,
  },
];

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

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

function getStageMeta(stageKey) {
  return DEFAULT_STAGES.find((stage) => stage.key === stageKey) || DEFAULT_STAGES[0];
}

function getAssignmentOwner(row) {
  if (row.assignment_type === "self") return "Self";

  if (row.assignment_type === "employee") {
    return row.assigned_user?.full_name || row.assigned_user?.email || "Employee";
  }

  if (row.assignment_type === "contact") {
    return row.assigned_contact?.full_name || "Contact";
  }

  if (row.assignment_type === "other") {
    return row.assigned_name || "Other";
  }

  return "Unassigned";
}

function normalizeDeal(row) {
  const contact = row.contact || {};
  const stageMeta = getStageMeta(row.stage);

  const isWon = row.status === "won" || row.stage === "won";
  const isLost = row.status === "lost" || row.stage === "lost";

  const probability =
    row.probability ?? stageMeta.probability ?? (isWon ? 100 : isLost ? 0 : 0);

  return {
    id: row.id,
    deal_id: row.id,
    deal_name: row.title || "Untitled Deal",

    customer_name:
      contact.company_name || contact.full_name || "Unassigned Customer",

    contact_id: row.contact_id || null,

    stage: stageMeta.name,
    stage_key: row.stage || "new",

    is_won: isWon,
    is_lost: isLost,
    status: row.status || "open",

    value: toNumber(row.expected_revenue),
    probability: toNumber(probability),
    weighted_value:
      toNumber(row.expected_revenue) * (toNumber(probability) / 100),

    source: row.source || "manual",
    owner_name: getAssignmentOwner(row),

    created_at: row.created_at,
    updated_at: row.updated_at,
    expected_close_date: row.expected_close_date,
    age_days: daysBetween(
      row.created_at,
      row.updated_at || new Date().toISOString()
    ),
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

function filterByDateRange(items, dateRange) {
  if (!dateRange || dateRange === "all") return items;

  const now = new Date();
  let cutoff = null;

  if (dateRange === "7d") {
    cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
  }

  if (dateRange === "30d") {
    cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
  }

  if (dateRange === "90d") {
    cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
  }

  if (dateRange === "ytd") {
    cutoff = new Date(now.getFullYear(), 0, 1);
  }

  if (!cutoff) return items;

  return items.filter((item) => {
    const createdAt = new Date(item.created_at || 0);
    return createdAt >= cutoff;
  });
}

function applyFilters({ opportunities, leads, filters }) {
  const safeFilters = filters || {};

  let filteredOpportunities = filterByDateRange(
    opportunities,
    safeFilters.dateRange
  );

  let filteredLeads = filterByDateRange(leads, safeFilters.dateRange);

  if (safeFilters.owner && safeFilters.owner !== "all") {
    filteredOpportunities = filteredOpportunities.filter(
      (deal) => deal.owner_name === safeFilters.owner
    );
  }

  if (safeFilters.source && safeFilters.source !== "all") {
    filteredOpportunities = filteredOpportunities.filter(
      (deal) => deal.source === safeFilters.source
    );

    filteredLeads = filteredLeads.filter(
      (lead) => lead.source === safeFilters.source
    );
  }

  return {
    opportunities: filteredOpportunities,
    leads: filteredLeads,
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
  return stages
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
  const qualifiedDeals = opportunities.filter(
    (deal) => deal.stage_key === "qualified"
  );

  const proposalDeals = opportunities.filter(
    (deal) => deal.stage_key === "proposal"
  );

  const negotiationDeals = opportunities.filter(
    (deal) => deal.stage_key === "negotiation"
  );

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

function buildInsights({
  kpis,
  stagePerformance,
  sourceAnalytics,
  forecasting,
  leads,
  opportunities,
}) {
  const highestDropOff = [...stagePerformance].sort(
    (a, b) => b.drop_off_rate - a.drop_off_rate
  )[0];

  const bestSource = [...sourceAnalytics]
    .filter((source) => source.leads_count > 0 || source.converted_count > 0)
    .sort((a, b) => b.win_rate - a.win_rate)[0];

  const insights = [
    {
      id: "client_insight_data_depth",
      type: opportunities.length < 5 ? "warning" : "info",
      title:
        opportunities.length < 5
          ? "Limited Workspace Pipeline Sample"
          : "Workspace Pipeline Active",
      description:
        opportunities.length < 5
          ? `Only ${opportunities.length} deal record(s) exist. Analytics are directional until more deals move through the workspace pipeline.`
          : "Pipeline analytics are derived from live workspace CRM records.",
      confidence: 88,
    },
    {
      id: "client_insight_pipeline_source",
      type: bestSource?.win_rate > 0 ? "info" : "warning",
      title:
        bestSource?.win_rate > 0
          ? "Best Performing Source"
          : "Source Data Still Building",
      description:
        bestSource?.win_rate > 0
          ? `${bestSource.source} currently has the strongest win signal at ${bestSource.win_rate}%.`
          : "Source analytics will become more useful once more leads convert into deals.",
      confidence: 84,
    },
    {
      id: "client_insight_forecast",
      type: forecasting.at_risk_deals.length > 0 ? "risk" : "info",
      title:
        forecasting.at_risk_deals.length > 0
          ? "At-Risk Deals Detected"
          : "No Open Forecast Risk",
      description:
        forecasting.at_risk_deals.length > 0
          ? `${forecasting.at_risk_deals.length} open deal(s) may need follow-up based on age or probability.`
          : "There are no open deals in forecast risk right now.",
      confidence: 82,
    },
    {
      id: "client_insight_conversion",
      type: kpis.conversion_rate > 25 ? "info" : "warning",
      title: "Lead-to-Won Conversion",
      description: `Current lead-to-won conversion is ${kpis.conversion_rate}% based on ${leads.length} lead(s) and won deals.`,
      confidence: 80,
    },
  ];

  if (highestDropOff?.drop_off_rate > 0) {
    insights.push({
      id: "client_insight_dropoff",
      type: "risk",
      title: `${highestDropOff.stage} Drop-off`,
      description: `${highestDropOff.stage} has a ${highestDropOff.drop_off_rate}% drop-off rate. Review qualification or proposal handoff.`,
      confidence: 78,
    });
  }

  return insights;
}

function buildOwners(opportunities) {
  return [...new Set(opportunities.map((deal) => deal.owner_name).filter(Boolean))];
}

function buildSources(leads, opportunities) {
  return [
    ...new Set([
      ...leads.map((lead) => lead.source).filter(Boolean),
      ...opportunities.map((deal) => deal.source).filter(Boolean),
    ]),
  ];
}

export async function getClientPipelineAnalyticsData(workspaceId, filters = {}) {
  requireWorkspaceId(workspaceId);

  const [
    { data: dealRows, error: dealsError },
    { data: leadRows, error: leadsError },
  ] = await Promise.all([
    supabase
      .from("client_deals")
      .select(`
        id,
        workspace_id,
        lead_id,
        contact_id,
        title,
        expected_revenue,
        probability,
        status,
        stage,
        expected_close_date,
        description,
        source,
        created_at,
        updated_at,
        archived_at,
        assignment_type,
        assigned_user_id,
        assigned_contact_id,
        assigned_name,
        contact:client_contacts!client_deals_contact_id_fkey (
          id,
          full_name,
          company_name,
          email
        ),
        assigned_contact:client_contacts!client_deals_assigned_contact_id_fkey (
          id,
          full_name,
          company_name,
          email
        ),
        assigned_user:profiles!client_deals_assigned_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("client_leads")
      .select("id, workspace_id, source, status, created_at, updated_at, archived_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (dealsError) throw dealsError;
  if (leadsError) throw leadsError;

  const allOpportunities = (dealRows || []).map(normalizeDeal);
  const allLeads = (leadRows || []).map(normalizeLead);

  const { opportunities, leads } = applyFilters({
    opportunities: allOpportunities,
    leads: allLeads,
    filters,
  });

  const stages = DEFAULT_STAGES;
  const kpis = buildKPIs(opportunities, leads);
  const stagePerformance = buildStagePerformance(opportunities, stages);
  const funnelData = buildFunnelData(leads, opportunities);
  const forecasting = buildForecasting(opportunities);
  const sourceAnalytics = buildSourceAnalytics(leads, opportunities);

  const insights = buildInsights({
    kpis,
    stagePerformance,
    sourceAnalytics,
    forecasting,
    leads,
    opportunities,
  });

  return {
    kpis,
    stagePerformance,
    funnelData,
    forecasting,
    sourceAnalytics,
    insights,
    owners: buildOwners(allOpportunities),
    sources: buildSources(allLeads, allOpportunities),
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
