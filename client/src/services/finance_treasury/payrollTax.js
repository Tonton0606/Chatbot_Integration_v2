/**
 * Payroll Tax Service
 * TRAIN Law WT, SSS 2024, PhilHealth 5%, Pag-IBIG
 */

import { withAuthHeaders } from '../apiAuth';

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, options = {}, workspaceId) {
  const wsId = workspaceId || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(wsId ? { 'x-workspace-id': wsId } : {}),
      ...(await withAuthHeaders()),
      ...options.headers,
    },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

export async function calculatePayroll(workspaceId, payload) {
  const json = await apiFetch('/payroll-tax/calculate', { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json.data;
}

export async function getPayrollRuns(workspaceId, filters = {}) {
  const p = new URLSearchParams(filters);
  const json = await apiFetch(`/payroll-tax/runs${p.size ? '?' + p : ''}`, {}, workspaceId);
  return json.data;
}

export async function getPayrollRun(workspaceId, id) {
  const json = await apiFetch(`/payroll-tax/runs/${id}`, {}, workspaceId);
  return json.data;
}

export async function createPayrollRun(workspaceId, payload) {
  const json = await apiFetch('/payroll-tax/runs', { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json.data;
}

export async function addPayrollLines(workspaceId, runId, employees) {
  const json = await apiFetch(`/payroll-tax/runs/${runId}/lines`, { method: 'POST', body: JSON.stringify({ employees }) }, workspaceId);
  return json;
}

export async function updatePayrollRun(workspaceId, id, updates) {
  const json = await apiFetch(`/payroll-tax/runs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, workspaceId);
  return json.data;
}

export async function getYearlySummary(workspaceId, year) {
  const json = await apiFetch(`/payroll-tax/summary/${year}`, {}, workspaceId);
  return json.data;
}

// ── Client-side Calculation Helpers (mirrors server logic) ───────────────────

const TRAIN_BRACKETS = [
  { min: 0,       max: 20833,   base: 0,        rate: 0    },
  { min: 20834,   max: 33332,   base: 0,        rate: 0.15 },
  { min: 33333,   max: 66666,   base: 1875,     rate: 0.20 },
  { min: 66667,   max: 166666,  base: 8541.8,   rate: 0.25 },
  { min: 166667,  max: 666666,  base: 33541.8,  rate: 0.30 },
  { min: 666667,  max: Infinity,base: 183541.8, rate: 0.35 },
];

export function computeWithholdingTax(taxableCompensation) {
  const tc = parseFloat(taxableCompensation || 0);
  const b  = TRAIN_BRACKETS.find(br => tc >= br.min && tc <= br.max);
  return b ? b.base + (tc - b.min) * b.rate : 0;
}

export function computeSSS(monthlySalary) {
  const salary  = parseFloat(monthlySalary || 0);
  const msc     = Math.min(Math.max(Math.ceil(salary / 500) * 500, 5000), 35000);
  const ee      = parseFloat((msc * 0.045).toFixed(2));
  const er      = parseFloat((msc * 0.095).toFixed(2));
  const ec      = salary <= 14750 ? 10 : 30;
  const mpfBase = Math.min(Math.max(salary - 20000, 0), 15000);
  const mpf_ee  = parseFloat((mpfBase * 0.025).toFixed(2));
  const mpf_er  = parseFloat((mpfBase * 0.025).toFixed(2));
  return { ee, er, ec, mpf_ee, mpf_er, total_ee: ee + mpf_ee, total_er: er + ec + mpf_er };
}

export function computePhilHealth(monthlySalary) {
  const salary = parseFloat(monthlySalary || 0);
  const base   = Math.min(Math.max(salary, 10000), 100000);
  const share  = parseFloat((base * 0.025).toFixed(2));
  return { ee: share, er: share, total: share * 2 };
}

export function computePagibig(monthlySalary) {
  const salary = parseFloat(monthlySalary || 0);
  const eeRate = salary <= 1500 ? 0.01 : 0.02;
  const ee     = Math.min(parseFloat((salary * eeRate).toFixed(2)), 100);
  const er     = Math.min(parseFloat((salary * 0.02).toFixed(2)), 100);
  return { ee, er, total: ee + er };
}

export function computeFullPayroll(monthlySalary, deMinimisBenefits = 0, otherTaxable = 0) {
  const salary     = parseFloat(monthlySalary || 0);
  const sss        = computeSSS(salary);
  const ph         = computePhilHealth(salary);
  const pagibig    = computePagibig(salary);
  const deductions = sss.total_ee + ph.ee + pagibig.ee;
  const taxable    = Math.max(salary + parseFloat(otherTaxable) - deductions - parseFloat(deMinimisBenefits), 0);
  const wt         = computeWithholdingTax(taxable);
  return {
    gross_salary: salary,
    sss, philhealth: ph, pagibig,
    mandatory_ee_deductions: deductions,
    taxable_compensation: taxable,
    withholding_tax: wt,
    net_pay: salary - deductions - wt,
    total_employer_cost: salary + sss.total_er + ph.er + pagibig.er,
  };
}

export const PAYROLL_STATUS_COLORS = {
  draft:    'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  posted:   'bg-green-100 text-green-800',
  void:     'bg-red-100 text-red-700',
};
