import { supabase } from "../../config/supabaseClient";

export const CLIENT_LEADERBOARD_PERIODS = [
  "May 2026",
  "April 2026",
  "Q2 2026",
  "YTD 2026",
];

export const CLIENT_PERFORMANCE_BADGE_STYLES = {
  1: {
    label: "#1",
    className:
      "rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-gold)]",
  },
  2: {
    label: "#2",
    className:
      "rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]",
  },
  3: {
    label: "#3",
    className:
      "rounded-full border border-green-500/20 bg-[var(--success-soft)] px-3 py-1 text-xs font-bold text-[var(--success)]",
  },
  default: {
    label: "Ranked",
    className:
      "rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]",
  },
};

export const CLIENT_LEADERBOARD_BADGES = {
  "Top Closer": {
    icon: "TC",
    color: "var(--brand-gold)",
    bg: "var(--brand-gold-soft)",
  },
  "Highest Revenue": {
    icon: "HR",
    color: "var(--success)",
    bg: "var(--success-soft)",
  },
  "Best Conversion": {
    icon: "BC",
    color: "var(--brand-gold)",
    bg: "var(--brand-gold-soft)",
  },
  "Open Pipeline": {
    icon: "OP",
    color: "var(--brand-gold)",
    bg: "var(--brand-gold-soft)",
  },
  "Rising Performer": {
    icon: "RP",
    color: "var(--brand-gold)",
    bg: "var(--brand-gold-soft)",
  },
};

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function toNumber(value) {
  return Number(value || 0);
}

function isWon(deal) {
  return deal.status === "won" || deal.stage === "won";
}

function isLost(deal) {
  return deal.status === "lost" || deal.stage === "lost";
}

function isOpen(deal) {
  return !isWon(deal) && !isLost(deal);
}

function getOwnerKey(deal) {
  if (deal.assignment_type === "self") return "self";

  if (deal.assignment_type === "employee" && deal.assigned_user_id) {
    return `user_${deal.assigned_user_id}`;
  }

  if (deal.assignment_type === "contact" && deal.assigned_contact_id) {
    return `contact_${deal.assigned_contact_id}`;
  }

  if (deal.assignment_type === "other" && deal.assigned_name) {
    return `other_${deal.assigned_name}`;
  }

  return "unassigned";
}

function getOwnerName(deal) {
  if (deal.assignment_type === "self") return "Self";

  if (deal.assignment_type === "employee") {
    return deal.assigned_user?.full_name || deal.assigned_user?.email || "Employee";
  }

  if (deal.assignment_type === "contact") {
    return deal.assigned_contact?.full_name || "Contact";
  }

  if (deal.assignment_type === "other") {
    return deal.assigned_name || "Other";
  }

  return "Unassigned";
}

function getOwnerEmail(deal) {
  if (deal.assignment_type === "employee") {
    return deal.assigned_user?.email || "";
  }

  if (deal.assignment_type === "contact") {
    return deal.assigned_contact?.email || "";
  }

  return "";
}

function getBadges(person, leaders) {
  const badges = [];

  if (person.dealsWon > 0 && person.dealsWon === leaders.maxWon) {
    badges.push("Top Closer");
  }

  if (person.revenue > 0 && person.revenue === leaders.maxRevenue) {
    badges.push("Highest Revenue");
  }

  if (
    person.conversionRate > 0 &&
    person.conversionRate === leaders.maxConversion
  ) {
    badges.push("Best Conversion");
  }

  if (person.pipelineValue > 0) {
    badges.push("Open Pipeline");
  }

  if (badges.length === 0 && person.totalDeals > 0) {
    badges.push("Rising Performer");
  }

  return badges;
}

function buildAiCoaching(person) {
  if (person.name === "Unassigned") {
    return [
      "Assign owners to active deals so revenue, accountability, and sales coaching are correctly attributed.",
    ];
  }

  const notes = [];

  if (person.pipelineValue > 0) {
    notes.push(
      "Review open pipeline and prioritize next actions for high-value workspace deals."
    );
  }

  if (person.conversionRate < 30 && person.totalDeals > 0) {
    notes.push(
      "Conversion rate is below target. Review qualification criteria and follow-up cadence."
    );
  }

  if (person.dealsWon > 0) {
    notes.push(
      "Won-deal momentum is active. Capture close patterns and repeat them with similar opportunities."
    );
  }

  if (notes.length === 0) {
    notes.push("No coaching alerts yet. Add more assigned deals to build signals.");
  }

  return notes;
}

function buildRecentActivities(person) {
  return [
    {
      id: `${person.id}_activity_1`,
      type: "system",
      note: `${person.totalDeals} assigned deal(s), ${person.dealsWon} won.`,
      date: new Date().toISOString().slice(0, 10),
    },
  ];
}

function normalizeGroupToPerson(group, rank, leaders) {
  const totalDeals = group.deals.length;
  const wonDeals = group.deals.filter(isWon);
  const lostDeals = group.deals.filter(isLost);
  const openDeals = group.deals.filter(isOpen);

  const revenue = wonDeals.reduce(
    (sum, deal) => sum + toNumber(deal.expected_revenue),
    0
  );

  const pipelineValue = openDeals.reduce(
    (sum, deal) => sum + toNumber(deal.expected_revenue),
    0
  );

  const conversionRate =
    totalDeals > 0
      ? Number(((wonDeals.length / totalDeals) * 100).toFixed(1))
      : 0;

  const person = {
    id: group.ownerId,
    workspace_id: group.workspaceId,
    profile_id: group.profileId,
    owner_id: group.ownerId,

    rank,
    name: group.name,
    role: group.role,
    email: group.email,

    dealsWon: wonDeals.length,
    revenue,
    conversionRate,
    pipelineValue,
    activities: totalDeals,
    trend: revenue > 0 ? "up" : "stable",

    breakdown: {
      open: openDeals.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      total: totalDeals,
    },

    wonDeals: wonDeals.map((deal) => deal.title || "Untitled Deal"),
    openDeals: openDeals.map((deal) => deal.title || "Untitled Deal"),
    recentActivities: [],
    aiCoaching: [],

    created_at: group.deals[0]?.created_at || null,
    updated_at: group.deals[0]?.updated_at || null,
    totalDeals,
  };

  person.badges = getBadges(person, leaders);
  person.aiCoaching = buildAiCoaching(person);
  person.recentActivities = buildRecentActivities(person);

  return person;
}

function buildLeaderboard(deals) {
  const groups = new Map();

  for (const deal of deals) {
    const ownerId = getOwnerKey(deal);

    if (!groups.has(ownerId)) {
      groups.set(ownerId, {
        ownerId,
        workspaceId: deal.workspace_id,
        profileId: deal.assigned_user_id || null,
        name: getOwnerName(deal),
        email: getOwnerEmail(deal),
        role:
          ownerId === "unassigned"
            ? "Unassigned Owner"
            : deal.assignment_type === "self"
              ? "Workspace Owner"
              : deal.assignment_type === "employee"
                ? "Employee"
                : deal.assignment_type === "contact"
                  ? "Contact Owner"
                  : "External Owner",
        deals: [],
      });
    }

    groups.get(ownerId).deals.push(deal);
  }

  const rawGroups = Array.from(groups.values());

  const preview = rawGroups.map((group) => {
    const wonDeals = group.deals.filter(isWon);

    const revenue = wonDeals.reduce(
      (sum, deal) => sum + toNumber(deal.expected_revenue),
      0
    );

    const conversionRate =
      group.deals.length > 0
        ? Number(((wonDeals.length / group.deals.length) * 100).toFixed(1))
        : 0;

    return {
      ...group,
      revenue,
      wonCount: wonDeals.length,
      conversionRate,
    };
  });

  const leaders = {
    maxRevenue: Math.max(...preview.map((item) => item.revenue), 0),
    maxWon: Math.max(...preview.map((item) => item.wonCount), 0),
    maxConversion: Math.max(...preview.map((item) => item.conversionRate), 0),
  };

  return rawGroups
    .map((group) => {
      const wonDeals = group.deals.filter(isWon);

      const revenue = wonDeals.reduce(
        (sum, deal) => sum + toNumber(deal.expected_revenue),
        0
      );

      const pipelineValue = group.deals
        .filter(isOpen)
        .reduce((sum, deal) => sum + toNumber(deal.expected_revenue), 0);

      return {
        group,
        revenue,
        pipelineValue,
        wonCount: wonDeals.length,
        totalDeals: group.deals.length,
      };
    })
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.wonCount !== a.wonCount) return b.wonCount - a.wonCount;
      return b.pipelineValue - a.pipelineValue;
    })
    .map((item, index) =>
      normalizeGroupToPerson(item.group, index + 1, leaders)
    );
}

function buildTeamKpis(leaderboard) {
  const totalRevenue = leaderboard.reduce(
    (sum, person) => sum + person.revenue,
    0
  );

  const dealsWon = leaderboard.reduce(
    (sum, person) => sum + person.dealsWon,
    0
  );

  const totalDeals = leaderboard.reduce(
    (sum, person) => sum + person.totalDeals,
    0
  );

  const avgConversionRate =
    totalDeals > 0 ? Number(((dealsWon / totalDeals) * 100).toFixed(1)) : 0;

  return {
    topPerformer: leaderboard[0]?.name || "No data",
    totalRevenue,
    avgConversionRate,
    activitiesCompleted: totalDeals,
    dealsWon,
    followUpsCompleted: leaderboard.reduce(
      (sum, person) => sum + person.breakdown.open,
      0
    ),
  };
}

function buildActivityTrend(deals) {
  const now = new Date();

  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - 7);

  const previousWeekStart = new Date(now);
  previousWeekStart.setDate(now.getDate() - 14);

  const currentWeek = deals.filter(
    (deal) => new Date(deal.updated_at || deal.created_at) >= currentWeekStart
  );

  const previousWeek = deals.filter((deal) => {
    const date = new Date(deal.updated_at || deal.created_at);
    return date >= previousWeekStart && date < currentWeekStart;
  });

  return [
    {
      id: "activity_trend_current",
      period: "This Week",
      week: "This Week",
      calls: currentWeek.length,
      emails: currentWeek.filter(isOpen).length,
      meetings: currentWeek.filter(isWon).length,
    },
    {
      id: "activity_trend_previous",
      period: "Last Week",
      week: "Last Week",
      calls: previousWeek.length,
      emails: previousWeek.filter(isOpen).length,
      meetings: previousWeek.filter(isWon).length,
    },
  ];
}

function buildCoachingInsights(leaderboard) {
  return leaderboard.slice(0, 5).map((person) => ({
    id: `coaching_${person.id}`,
    name: person.name,
    signal:
      person.name === "Unassigned"
        ? "Assignment Needed"
        : person.pipelineValue > 0
          ? "Pipeline Active"
          : "Monitor",
    message:
      person.name === "Unassigned"
        ? "Unassigned deals should be reviewed before progressing to advanced stages."
        : `${person.name} has ${person.breakdown.open} open deal(s), ${person.dealsWon} won deal(s), and ${formatCurrency(person.revenue)} closed revenue.`,
  }));
}

function filterByPeriod(deals, period) {
  if (!period) return deals;

  const now = new Date();

  if (period.startsWith("May 2026")) {
    return deals.filter((deal) => {
      const date = new Date(deal.updated_at || deal.created_at);
      return date.getFullYear() === 2026 && date.getMonth() === 4;
    });
  }

  if (period.startsWith("April 2026")) {
    return deals.filter((deal) => {
      const date = new Date(deal.updated_at || deal.created_at);
      return date.getFullYear() === 2026 && date.getMonth() === 3;
    });
  }

  if (period.startsWith("Q2 2026")) {
    return deals.filter((deal) => {
      const date = new Date(deal.updated_at || deal.created_at);
      return date.getFullYear() === 2026 && date.getMonth() >= 3 && date.getMonth() <= 5;
    });
  }

  if (period.startsWith("YTD 2026")) {
    return deals.filter((deal) => {
      const date = new Date(deal.updated_at || deal.created_at);
      return date.getFullYear() === 2026;
    });
  }

  return deals.filter((deal) => {
    const date = new Date(deal.updated_at || deal.created_at);
    return date <= now;
  });
}

export async function getClientSalesLeaderboardData(workspaceId, options = {}) {
  requireWorkspaceId(workspaceId);

  const { period = CLIENT_LEADERBOARD_PERIODS[0] } = options;

  const { data: deals, error } = await supabase
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
      source,
      assignment_type,
      assigned_user_id,
      assigned_contact_id,
      assigned_name,
      created_at,
      updated_at,
      archived_at,
      assigned_user:profiles!client_deals_assigned_user_id_fkey (
        id,
        full_name,
        email
      ),
      assigned_contact:client_contacts!client_deals_assigned_contact_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const filteredDeals = filterByPeriod(deals || [], period);

  const leaderboard = buildLeaderboard(filteredDeals);
  const teamKpis = buildTeamKpis(leaderboard);
  const activityTrend = buildActivityTrend(filteredDeals);
  const coachingInsights = buildCoachingInsights(leaderboard);

  return {
    leaderboard,
    teamKpis,
    activityTrend,
    coachingInsights,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

export function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
