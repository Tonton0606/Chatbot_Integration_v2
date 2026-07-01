import React, { useEffect, useState, useCallback } from "react";
import {
  getLaborCostDashboard,
  computeLaborCosts,
  PH_STATUTORY,
  DEPARTMENTS,
} from "../../../services/intelligence/laborCostIntelService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function LaborCostIntel({ onRefresh }) {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [computing, setComputing] = useState(false);

  const [dashboard, setDashboard] = useState({});
  const [result, setResult] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getLaborCostDashboard();
      setDashboard(d || {});
    } catch (err) {
      setError(err.message || "Failed to load labor cost data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      const res = await computeLaborCosts(selectedMonth);
      setResult(res);
      showToast(`Labor costs computed for ${selectedMonth}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(err.message || "Computation failed", false);
    } finally {
      setComputing(false);
    }
  };

  const r = result || dashboard.latest || {};
  const basicPay = r.totalBasicPay || 0;

  // PH statutory computations
  const sssEmployee = basicPay * 0.045;
  const sssEmployer = basicPay * 0.095;
  const phEmployee = basicPay * 0.025;
  const phEmployer = basicPay * 0.025;
  const pagEmployee = 100;
  const pagEmployer = 100;
  const thirteenthMonth = basicPay / 12;

  const sssTotal = sssEmployee + sssEmployer;
  const phTotal = phEmployee + phEmployer;
  const pagTotal = pagEmployee + pagEmployer;

  const totalLaborCost = basicPay + sssEmployer + phEmployer + pagEmployer + thirteenthMonth;

  const kpis = [
    { label: "Total Basic Pay", value: fmt(basicPay), color: "var(--brand-cyan)" },
    { label: "SSS Employer Share", value: fmt(sssEmployer), color: "#f5a623" },
    { label: "PhilHealth Employer Share", value: fmt(phEmployer), color: "var(--brand-cyan)" },
    { label: "Pag-IBIG Employer Share", value: fmt(pagEmployer), color: "var(--brand-cyan)" },
    { label: "13th Month Accrual", value: fmt(thirteenthMonth), color: "var(--success)" },
    { label: "Total Labor Cost", value: fmt(totalLaborCost), color: "var(--danger)" },
  ];

  const statutory = [
    {
      benefit: "SSS",
      employeeDeduction: fmt(sssEmployee),
      employerShare: fmt(sssEmployer),
      total: fmt(sssTotal),
      note: "4.5% / 9.5% of basic pay",
    },
    {
      benefit: "PhilHealth",
      employeeDeduction: fmt(phEmployee),
      employerShare: fmt(phEmployer),
      total: fmt(phTotal),
      note: "2.5% / 2.5% of basic pay",
    },
    {
      benefit: "Pag-IBIG",
      employeeDeduction: fmt(pagEmployee),
      employerShare: fmt(pagEmployer),
      total: fmt(pagTotal),
      note: "₱100 fixed / ₱100 fixed",
    },
  ];

  const departments = r.departments || [];

  if (loading) return <div className="intel-loading">Loading...</div>;
  if (error) return <div className="intel-error">{error}</div>;

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Labor Cost Intelligence"
        subtitle="Philippine statutory benefits computation: SSS, PhilHealth, Pag-IBIG, and 13th month"
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
        <div
          className="intel-card"
          style={{
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.25)",
            color: "var(--brand-cyan)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 20px",
          }}
        >
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <span className="intel-small">
            <strong>Minimum Wage NCR:</strong> ₱610/day &nbsp;|&nbsp;
            <strong>Minimum Wage Regional:</strong> ₱500/day
            &nbsp;— per DOLE Department Order
          </span>
        </div>

        <div className="intel-actions-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="intel-label" style={{ margin: 0 }}>Period:</label>
            <input
              type="month"
              className="intel-input"
              style={{ width: "auto" }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="intel-btn intel-btn-primary"
            onClick={handleCompute}
            disabled={computing}
          >
            {computing ? "⏳ Computing…" : "🔄 Compute Labor Costs"}
          </button>
        </div>

        <div className="intel-kpi-strip">
          {kpis.map((k) => (
            <div key={k.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: k.color }} />
              <div className="intel-kpi-label">{k.label}</div>
              <div className="intel-kpi-value" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-panel">
          <div className="intel-panel-header">Statutory Benefit Breakdown</div>
          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  {["Benefit", "Employee Deduction", "Employer Share", "Total Contribution", "Basis"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statutory.map((row) => (
                  <tr key={row.benefit}>
                    <td className="intel-heavy">{row.benefit}</td>
                    <td className="intel-table-money" style={{ color: "var(--danger)" }}>{row.employeeDeduction}</td>
                    <td className="intel-table-money" style={{ color: "#f5a623" }}>{row.employerShare}</td>
                    <td className="intel-table-money intel-heavy">{row.total}</td>
                    <td className="intel-text-muted intel-small">{row.note}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                  <td className="intel-heavy">13th Month</td>
                  <td className="intel-text-muted">—</td>
                  <td className="intel-table-money" style={{ color: "var(--success)" }}>{fmt(thirteenthMonth)}</td>
                  <td className="intel-table-money intel-heavy">{fmt(thirteenthMonth)}</td>
                  <td className="intel-text-muted intel-small">Basic Pay ÷ 12</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {departments.length > 0 && (
          <div className="intel-panel">
            <div className="intel-panel-header">Department Breakdown — {selectedMonth}</div>
            <div className="intel-table-wrap">
              <table className="intel-table">
                <thead>
                  <tr>
                    {["Department", "Headcount", "Basic Pay", "Total Cost", "Cost per Head"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.department}>
                      <td className="intel-heavy">{dept.department}</td>
                      <td>{dept.headcount || 0}</td>
                      <td className="intel-table-money">{fmt(dept.basicPay)}</td>
                      <td className="intel-table-money" style={{ color: "var(--danger)" }}>{fmt(dept.totalCost)}</td>
                      <td className="intel-table-money">
                        {dept.headcount
                          ? fmt((dept.totalCost || 0) / dept.headcount)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
