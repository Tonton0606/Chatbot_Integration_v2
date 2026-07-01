import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h = { "Content-Type": "application/json" };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

async function apiFetch(path, options = {}) {
  const headers = { ...(await authHeaders()), ...options.headers };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

export const BIR_FORMS = [
  { code: "1601-C", name: "Monthly Remittance of Income Taxes Withheld on Compensation", frequency: "monthly" },
  { code: "1601-EQ", name: "Quarterly Remittance of Final Income Taxes Withheld", frequency: "quarterly" },
  { code: "2550M", name: "Monthly Value-Added Tax Declaration", frequency: "monthly" },
  { code: "2550Q", name: "Quarterly Value-Added Tax Return", frequency: "quarterly" },
  { code: "1702-RT", name: "Annual Income Tax Return (Regular)", frequency: "annual" },
  { code: "1702-EX", name: "Annual Income Tax Return (Exempt)", frequency: "annual" },
  { code: "1604-C", name: "Annual Information Return of Income Taxes Withheld on Compensation", frequency: "annual" },
  { code: "2316", name: "Certificate of Compensation Payment/Tax Withheld", frequency: "annual" },
  { code: "0619-E", name: "Monthly Remittance Form for Creditable Income Taxes Withheld", frequency: "monthly" },
  { code: "1601-FQ", name: "Quarterly Remittance Return of Final Income Taxes Withheld", frequency: "quarterly" },
];

export const COMPLIANCE_STATUSES = ["pending", "filed", "overdue", "waived"];

export async function getBIRComplianceDashboard() {
  const [data, summary] = await Promise.all([
    apiFetch("/intelligence/ph/bir"),
    apiFetch("/intelligence/ph/bir/summary"),
  ]);
  return { items: data, summary };
}

export async function createComplianceItem(item) {
  const json = await apiFetch("/intelligence/ph/bir", {
    method: "POST",
    body: JSON.stringify({
      form_code: item.form_code,
      description: item.description,
      category: item.category,
      due_date: item.due_date,
      frequency: item.frequency,
      workspace_tax_type: item.workspace_tax_type,
    }),
  });
  return json.data;
}

export async function updateComplianceItem(id, patch) {
  const json = await apiFetch(`/intelligence/ph/bir/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return json.data;
}

export async function getComplianceSummary() {
  const json = await apiFetch("/intelligence/ph/bir/summary");
  return json.data;
}
