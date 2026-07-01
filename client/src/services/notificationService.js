import { supabase } from '../config/supabaseClient';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const wid = localStorage.getItem('workspace_id') || localStorage.getItem('workspaceId') || '';
  return {
    'Content-Type': 'application/json',
    'x-workspace-id': wid,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}/notifications${path}`, {
    headers: await getHeaders(),
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Notifications API error ${res.status}`);
  return json;
}

export const notificationService = {
  getAll:       (unreadOnly = false, limit = 50) =>
    apiFetch(`/?unread_only=${unreadOnly}&limit=${limit}`),

  markRead:     (id) =>
    apiFetch(`/${id}/read`, { method: 'PATCH' }),

  markAllRead:  () =>
    apiFetch('/read-all', { method: 'POST' }),

  dismiss:      (id) =>
    apiFetch(`/${id}`, { method: 'DELETE' }),

  clearRead:    () =>
    apiFetch('/', { method: 'DELETE' }),

  getConfig:    () =>
    apiFetch('/config'),

  updateConfig: (patch) =>
    apiFetch('/config', { method: 'PATCH', body: JSON.stringify(patch) }),
};
