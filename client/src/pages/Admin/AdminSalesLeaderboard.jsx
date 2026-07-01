import { useEffect, useState } from "react";

import {
  ActivityBreakdownChart,
  LeaderboardPodium,
  LeaderboardTable,
  SalespersonDrawer,
  TeamKPICards,
} from "../../components/admin/layout/Admin_SalesLeaderboard_Components";

import {
  LEADERBOARD_PERIODS,
  getSalesLeaderboardData,
} from "../../services/sales_crm/sales_leaderboard";

export default function AdminSalesLeaderboard() {
  const [period, setPeriod] = useState(LEADERBOARD_PERIODS[0]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [leaderboard, setLeaderboard] = useState([]);
  const [teamKpis, setTeamKpis] = useState({
    topPerformer: "No data",
    totalRevenue: 0,
    avgConversionRate: 0,
    activitiesCompleted: 0,
    dealsWon: 0,
    followUpsCompleted: 0,
  });
  const [activityTrend, setActivityTrend] = useState([]);
  const [coachingInsights, setCoachingInsights] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  async function loadLeaderboard() {
    try {
      setLoading(true);
      setError("");

      const data = await getSalesLeaderboardData({ period });

      setLeaderboard(data.leaderboard || []);
      setTeamKpis(data.teamKpis || {});
      setActivityTrend(data.activityTrend || []);
      setCoachingInsights(data.coachingInsights || []);
    } catch (err) {
      console.error("Sales leaderboard load error:", err);
      setError(err.message || "Failed to load sales leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Sales & CRM
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Sales Leaderboard
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Real sales performance based on assigned CRM opportunities.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="input-base h-10 min-w-[180px] rounded-xl"
          >
            {LEADERBOARD_PERIODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Loading sales leaderboard...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load sales leaderboard
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>

          <button
            type="button"
            onClick={loadLeaderboard}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <TeamKPICards kpis={teamKpis} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Top Performers
              </h2>

              <p className="text-sm text-[var(--text-muted)]">
                Ranked by won revenue
              </p>
            </div>

            <LeaderboardPodium
              data={leaderboard.slice(0, 3)}
              onSelect={setSelectedPerson}
            />
          </div>

          <LeaderboardTable
            data={leaderboard}
            onRowClick={setSelectedPerson}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <ActivityBreakdownChart data={activityTrend} />

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
              <h3 className="mb-4 border-b border-[var(--border-color)] pb-3 font-bold text-[var(--text-primary)]">
                Coaching Insights
              </h3>

              <div className="space-y-3">
                {coachingInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {insight.name}
                        </p>

                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {insight.message}
                        </p>
                      </div>

                      <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                        {insight.signal}
                      </span>
                    </div>
                  </div>
                ))}

                {coachingInsights.length === 0 && (
                  <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    No coaching insights available yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedPerson && (
        <SalespersonDrawer
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
