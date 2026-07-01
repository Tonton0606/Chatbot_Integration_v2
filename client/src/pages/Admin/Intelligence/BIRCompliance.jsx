import React, { useEffect, useState, useCallback } from "react";
import {
  getBIRComplianceDashboard,
  createComplianceItem,
  updateComplianceItem,
  getComplianceSummary,
  BIR_FORMS,
  COMPLIANCE_STATUSES,
} from "../../../services/intelligence/birComplianceService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const STATUS_STYLE = {
  filed: { bg: "var(--success-soft)", color: "var(--success)", label: "Filed" },
  pending: { bg: "rgba(245,166,35,0.12)", color: "#f5a623", label: "Pending" },
  overdue: { bg: "var(--danger-soft)", color: "var(--danger)", label: "Overdue" },
  waived: { bg: "rgba(150,150,150,0.12)", color: "#9ca3af", label: "Waived" },
};

const BLANK_FORM = {
  form_code: "",
  description: "",
  category: "",
  due_date: "",
  frequency: "monthly",
};

export default function BIRCompliance({ onRefresh }) {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', item: {} }
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(BLANK_FORM);

  const [data, setData] = useState({
    items: [],
    summary: { totalFormsDue: 0, filedOnTime: 0, overdue: 0, totalPenalties: 0 },
  });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, summary] = await Promise.all([
        getBIRComplianceDashboard(),
        getComplianceSummary(),
      ]);
      setData({ items: dashboard.items || [], summary: summary || dashboard.summary || {} });
    } catch (err) {
      setError(err.message || "Failed to load BIR Compliance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered =
    filter === "all"
      ? data.items
      : data.items.filter((i) => i.status === filter);

  const openAdd = () => {
    setFormData(BLANK_FORM);
    setModal({ mode: "add" });
  };

  const openEdit = (item) => {
    setFormData({
      form_code: item.form_code || "",
      description: item.description || "",
      category: item.category || "",
      due_date: item.due_date ? item.due_date.slice(0, 10) : "",
      frequency: item.frequency || "monthly",
    });
    setModal({ mode: "edit", item });
  };

  const handleFormCodeChange = (code) => {
    const found = BIR_FORMS.find((f) => f.code === code);
    setFormData((prev) => ({
      ...prev,
      form_code: code,
      description: found ? found.description : prev.description,
    }));
  };

  const handleSave = async () => {
    if (!formData.form_code || !formData.due_date) {
      showToast("Form code and due date are required", false);
      return;
    }
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await createComplianceItem(formData);
        showToast("Compliance item created");
      } else {
        await updateComplianceItem(modal.item.id, formData);
        showToast("Compliance item updated");
      }
      setModal(null);
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(err.message || "Save failed", false);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkFiled = async (item) => {
    try {
      await updateComplianceItem(item.id, {
        status: "filed",
        filed_at: new Date().toISOString(),
      });
      showToast(`${item.form_code} marked as filed`);
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to mark filed", false);
    }
  };

  const s = data.summary;
  const kpis = [
    { label: "Total Forms Due", value: s.totalFormsDue ?? 0, color: "var(--brand-cyan)" },
    { label: "Filed On-Time", value: s.filedOnTime ?? 0, color: "var(--success)" },
    { label: "Overdue", value: s.overdue ?? 0, color: "var(--danger)" },
    {
      label: "Total Penalties",
      value: s.totalPenalties != null ? `₱${Number(s.totalPenalties).toLocaleString("en-PH")}` : "₱0",
      color: "var(--danger)",
    },
  ];

  if (loading) return <div className="intel-loading">Loading...</div>;
  if (error) return <div className="intel-error">{error}</div>;

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="BIR Compliance Intelligence"
        subtitle="Philippine Bureau of Internal Revenue filing tracker and compliance dashboard"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
      />

      {toast && (
        <div
          className="intel-toast"
          style={{ background: toast.ok ? "var(--success)" : "var(--danger)" }}
        >
          {toast.msg}
        </div>
      )}

      <div className="intel-page-body">
        <div className="intel-kpi-strip">
          {kpis.map((k) => (
            <div key={k.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: k.color }} />
              <div className="intel-kpi-label">{k.label}</div>
              <div className="intel-kpi-value" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-actions-row">
          {["all", ...Object.keys(STATUS_STYLE)].map((f) => (
            <button
              key={f}
              type="button"
              className={`intel-btn ${filter === f ? "intel-btn-ai" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : STATUS_STYLE[f]?.label || f}
            </button>
          ))}
          <button
            type="button"
            className="intel-btn intel-btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={openAdd}
          >
            + Add Compliance Item
          </button>
        </div>

        <div className="intel-panel">
          <div className="intel-panel-header">
            BIR Forms — {filter === "all" ? "All" : STATUS_STYLE[filter]?.label} ({filtered.length})
          </div>
          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  {["Form Code", "Description", "Category", "Frequency", "Due Date", "Status", "Filed At", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const st = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
                  return (
                    <tr key={item.id}>
                      <td className="intel-heavy">{item.form_code}</td>
                      <td>{item.description}</td>
                      <td>{item.category || "—"}</td>
                      <td style={{ textTransform: "capitalize" }}>{item.frequency || "—"}</td>
                      <td className="intel-small">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString("en-PH") : "—"}
                      </td>
                      <td>
                        <span className="intel-badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="intel-text-muted intel-small">
                        {item.filed_at ? new Date(item.filed_at).toLocaleDateString("en-PH") : "—"}
                      </td>
                      <td>
                        <div className="intel-inline-actions">
                          <button
                            type="button"
                            className="intel-btn intel-btn-secondary"
                            onClick={() => openEdit(item)}
                          >
                            Edit
                          </button>
                          {(item.status === "pending" || item.status === "overdue") && (
                            <button
                              type="button"
                              className="intel-btn intel-btn-primary"
                              onClick={() => handleMarkFiled(item)}
                            >
                              Mark Filed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="intel-text-muted" style={{ padding: 16 }}>
                      No compliance items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="intel-modal-overlay">
          <div className="intel-modal">
            <div className="intel-modal-header">
              <span>{modal.mode === "add" ? "Add Compliance Item" : "Edit Compliance Item"}</span>
              <button type="button" className="intel-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="intel-modal-body">
              <label className="intel-label">BIR Form *</label>
              <select
                className="intel-input"
                value={formData.form_code}
                onChange={(e) => handleFormCodeChange(e.target.value)}
              >
                <option value="">Select BIR Form</option>
                {(BIR_FORMS || []).map((f) => (
                  <option key={f.code} value={f.code}>{f.code} — {f.description}</option>
                ))}
              </select>

              <label className="intel-label">Description</label>
              <input
                className="intel-input"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Auto-filled from form selection"
              />

              <label className="intel-label">Category</label>
              <input
                className="intel-input"
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Income Tax, VAT, Withholding Tax"
              />

              <label className="intel-label">Due Date *</label>
              <input
                type="date"
                className="intel-input"
                value={formData.due_date}
                onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
              />

              <label className="intel-label">Frequency</label>
              <select
                className="intel-input"
                value={formData.frequency}
                onChange={(e) => setFormData((p) => ({ ...p, frequency: e.target.value }))}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="intel-modal-footer">
              <button type="button" className="intel-btn intel-btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="intel-btn intel-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
