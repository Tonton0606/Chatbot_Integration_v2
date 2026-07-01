/**
 * Intelligence Reports — Frontend Service
 * All API calls go through this service; never call fetch directly from components.
 */

import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function authHeaders() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (_) {}
  return {};
}

async function req(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()), ...options.headers };
  let response;
  try {
    response = await fetch(`${BASE}/intelligence/reports${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the backend server. Run: npm run dev");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `API error ${response.status}`);
  return json;
}

// ── Report definitions ────────────────────────────────────────────────────────

export async function listReports(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return req(`/?${qs}`);
}

export async function createReport(payload) {
  return req("/", { method: "POST", body: JSON.stringify(payload) });
}

export async function getReport(id) {
  return req(`/${id}`);
}

export async function deleteReport(id) {
  return req(`/${id}`, { method: "DELETE" });
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function getTemplates() {
  return req("/templates");
}

// ── Generation ────────────────────────────────────────────────────────────────

export async function generateReport(opts = {}) {
  return req("/generate", { method: "POST", body: JSON.stringify(opts) });
}

export async function runReport(id) {
  return req(`/${id}/run`, { method: "POST", body: JSON.stringify({}) });
}

// ── Scheduling ────────────────────────────────────────────────────────────────

export async function scheduleReport(id, payload) {
  return req(`/${id}/schedule`, { method: "POST", body: JSON.stringify(payload) });
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportReportJSON(id) {
  return req(`/${id}/export?format=json`);
}

export async function exportReportCSV(id, filename = "report.csv") {
  const headers = { ...(await authHeaders()) };
  const response = await fetch(`${BASE}/intelligence/reports/${id}/export?format=csv`, { headers });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getStatsOverview() {
  return req("/stats/overview");
}

// ── Client-side PDF export using jsPDF ───────────────────────────────────────

export async function exportPDF(reportData, title = "Intelligence Report") {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  const gold = [212, 175, 55];
  const dark = [15, 23, 42];
  const gray = [100, 116, 139];

  // Header bar
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("HERMES ERP  ·  INTELLIGENCE REPORTS", margin, 9);

  y = 22;
  doc.setTextColor(...dark);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(
    `Generated: ${new Date().toLocaleString()} · Module: ${(reportData.module || "").toUpperCase()} · Period: last ${reportData.period_days || 30} days`,
    margin,
    y
  );
  y += 10;

  const ai = reportData.ai_summary;
  if (ai?.executive_summary) {
    doc.setFillColor(245, 243, 233);
    const boxH = 26;
    doc.roundedRect(margin, y, pageW - margin * 2, boxH, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...gold);
    doc.text("✦ AI EXECUTIVE SUMMARY", margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(ai.executive_summary, pageW - margin * 2 - 8);
    doc.text(lines.slice(0, 3), margin + 4, y + 12);
    y += boxH + 8;
  }

  if (ai?.health_score !== null && ai?.health_score !== undefined) {
    const score = ai.health_score;
    const scoreColor = score >= 75 ? [22, 163, 74] : score >= 50 ? [234, 179, 8] : [220, 38, 38];
    doc.setFillColor(...scoreColor);
    doc.roundedRect(pageW - margin - 28, y - 32, 28, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("HEALTH", pageW - margin - 24, y - 27);
    doc.setFontSize(14);
    doc.text(`${score}`, pageW - margin - 20, y - 21);
  }

  const metrics = reportData.data?.metrics || reportData.data?.summary_metrics || {};
  if (Object.keys(metrics).length) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text("Key Metrics", margin, y);
    y += 6;
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 5;

    const entries = Object.entries(metrics);
    const colW = (pageW - margin * 2) / 3;

    entries.forEach(([key, val], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = margin + col * colW;
      const cy = y + row * 18;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(cx, cy, colW - 3, 15, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text(key.replace(/_/g, " ").toUpperCase(), cx + 3, cy + 5);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      const display = typeof val === "number" && val > 999 ? val.toLocaleString() : String(val ?? "—");
      doc.text(display, cx + 3, cy + 12);
    });

    y += Math.ceil(entries.length / 3) * 18 + 8;
  }

  const sections = [
    { label: "Highlights", items: ai?.highlights, color: [22, 163, 74] },
    { label: "Risks", items: ai?.risks, color: [220, 38, 38] },
    { label: "Recommendations", items: ai?.recommendations, color: [37, 99, 235] },
  ];

  for (const section of sections) {
    if (!section.items?.length) continue;
    if (y > 240) { doc.addPage(); y = margin; }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(section.label, margin, y);
    y += 5;

    section.items.forEach((item) => {
      doc.setFillColor(...section.color);
      doc.circle(margin + 2, y - 1.5, 1.2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      const lines = doc.splitTextToSize(item, pageW - margin * 2 - 8);
      doc.text(lines, margin + 6, y);
      y += lines.length * 4 + 2;
    });
    y += 4;
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(0, 285, pageW, 12, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text("CONFIDENTIAL — Hermes ERP Intelligence Reports", margin, 292);
  doc.text("Page 1", pageW - margin - 8, 292);

  doc.save(`${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}

// Legacy compat — old components may call this
export async function getReportsDashboard() {
  try {
    const [statsRes, reportsRes, templatesRes] = await Promise.all([
      getStatsOverview(),
      listReports({ limit: 20 }),
      getTemplates(),
    ]);
    return {
      stats: statsRes.stats || {},
      recentReports: reportsRes.reports || [],
      reportTemplates: templatesRes.templates || {},
    };
  } catch (err) {
    console.warn("[reportsService] getReportsDashboard:", err.message);
    return { stats: {}, recentReports: [], reportTemplates: {} };
  }
}
