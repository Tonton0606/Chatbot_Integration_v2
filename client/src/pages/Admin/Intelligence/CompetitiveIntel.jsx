import React, { useEffect, useState, useCallback } from "react";
import { getCompetitiveIntelDashboard, addCompetitorSignal, SIGNAL_TYPES, IMPACT_LEVELS } from "../../../services/intelligence/competitiveIntelService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const THREAT_STYLE = {
  high: { color: "var(--danger)", bg: "var(--danger-soft)" },
  medium: { color: "#f5a623", bg: "rgba(245,166,35,0.12)" },
  low: { color: "var(--success)", bg: "var(--success-soft)" },
};

const IMPACT_STYLE = {
  high: { color: "var(--danger)" },
  medium: { color: "#f5a623" },
  low: { color: "var(--brand-cyan)" },
};

const SENTIMENT_EMOJI = { positive: "😊", negative: "😟", neutral: "😐" };

export default function CompetitiveIntel() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [activeCompetitor, setActiveCompetitor] = useState(null);
  const [filterImpact, setFilterImpact] = useState("all");
  const [feedback, setFeedback] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [signalForm, setSignalForm] = useState({ competitor: "", signalType: "News", title: "", summary: "", impact: "medium" });
  const [saving, setSaving] = useState(false);

  const [dashData, setDashData] = useState({
    summary: { totalSignals: 0, highImpact: 0, competitorsTracked: 0, thisWeek: 0, marketPosition: "—", threatLevel: "low" },
    competitors: [],
    signals: [],
    marketShareData: [],
  });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    const d = await getCompetitiveIntelDashboard();
    setDashData(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredSignals = (activeCompetitor
    ? dashData.signals.filter((s) => s.competitor === activeCompetitor)
    : dashData.signals
  ).filter((s) => filterImpact === "all" || s.impact === filterImpact);

  const handleAddSignal = async () => {
    if (!signalForm.competitor || !signalForm.title) {
      showMsg("Competitor and title are required", false);
      return;
    }
    setSaving(true);
    try {
      await addCompetitorSignal(signalForm);
      showMsg("Signal logged successfully");
      setShowAddModal(false);
      setSignalForm({ competitor: "", signalType: "News", title: "", summary: "", impact: "medium" });
      load();
    } catch (err) {
      showMsg(err.message || "Failed to add signal", false);
    } finally {
      setSaving(false);
    }
  };

  const s = dashData.summary;

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Competitive Intelligence"
        subtitle="Monitor market signals, competitor moves, and industry trends in real-time"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        showAI={false}
      />

      {feedback && (
        <div className="intel-toast" style={{ background: feedback.ok ? "var(--success)" : "var(--danger)" }}>
          {feedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        <div className="intel-kpi-strip">
          {[
            { label: "Total Signals", value: s.totalSignals, color: "var(--brand-cyan)" },
            { label: "High Impact", value: s.highImpact, color: "var(--danger)" },
            { label: "Competitors Tracked", value: s.competitorsTracked, color: "var(--brand-gold)" },
            { label: "This Week", value: s.thisWeek, color: "var(--brand-cyan)" },
            { label: "Market Position", value: s.marketPosition, color: "var(--success)" },
            { label: "Threat Level", value: s.threatLevel?.toUpperCase(), color: THREAT_STYLE[s.threatLevel]?.color || "var(--brand-cyan)" },
          ].map((k) => (
            <div key={k.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: k.color }} />
              <div className="intel-kpi-label">{k.label}</div>
              <div className="intel-kpi-value" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-grid-two">
          {/* Competitor Tracker */}
          <div className="intel-panel">
            <div className="intel-panel-header">Competitor Tracker</div>
            {dashData.competitors.map((c) => {
              const ts = THREAT_STYLE[c.threatLevel] || THREAT_STYLE.low;
              const isActive = activeCompetitor === c.name;
              return (
                <div
                  key={c.id}
                  className="intel-rule-row intel-card-hover"
                  style={{ cursor: "pointer", borderColor: isActive ? "var(--brand-cyan)" : undefined }}
                  onClick={() => setActiveCompetitor(isActive ? null : c.name)}
                >
                  <div className="intel-flex-1">
                    <div className="intel-section-title">{c.name}</div>
                    <div className="intel-section-subtitle">{c.category} · {c.signalCount} signals · {c.marketShare}% share</div>
                  </div>
                  <span className="intel-badge" style={{ background: ts.bg, color: ts.color }}>
                    {c.threatLevel} threat
                  </span>
                  <div className="intel-text-muted intel-xs">
                    {c.lastSignal ? new Date(c.lastSignal).toLocaleDateString() : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Market Share */}
          <div className="intel-panel">
            <div className="intel-panel-header">Market Position</div>
            {dashData.marketShareData.map((m) => (
              <div key={m.name} className="intel-recommendation-row">
                <div className="intel-flex-1 intel-min-w-100">
                  <div className="intel-small intel-text-secondary">{m.name}</div>
                </div>
                <div className="intel-health-bar intel-progress-fixed" style={{ width: 120 }}>
                  <div className="intel-health-fill" style={{ width: `${m.share * 3}%`, background: m.color }} />
                </div>
                <span className="intel-heavy" style={{ color: m.color, minWidth: 40, textAlign: "right" }}>{m.share}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signal Feed */}
        <div className="intel-panel">
          <div className="intel-panel-header">
            <div className="intel-row-between">
              <span>
                Intelligence Signals
                {activeCompetitor && <span className="intel-badge intel-ml-8">{activeCompetitor}</span>}
              </span>
              <div className="intel-actions-row">
                {["all", ...IMPACT_LEVELS].map((lvl) => (
                  <button
                    key={lvl}
                    className={`intel-btn ${filterImpact === lvl ? "intel-btn-ai" : ""}`}
                    onClick={() => setFilterImpact(lvl)}
                    type="button"
                  >
                    {lvl}
                  </button>
                ))}
                <button
                  className="intel-btn intel-btn-primary"
                  type="button"
                  onClick={() => setShowAddModal(true)}
                >
                  + Log Signal
                </button>
              </div>
            </div>
          </div>

          {filteredSignals.map((sig) => {
            const impStyle = IMPACT_STYLE[sig.impact] || IMPACT_STYLE.low;
            return (
              <div key={sig.id} className="intel-recommendation-row">
                <div className="intel-flex-1">
                  <div className="intel-row-between">
                    <span className="intel-section-title">{sig.title}</span>
                    <div className="intel-actions-row">
                      <span className="intel-badge intel-small">{sig.competitor}</span>
                      <span className="intel-badge intel-small">{sig.signalType}</span>
                      <span className="intel-small">{SENTIMENT_EMOJI[sig.sentiment]}</span>
                    </div>
                  </div>
                  {sig.summary && <div className="intel-section-subtitle">{sig.summary}</div>}
                  <div className="intel-xs intel-text-muted intel-mt-4">
                    {sig.occurredAt ? new Date(sig.occurredAt).toLocaleString() : "—"}
                  </div>
                </div>
                <span className="intel-badge" style={{ color: impStyle.color, borderColor: impStyle.color + "44" }}>
                  {sig.impact} impact
                </span>
              </div>
            );
          })}

          {filteredSignals.length === 0 && (
            <div className="intel-text-muted intel-small" style={{ padding: "16px 0" }}>
              No signals found. {activeCompetitor && "Click a competitor to clear filter."}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="intel-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="intel-modal-header">
              <span>Log Competitive Signal</span>
              <button className="intel-btn" onClick={() => setShowAddModal(false)} type="button">✕</button>
            </div>

            {[
              ["Competitor Name", "competitor", "text"],
              ["Signal Title", "title", "text"],
              ["Summary (optional)", "summary", "text"],
            ].map(([label, key]) => (
              <div key={key} className="intel-form-group">
                <label className="intel-muted-label">{label}</label>
                <input
                  className="intel-input intel-w-full intel-mt-4"
                  placeholder={label}
                  value={signalForm[key]}
                  onChange={(e) => setSignalForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="intel-grid-two">
              <div className="intel-form-group">
                <label className="intel-muted-label">Signal Type</label>
                <select
                  className="intel-select intel-w-full intel-mt-4"
                  value={signalForm.signalType}
                  onChange={(e) => setSignalForm((f) => ({ ...f, signalType: e.target.value }))}
                >
                  {SIGNAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="intel-form-group">
                <label className="intel-muted-label">Impact Level</label>
                <select
                  className="intel-select intel-w-full intel-mt-4"
                  value={signalForm.impact}
                  onChange={(e) => setSignalForm((f) => ({ ...f, impact: e.target.value }))}
                >
                  {IMPACT_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="intel-actions-row intel-mt-16">
              <button className="intel-btn" onClick={() => setShowAddModal(false)} type="button">Cancel</button>
              <button
                className="intel-btn intel-btn-primary"
                onClick={handleAddSignal}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving…" : "Log Signal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
