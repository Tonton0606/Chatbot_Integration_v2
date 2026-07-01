import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getLoopStatus, startLoop, stopLoop, pauseLoop, runLoopOnce,
  getLoopRuns, getLoopDecisions, getLoopActions,
  approveAction, rejectAction, getLearningData,
  getLoopConfig, updateLoopConfig, subscribeToLoop, submitFeedback,
} from "../../../services/intelligence/loopEngineService.js";

// ── Utilities ────────────────────────────────────────────────────────────────

const PHASE_META = {
  observe:  { label: "Observe",  color: "#f5a623", icon: "👁" },
  analyze:  { label: "Analyze",  color: "#4a90d9", icon: "🔵" },
  insight:  { label: "Insight",  color: "#9b59b6", icon: "🧠" },
  decide:   { label: "Decide",   color: "#8e44ad", icon: "🟣" },
  act:      { label: "Act",      color: "#e74c3c", icon: "🔴" },
  learn:    { label: "Learn",    color: "#27ae60", icon: "🟢" },
  done:     { label: "Done",     color: "#1abc9c", icon: "✅" },
};

const SEV_COLOR = {
  critical: "#e74c3c",
  warning:  "#f5a623",
  info:     "#4a90d9",
  positive: "#27ae60",
};

const STATE_COLOR = {
  running: "#27ae60",
  paused:  "#f5a623",
  idle:    "var(--text-muted)",
  error:   "#e74c3c",
};

function fmt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusDot({ state }) {
  return (
    <span style={{
      display: "inline-block", width: 10, height: 10, borderRadius: "50%",
      background: STATE_COLOR[state] || "var(--text-muted)",
      boxShadow: state === "running" ? `0 0 8px ${STATE_COLOR.running}` : "none",
      animation: state === "running" ? "pulse 1.5s infinite" : "none",
      marginRight: 6,
    }} />
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-color)",
      borderRadius: 12, padding: "18px 22px", ...style,
    }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "var(--brand-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</h3>}
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, variant = "primary", children, small }) {
  const bg = { primary: "var(--brand-gold)", danger: "#e74c3c", ghost: "transparent", success: "#27ae60" }[variant];
  const color = variant === "ghost" ? "var(--text-muted)" : "#000";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "5px 12px" : "8px 18px",
        background: disabled ? "var(--border-color)" : bg,
        color: disabled ? "var(--text-muted)" : (variant === "ghost" ? "var(--text-primary)" : color),
        border: variant === "ghost" ? "1px solid var(--border-color)" : "none",
        borderRadius: 7, fontWeight: 600, fontSize: small ? 12 : 13,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PhaseBar({ phase }) {
  const phases = ["observe", "analyze", "insight", "decide", "act", "learn", "done"];
  const idx = phases.indexOf(phase);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
      {phases.map((p, i) => {
        const meta = PHASE_META[p];
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: done ? `${meta.color}33` : active ? meta.color : "var(--bg-surface)",
              color: done ? meta.color : active ? "#000" : "var(--text-muted)",
              border: `1px solid ${active || done ? meta.color : "var(--border-color)"}`,
              transition: "all 0.3s",
            }}>
              {meta.icon} {meta.label}
            </span>
            {i < phases.length - 1 && (
              <span style={{ color: "var(--text-muted)", fontSize: 10 }}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function LoopEngine() {
  const [status,    setStatus]    = useState(null);
  const [runs,      setRuns]      = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [actions,   setActions]   = useState([]);
  const [learning,  setLearning]  = useState(null);
  const [config,    setConfig]    = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading,   setLoading]   = useState({});
  const [events,    setEvents]    = useState([]);
  const [phase,     setPhase]     = useState(null);
  const [editConfig, setEditConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState(null);
  const unsub = useRef(null);
  const eventsRef = useRef([]);

  const pushEvent = useCallback((ev) => {
    const entry = { ...ev, receivedAt: new Date().toISOString() };
    eventsRef.current = [entry, ...eventsRef.current].slice(0, 100);
    setEvents([...eventsRef.current]);
    if (ev.event === "loop.phase")       setPhase(ev.data?.phase);
    if (ev.event === "loop.tick_completed") {
      setPhase("done");
      refresh();
    }
    if (ev.event === "loop.started" || ev.event === "loop.stopped" || ev.event === "loop.paused") {
      loadStatus();
    }
  }, []);

  async function loadStatus()   { const s = await getLoopStatus();    setStatus(s); }
  async function loadRuns()     { const d = await getLoopRuns(20);    setRuns(d || []); }
  async function loadDecisions(){ const d = await getLoopDecisions();  setDecisions(d || []); }
  async function loadActions()  { const d = await getLoopActions();    setActions(d || []); }
  async function loadLearning() { const d = await getLearningData();   setLearning(d); }
  async function loadConfig()   { const d = await getLoopConfig();     setConfig(d); setConfigDraft(JSON.stringify(d?.rules || [], null, 2)); }

  function refresh() {
    loadStatus(); loadRuns(); loadDecisions(); loadActions(); loadLearning();
  }

  useEffect(() => {
    refresh();
    loadConfig();
    unsub.current = subscribeToLoop(pushEvent, console.error);
    const interval = setInterval(loadStatus, 15000);
    return () => {
      unsub.current?.();
      clearInterval(interval);
    };
  }, []);

  async function ctrl(action, key) {
    setLoading(l => ({ ...l, [key]: true }));
    try {
      if (action === "start") { await startLoop(); }
      else if (action === "stop")  { await stopLoop(); }
      else if (action === "pause") { await pauseLoop(); }
      else if (action === "once")  { await runLoopOnce(); }
      await loadStatus();
      setTimeout(refresh, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  }

  async function handleApprove(id) {
    await approveAction(id);
    loadActions();
  }

  async function handleReject(id) {
    await rejectAction(id);
    loadActions();
  }

  async function saveConfig() {
    try {
      const rules = JSON.parse(configDraft);
      await updateLoopConfig({ rules, interval_seconds: config?.interval_seconds || 300 });
      await loadConfig();
      setEditConfig(false);
    } catch (err) {
      alert("Invalid JSON: " + err.message);
    }
  }

  const state = status?.state || "idle";

  const TABS = [
    { key: "dashboard",  label: "Dashboard" },
    { key: "runs",       label: `Runs (${runs.length})` },
    { key: "decisions",  label: `Decisions (${decisions.length})` },
    { key: "actions",    label: `Actions (${actions.length})` },
    { key: "learning",   label: "Learning" },
    { key: "config",     label: "Config" },
    { key: "live",       label: `Live Feed (${events.length})` },
  ];

  return (
    <div style={{ padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
              ♻️ Loop Engine
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Autonomous AI COO — OBSERVE → ANALYZE → INSIGHT → DECIDE → ACT → LEARN → REPEAT
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {state !== "running" && (
              <Btn onClick={() => ctrl("start", "start")} disabled={loading.start}>
                {loading.start ? "Starting…" : "▶ Start Loop"}
              </Btn>
            )}
            {state === "running" && (
              <Btn onClick={() => ctrl("pause", "pause")} variant="ghost" disabled={loading.pause}>
                {loading.pause ? "…" : "⏸ Pause"}
              </Btn>
            )}
            {state !== "idle" && (
              <Btn onClick={() => ctrl("stop", "stop")} variant="danger" disabled={loading.stop}>
                {loading.stop ? "…" : "⏹ Stop"}
              </Btn>
            )}
            <Btn onClick={() => ctrl("once", "once")} variant="ghost" disabled={loading.once}>
              {loading.once ? "Running…" : "⚡ Run Once"}
            </Btn>
            <Btn onClick={refresh} variant="ghost">↻ Refresh</Btn>
          </div>
        </div>

        {/* Status Bar */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>State</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: STATE_COLOR[state], display: "flex", alignItems: "center" }}>
                <StatusDot state={state} />
                {state.toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Ticks</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{status?.tick_count ?? 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Interval</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{status?.interval_seconds ?? 300}s</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Rules</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{status?.rules_count ?? 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Last Run</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmt(status?.last_run_at)}</div>
            </div>
            {phase && state === "running" && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Current Phase</div>
                <PhaseBar phase={phase} />
              </div>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border-color)", marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "8px 16px", background: "transparent", border: "none",
              borderBottom: activeTab === t.key ? "2px solid var(--brand-gold)" : "2px solid transparent",
              color: activeTab === t.key ? "var(--brand-gold)" : "var(--text-muted)",
              fontWeight: activeTab === t.key ? 700 : 400, fontSize: 13, cursor: "pointer",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {/* Stat cards */}
            {[
              { label: "Total Runs",      value: runs.length,                            color: "#4a90d9" },
              { label: "Decisions Made",  value: decisions.length,                       color: "#9b59b6" },
              { label: "Actions Executed",value: actions.filter(a => a.status === "executed").length, color: "#27ae60" },
              { label: "Pending Approval",value: actions.filter(a => a.status === "approval_required").length, color: "#e74c3c" },
            ].map(stat => (
              <Card key={stat.label}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </Card>
            ))}

            {/* Recent runs */}
            <Card title="Recent Loop Runs" style={{ gridColumn: "1 / -1" }}>
              {runs.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No runs yet. Start the loop or click "Run Once".</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {runs.slice(0, 5).map(run => (
                  <div key={run.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: "var(--bg-surface)",
                    borderRadius: 8, border: "1px solid var(--border-color)",
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: run.status === "completed" ? "#27ae6033" : run.status === "failed" ? "#e74c3c33" : "#f5a62333",
                        color: run.status === "completed" ? "#27ae60" : run.status === "failed" ? "#e74c3c" : "#f5a623",
                      }}>{run.status}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmt(run.started_at)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                      <span>💡 {run.insight_count}</span>
                      <span>🎯 {run.decision_count}</span>
                      <span>⚡ {run.action_count}</span>
                      <span>{run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Learning summary */}
            {learning?.summary && (
              <Card title="Learning Summary">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Success", value: learning.summary.success_count, color: "#27ae60" },
                    { label: "Failure", value: learning.summary.failure_count, color: "#e74c3c" },
                    { label: "Neutral", value: learning.summary.neutral_count, color: "#f5a623" },
                    { label: "Avg Score", value: learning.summary.avg_score?.toFixed(2), color: "#4a90d9" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* RUNS */}
        {activeTab === "runs" && (
          <Card title="All Loop Runs">
            {runs.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No runs recorded yet.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {runs.map(run => (
                <div key={run.id} style={{
                  padding: "12px 16px", background: "var(--bg-surface)",
                  borderRadius: 8, border: "1px solid var(--border-color)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: run.status === "completed" ? "#27ae6033" : run.status === "failed" ? "#e74c3c33" : "#f5a62333",
                          color: run.status === "completed" ? "#27ae60" : run.status === "failed" ? "#e74c3c" : "#f5a623",
                        }}>{run.status}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {run.id?.slice(0, 8)}…
                        </span>
                      </div>
                      {run.error && <div style={{ fontSize: 12, color: "#e74c3c", marginBottom: 4 }}>Error: {run.error}</div>}
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>Started: {fmt(run.started_at)}</span>
                        {run.ended_at && <span>Ended: {fmt(run.ended_at)}</span>}
                        {run.duration_ms && <span>Duration: {(run.duration_ms / 1000).toFixed(1)}s</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 13, textAlign: "center" }}>
                      <div><div style={{ fontWeight: 700, color: "var(--brand-gold)" }}>{run.insight_count}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Insights</div></div>
                      <div><div style={{ fontWeight: 700, color: "#9b59b6" }}>{run.decision_count}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Decisions</div></div>
                      <div><div style={{ fontWeight: 700, color: "#27ae60" }}>{run.action_count}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Actions</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* DECISIONS */}
        {activeTab === "decisions" && (
          <Card title="Rule Decisions">
            {decisions.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No triggered decisions yet.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map(d => (
                <div key={d.id} style={{
                  padding: "12px 16px", background: "var(--bg-surface)",
                  borderRadius: 8, border: `1px solid ${d.rule_config?.severity === "critical" ? "#e74c3c44" : "var(--border-color)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14, marginBottom: 4 }}>
                        {d.rule_name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {d.metric} = <strong style={{ color: "var(--text-primary)" }}>{d.metric_value?.toLocaleString?.() ?? d.metric_value}</strong>
                        {" "} (threshold: {d.threshold}) · confidence: {d.confidence}%
                      </div>
                      {d.actions_planned?.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {d.actions_planned.map((a, i) => (
                            <span key={i} style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: 11,
                              background: "var(--bg-card)", border: "1px solid var(--border-color)",
                              color: "var(--text-muted)",
                            }}>{a.type}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmt(d.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ACTIONS */}
        {activeTab === "actions" && (
          <Card title="Executed & Pending Actions">
            {actions.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No actions recorded yet.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actions.map(action => (
                <div key={action.id} style={{
                  padding: "12px 16px", background: "var(--bg-surface)",
                  borderRadius: 8, border: `1px solid ${action.status === "approval_required" ? "#f5a62344" : "var(--border-color)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{action.action_type}</span>
                        <span style={{
                          padding: "1px 7px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                          background: {
                            executed: "#27ae6033", failed: "#e74c3c33",
                            approval_required: "#f5a62333", approved: "#4a90d933", rejected: "#e74c3c22",
                          }[action.status] || "var(--bg-card)",
                          color: {
                            executed: "#27ae60", failed: "#e74c3c",
                            approval_required: "#f5a623", approved: "#4a90d9", rejected: "#e74c3c",
                          }[action.status] || "var(--text-muted)",
                        }}>{action.status}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(action.created_at)}</div>
                    </div>
                    {action.status === "approval_required" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn small variant="success" onClick={() => handleApprove(action.id)}>✓ Approve</Btn>
                        <Btn small variant="danger"  onClick={() => handleReject(action.id)}>✗ Reject</Btn>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* LEARNING */}
        {activeTab === "learning" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Outcome Summary">
              {!learning?.summary ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No learning data yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Total Logs",     value: learning.summary.total_logs,     color: "#4a90d9" },
                    { label: "✅ Success",      value: learning.summary.success_count,  color: "#27ae60" },
                    { label: "❌ Failure",      value: learning.summary.failure_count,  color: "#e74c3c" },
                    { label: "➖ Neutral",      value: learning.summary.neutral_count,  color: "#f5a623" },
                    { label: "Avg Perf Score", value: learning.summary.avg_score?.toFixed(3), color: "#9b59b6" },
                  ].map(s => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Rule Effectiveness">
              {!learning?.effectiveness || !Object.keys(learning.effectiveness).length ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Not enough data yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(learning.effectiveness).map(([rule, stats]) => (
                    <div key={rule} style={{ padding: "10px 12px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>{rule}</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>Success: <strong style={{ color: "#27ae60" }}>{stats.success_rate}%</strong></span>
                        <span>Score: <strong style={{ color: "#9b59b6" }}>{stats.avg_score}</strong></span>
                        <span>Runs: {stats.total_runs}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Recent Learning Logs" style={{ gridColumn: "1 / -1" }}>
              {!learning?.logs?.length ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No logs yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {learning.logs.slice(0, 15).map(log => (
                    <div key={log.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: "var(--bg-surface)", borderRadius: 7,
                      border: "1px solid var(--border-color)",
                    }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{
                          fontSize: 11, padding: "1px 7px", borderRadius: 8, fontWeight: 600,
                          background: log.outcome === "success" ? "#27ae6033" : log.outcome === "failure" ? "#e74c3c33" : "#f5a62333",
                          color: log.outcome === "success" ? "#27ae60" : log.outcome === "failure" ? "#e74c3c" : "#f5a623",
                        }}>{log.outcome}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Score: {log.performance_score?.toFixed(2)}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{log.feedback_source}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* CONFIG */}
        {activeTab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card title="Loop Settings">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Interval (seconds)</label>
                  <input
                    type="number"
                    value={config?.interval_seconds || 300}
                    onChange={e => setConfig(c => ({ ...c, interval_seconds: parseInt(e.target.value) || 300 }))}
                    style={{ width: "100%", padding: "8px 10px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: 7, color: "var(--text-primary)", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>AI Enabled</label>
                  <select
                    value={config?.ai_enabled ? "yes" : "no"}
                    onChange={e => setConfig(c => ({ ...c, ai_enabled: e.target.value === "yes" }))}
                    style={{ width: "100%", padding: "8px 10px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: 7, color: "var(--text-primary)", fontSize: 13 }}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <Btn onClick={() => updateLoopConfig({ interval_seconds: config?.interval_seconds, ai_enabled: config?.ai_enabled })}>
                Save Settings
              </Btn>
            </Card>

            <Card title="Rules Configuration (JSON)">
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                Each rule: <code style={{ background: "var(--bg-surface)", padding: "1px 6px", borderRadius: 4 }}>
                  {"{ \"name\": \"...\", \"metric\": \"...\", \"operator\": \"<\", \"threshold\": 20, \"severity\": \"critical\", \"actions\": [\"send_alert\"] }"}
                </code>
              </p>
              {editConfig ? (
                <>
                  <textarea
                    value={configDraft}
                    onChange={e => setConfigDraft(e.target.value)}
                    rows={18}
                    style={{
                      width: "100%", padding: "12px", background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)", borderRadius: 8,
                      color: "var(--text-primary)", fontSize: 12,
                      fontFamily: "monospace", resize: "vertical", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Btn onClick={saveConfig}>💾 Save Rules</Btn>
                    <Btn variant="ghost" onClick={() => setEditConfig(false)}>Cancel</Btn>
                  </div>
                </>
              ) : (
                <>
                  <pre style={{
                    background: "var(--bg-surface)", padding: 14, borderRadius: 8,
                    fontSize: 11, color: "var(--text-muted)", overflow: "auto",
                    maxHeight: 300, border: "1px solid var(--border-color)",
                  }}>
                    {JSON.stringify(config?.rules || [], null, 2)}
                  </pre>
                  <Btn style={{ marginTop: 10 }} onClick={() => setEditConfig(true)}>✏️ Edit Rules</Btn>
                </>
              )}
            </Card>
          </div>
        )}

        {/* LIVE FEED */}
        {activeTab === "live" && (
          <Card title="Live Event Stream">
            {events.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                No events yet. Start the loop to see real-time updates.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {events.slice(0, 50).map((ev, i) => {
                const meta = PHASE_META[ev.data?.phase] || {};
                return (
                  <div key={i} style={{
                    padding: "8px 12px", background: "var(--bg-surface)",
                    borderRadius: 7, border: "1px solid var(--border-color)",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 14 }}>{meta.icon || "📡"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: meta.color || "var(--brand-gold)" }}>
                          {ev.event}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {new Date(ev.receivedAt).toLocaleTimeString("en-PH")}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>
                        {JSON.stringify(ev.data).slice(0, 120)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
