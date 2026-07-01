const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

function getWorkspaceId() {
  return localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';
}

function getHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  return {
    'Content-Type':    'application/json',
    'x-workspace-id':  getWorkspaceId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}/kpi${path}`, {
    headers: getHeaders(),
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `KPI API error ${res.status}`);
  return json.data ?? json;
}

export const kpiService = {
  getDashboard:          ()               => apiFetch('/dashboard'),
  getIndividualScores:   (userId, weeks)  => apiFetch(`/individual/${userId}?limit=${weeks || 4}`),
  getTeamScores:         (teamId)         => apiFetch(`/team/${teamId}`),
  getProjectScores:      (projectId)      => apiFetch(`/project/${projectId}`),
  getSummary:            (type, id, ps)   => apiFetch(`/summary/${type}/${id}${ps ? `?period_start=${ps}` : ''}`),
  getLeaderboard:        (type)           => apiFetch(`/leaderboard?type=${type || 'individual'}`),
  acknowledgeRec:        (id, status, note) => apiFetch(`/recommendations/${id}`, {
    method:  'PATCH',
    body:    JSON.stringify({ status, resolution_note: note }),
  }),
  recalculate:           (subjectType, subjectId) => apiFetch('/recalculate', {
    method: 'POST',
    body:   JSON.stringify({ subject_type: subjectType, subject_id: subjectId }),
  }),

  // GET /kpi/forecast — time-series KPI forecast using moving average + trend model.
  // horizon_days: how many days to project (default 30). metric: named metric or 'kpi_score'.
  getForecast:           (horizonDays = 30, metric = 'kpi_score') =>
    apiFetch(`/forecast?horizon_days=${horizonDays}&metric=${encodeURIComponent(metric)}`),
};
