import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h = { "Content-Type": "application/json" };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

async function api(path, options = {}) {
  const headers = { ...(await authHeaders()), ...options.headers };
  const res = await fetch(`${BASE}/intelligence/loop${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`);
  return json.data ?? json;
}

export const getLoopStatus    = ()           => api("/status");
export const startLoop        = ()           => api("/start",    { method: "POST" });
export const stopLoop         = ()           => api("/stop",     { method: "POST" });
export const pauseLoop        = ()           => api("/pause",    { method: "POST" });
export const runLoopOnce      = ()           => api("/run-once", { method: "POST" });
export const getLoopRuns      = (limit = 20) => api(`/runs?limit=${limit}`);
export const getLoopDecisions = (limit = 50) => api(`/decisions?limit=${limit}`);
export const getLoopActions   = (status)     => api(`/actions${status ? `?status=${status}` : ""}`);
export const approveAction    = (id)         => api(`/actions/${id}/approve`, { method: "POST" });
export const rejectAction     = (id)         => api(`/actions/${id}/reject`,  { method: "POST" });
export const getLearningData  = ()           => api("/learning");
export const getLoopConfig    = ()           => api("/config");
export const updateLoopConfig = (patch)      => api("/config", { method: "POST", body: JSON.stringify(patch) });

export const submitFeedback = (actionId, outcome, notes) =>
  api(`/learning/${actionId}/feedback`, { method: "POST", body: JSON.stringify({ outcome, notes }) });

export function subscribeToLoop(onEvent, onError) {
  let controller;
  let reconnectTimer;

  async function connect() {
    controller = new AbortController();
    const headers = await authHeaders();

    fetch(`${BASE}/intelligence/stream`, { headers, signal: controller.signal })
      .then(async res => {
        if (!res.ok || !res.body) throw new Error("Stream unavailable");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            const eventLine = chunk.split("\n").find(l => l.startsWith("event:"));
            const dataLine  = chunk.split("\n").find(l => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              onEvent({
                event: eventLine?.replace("event:", "").trim() || "message",
                data:  JSON.parse(dataLine.replace("data:", "").trim()),
              });
            } catch {}
          }
        }
        // Auto-reconnect after clean close
        reconnectTimer = setTimeout(connect, 3000);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          onError?.(err);
          reconnectTimer = setTimeout(connect, 5000);
        }
      });
  }

  connect();

  return () => {
    clearTimeout(reconnectTimer);
    controller?.abort();
  };
}
