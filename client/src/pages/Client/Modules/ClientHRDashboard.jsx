import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, RefreshCw, UserPlus } from "lucide-react";

import ClientHRDashboardCards from "../../../components/client/hr/ClientHRDashboardCards.jsx";
import ClientRecentEmployees from "../../../components/client/hr/ClientRecentEmployees.jsx";

import { getClientHrData } from "../../../services/clientHr";

export default function ClientHRDashboard() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const data = await getClientHrData();

      setEmployees(data.employees || []);
      setDepartments(data.departments || []);
      setPositions(data.positions || []);
    } catch (err) {
      console.error("Client HR dashboard load error:", err);
      setError(err.message || "Failed to load HR dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees]
  );

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Human Resources
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
            HR Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Lightweight workspace HR overview for employees, departments,
            positions, and future team assignments.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <Link
            to="/Client/Employees"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)]"
          >
            <UserPlus className="h-4 w-4" />
            Manage Employees
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Loading HR dashboard...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

            <div>
              <h3 className="font-semibold text-[var(--danger)]">
                Failed to load HR dashboard
              </h3>

              <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>

              <button
                type="button"
                onClick={loadDashboard}
                className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <ClientHRDashboardCards
            employees={employees}
            departments={departments}
            positions={positions}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ClientRecentEmployees employees={employees} />

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  HR Lite Scope
                </h3>

                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This client-side HR module intentionally supports only the
                  employee directory foundation needed for Teams, Assignments,
                  Projects, Tasks, and ownership flows.
                </p>

                <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                  <div>✅ Employees</div>
                  <div>✅ Departments</div>
                  <div>✅ Positions</div>
                  <div>✅ Managers</div>
                  <div>✅ Archive-based records</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Next Connection
                </h3>

                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Active employees will be used as team members and assignment
                  owners in the next Operations migration phase.
                </p>

                <Link
                  to="/Client/Employees"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-gold)]"
                >
                  Open employee directory
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Active Workforce
                </h3>

                <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
                  {activeEmployees.length}
                </p>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Employees currently available for team and assignment mapping.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
