import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

async function req(path, options = {}) {
  const headers = { ...(await authHeaders()), ...options.headers };
  const response = await fetch(`${BASE}/intelligence${path}`, { ...options, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `API error ${response.status}`);
  return json.data;
}

export async function listIntelligenceModules() {
  return req("/modules");
}

export async function createIntelligenceModule(payload) {
  return req("/modules", { method: "POST", body: JSON.stringify(payload) });
}

export async function runIntelligenceModule(payload = {}) {
  return req("/run", { method: "POST", body: JSON.stringify(payload) });
}

export async function listIntelligenceInsights(params = {}) {
  const query = new URLSearchParams(params).toString();
  return req(`/insights${query ? `?${query}` : ""}`);
}

export async function createIntelligenceAutomation(payload) {
  return req("/automations", { method: "POST", body: JSON.stringify(payload) });
}

export async function subscribeToIntelligence(onEvent, onError) {
  const headers = await authHeaders();
  const controller = new AbortController();

  fetch(`${BASE}/intelligence/stream`, {
    headers,
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) throw new Error("Live stream unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const eventLine = chunk.split("\n").find((line) => line.startsWith("event:"));
          const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          onEvent?.({
            event: eventLine?.replace("event:", "").trim() || "message",
            data: JSON.parse(dataLine.replace("data:", "").trim()),
          });
        }
      }
    })
    .catch((error) => {
      if (error.name !== "AbortError") onError?.(error);
    });

  return () => controller.abort();
}
