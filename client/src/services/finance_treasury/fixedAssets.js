/**
 * Fixed Assets & Depreciation Service
 * BIR-aligned useful life, SL/DDB/SYD methods
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

export async function getAssets(workspaceId, filters = {}) {
  const p = new URLSearchParams(filters);
  const json = await apiFetch(`/fixed-assets${p.size ? '?' + p : ''}`, {}, workspaceId);
  return json;
}

export async function getAsset(workspaceId, id) {
  const json = await apiFetch(`/fixed-assets/${id}`, {}, workspaceId);
  return json.data;
}

export async function createAsset(workspaceId, payload) {
  const json = await apiFetch('/fixed-assets', { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json.data;
}

export async function updateAsset(workspaceId, id, updates) {
  const json = await apiFetch(`/fixed-assets/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, workspaceId);
  return json.data;
}

export async function deleteAsset(workspaceId, id) {
  await apiFetch(`/fixed-assets/${id}`, { method: 'DELETE' }, workspaceId);
}

export async function getDepreciationLines(workspaceId, assetId) {
  const json = await apiFetch(`/fixed-assets/${assetId}/depreciation`, {}, workspaceId);
  return json.data;
}

export async function previewDepreciation(workspaceId, assetId) {
  const json = await apiFetch(`/fixed-assets/${assetId}/depreciation/preview`, { method: 'POST' }, workspaceId);
  return json;
}

export async function runDepreciation(workspaceId, { period_year, period_month, asset_ids } = {}) {
  const json = await apiFetch('/fixed-assets/run-depreciation', {
    method: 'POST',
    body: JSON.stringify({ period_year, period_month, asset_ids }),
  }, workspaceId);
  return json;
}

export async function disposeAsset(workspaceId, id, payload) {
  const json = await apiFetch(`/fixed-assets/${id}/dispose`, { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json;
}

export async function getDisposals(workspaceId) {
  const json = await apiFetch('/fixed-assets/disposals', {}, workspaceId);
  return json.data;
}

// ── Reference Data ────────────────────────────────────────────────────────────

export const BIR_ASSET_CLASSES = [
  { value: 'land',                  label: 'Land' },
  { value: 'building',              label: 'Building / Structure' },
  { value: 'leasehold_improvement', label: 'Leasehold Improvement' },
  { value: 'machinery',             label: 'Machinery & Equipment' },
  { value: 'furniture',             label: 'Furniture & Fixtures' },
  { value: 'transportation',        label: 'Transportation Equipment' },
  { value: 'it_equipment',          label: 'IT / Computer Equipment' },
  { value: 'intangible',            label: 'Intangible Assets' },
  { value: 'other',                 label: 'Other Fixed Assets' },
];

export const BIR_USEFUL_LIFE = {
  land: null, building: 25, leasehold_improvement: 5,
  machinery: 10, furniture: 10, transportation: 5,
  it_equipment: 5, intangible: 5, other: 5,
};

export const DEP_METHODS = [
  { value: 'straight_line',       label: 'Straight-Line (SL)' },
  { value: 'double_declining',    label: 'Double-Declining Balance (DDB)' },
  { value: 'sum_of_years_digits', label: "Sum of Years' Digits (SYD)" },
];

export const ASSET_STATUS_COLORS = {
  active:   'bg-green-100 text-green-800',
  disposed: 'bg-gray-100 text-gray-600',
  retired:  'bg-red-100 text-red-700',
  idle:     'bg-yellow-100 text-yellow-800',
};

export function formatBookValue(asset) {
  return parseFloat(asset.acquisition_cost || 0) - parseFloat(asset.accumulated_depreciation || 0);
}
