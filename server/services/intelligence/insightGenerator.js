const { toNumber } = require("./dataNormalizer");

function severityForChange(changePct, direction = "drop") {
  const magnitude = Math.abs(changePct);
  if (direction === "drop" && magnitude >= 30) return "critical";
  if (magnitude >= 15) return "warning";
  return "info";
}

function buildDeterministicInsights({ module, metrics = {}, predictions = [] }) {
  const insights = [];
  const revenue = toNumber(metrics.revenue || metrics.total_revenue || metrics.revenue_closed);
  const leads = toNumber(metrics.new_leads);
  const conversion = toNumber(metrics.conversion_rate || metrics.lead_conversion_rate);
  const overdue = toNumber(metrics.overdue_amount);
  const collectionRate = toNumber(metrics.collection_rate);

  if (revenue > 0) {
    insights.push({
      title: "Revenue Signal Detected",
      content: `Current revenue signal is ${revenue.toLocaleString("en-PH")} across the selected intelligence sources.`,
      severity: "positive",
      insight_type: "summary",
      confidence: 78,
      evidence: { revenue },
      recommended_actions: [{ type: "review_forecast", label: "Review revenue forecast" }],
    });
  }

  if (leads > 0 && conversion <= 20) {
    insights.push({
      title: "Lead Conversion Needs Attention",
      content: `Lead conversion is ${conversion}%, which may indicate funnel friction or lower lead quality.`,
      severity: "warning",
      insight_type: "risk",
      confidence: 73,
      evidence: { leads, conversion_rate: conversion },
      recommended_actions: [{ type: "create_task", label: "Audit lead qualification stages" }],
    });
  }

  if (overdue > 0 || (collectionRate > 0 && collectionRate < 70)) {
    insights.push({
      title: "Collections Risk",
      content: `Collections need review. Overdue amount is ${overdue.toLocaleString("en-PH")} and collection rate is ${collectionRate}%.`,
      severity: overdue > 100000 ? "critical" : "warning",
      insight_type: "risk",
      confidence: 80,
      evidence: { overdue_amount: overdue, collection_rate: collectionRate },
      recommended_actions: [{ type: "send_alert", label: "Notify finance owner" }],
    });
  }

  for (const prediction of predictions) {
    const first = toNumber(prediction.forecast_data?.[0]?.value);
    const last = toNumber(prediction.forecast_data?.[prediction.forecast_data.length - 1]?.value);
    if (first && last) {
      const changePct = Math.round(((last - first) / first) * 100);
      insights.push({
        title: `${prediction.metric.replace(/_/g, " ")} Forecast ${changePct >= 0 ? "Upside" : "Drop"}`,
        content: `${prediction.metric.replace(/_/g, " ")} is forecast to ${changePct >= 0 ? "increase" : "drop"} ${Math.abs(changePct)}% over ${prediction.horizon_days} days.`,
        severity: changePct >= 0 ? "positive" : severityForChange(changePct),
        insight_type: "trend",
        confidence: prediction.confidence,
        evidence: { metric: prediction.metric, forecast: prediction.forecast_data },
        recommended_actions: changePct < -15
          ? [{ type: "send_alert", label: "Escalate forecasted decline" }]
          : [{ type: "monitor", label: "Keep monitoring trend" }],
      });
    }
  }

  if (!insights.length) {
    insights.push({
      title: `${module.name} Ready`,
      content: "The intelligence module is configured. Add source data or run ingestion to generate deeper insights.",
      severity: "info",
      insight_type: "summary",
      confidence: 60,
      evidence: { metrics },
      recommended_actions: [{ type: "connect_source", label: "Connect more data sources" }],
    });
  }

  return insights;
}

module.exports = { buildDeterministicInsights };
