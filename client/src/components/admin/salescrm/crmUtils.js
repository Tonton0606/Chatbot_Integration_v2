import { Users, Activity, TrendingUp, Target, CheckCircle, Percent } from "lucide-react";

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatShortCurrency(amount) {
  if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `₱${Math.round(amount / 1000)}K`;
  return formatCurrency(amount);
}

export function formatDate(date) {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusClass(status) {
  if (status === "won") {
    return "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20";
  }
  if (status === "lost") {
    return "bg-[var(--danger-soft)] text-[var(--danger)] border-red-500/20";
  }
  return "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]";
}

export function stageColor(stageKey) {
  const map = {
    new: "var(--brand-cyan)",
    discovery: "var(--brand-cyan)",
    qualified: "var(--brand-gold)",
    proposal: "var(--brand-cyan)",
    negotiation: "#eab308",
    won: "var(--success)",
    lost: "var(--danger)",
  };
  return map[stageKey] || "var(--hover-bg)";
}

export function colorClasses(color) {
  const map = {
    blue: "crm-color-blue",
    amber: "crm-color-amber",
    emerald: "crm-color-emerald",
    green: "crm-color-green",
    red: "crm-color-red",
    purple: "crm-color-purple",
  };
  return map[color] || map.blue;
}

export function buildCRMKPIs(opportunities) {
  const open = opportunities.filter((opp) => opp.status === "open");
  const won = opportunities.filter((opp) => opp.status === "won");
  const lost = opportunities.filter((opp) => opp.status === "lost");

  const openPipelineValue = open.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const weightedPipeline = open.reduce(
    (sum, opp) =>
      sum + Number(opp.revenue || 0) * (Number(opp.probability || 0) / 100),
    0
  );

  const wonRevenue = won.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const conversionRate =
    opportunities.length > 0
      ? Math.round((won.length / opportunities.length) * 100)
      : 0;

  return [
    {
      id: "total",
      label: "Total Opportunities",
      value: opportunities.length,
      helper: "All opportunities",
      icon: Users,
      tone: "text-[var(--success)]",
    },
    {
      id: "open",
      label: "Open Pipeline",
      value: open.length,
      helper: "Active opportunities",
      icon: Activity,
      tone: "text-[var(--brand-cyan)]",
    },
    {
      id: "pipeline",
      label: "Pipeline Value",
      value: formatShortCurrency(openPipelineValue),
      helper: "Open expected revenue",
      icon: TrendingUp,
      tone: "text-[var(--brand-gold)]",
    },
    {
      id: "weighted",
      label: "Weighted Forecast",
      value: formatShortCurrency(weightedPipeline),
      helper: "Probability-adjusted",
      icon: Target,
      tone: "text-sky-400",
    },
    {
      id: "won",
      label: "Won Revenue",
      value: formatShortCurrency(wonRevenue),
      helper: "Closed won value",
      icon: CheckCircle,
      tone: "text-[var(--brand-cyan)]",
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      helper: `${lost.length} lost opportunities`,
      icon: Percent,
      tone: "text-orange-300",
    },
  ];
}
