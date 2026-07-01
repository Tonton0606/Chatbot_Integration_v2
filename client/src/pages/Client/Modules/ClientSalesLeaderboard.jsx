import { useEffect, useState } from "react";
import { supabase } from "../../../config/supabaseClient";

import {
  ClientActivityBreakdownChart,
  ClientLeaderboardPodium,
  ClientLeaderboardTable,
  ClientSalespersonDrawer,
  ClientTeamKPICards,
} from "../../../components/client/layout/Client_SalesLeaderboard_Components.jsx";

import {
  CLIENT_LEADERBOARD_PERIODS,
  getClientSalesLeaderboardData,
} from "../../../services/clientSalesLeaderboard";

async function resolveWorkspaceId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User session not found.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.workspace_id) {
    throw new Error("No workspace assigned to this user.");
  }

  return data.workspace_id;
}

export default function ClientSalesLeaderboard() {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [period, setPeriod] = useState(CLIENT_LEADERBOARD_PERIODS[0]);
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
    loadLeaderboard(period);
  }, [period]);

  async function loadLeaderboard(activePeriod = period) {
    try {
      setLoading(true);
      setError("");

      const activeWorkspaceId = workspaceId || (await resolveWorkspaceId());

      setWorkspaceId(activeWorkspaceId);

      const data = await getClientSalesLeaderboardData(activeWorkspaceId, {
        period: activePeriod,
      });

      setLeaderboard(data.leaderboard || []);
      setTeamKpis(data.teamKpis || {});
      setActivityTrend(data.activityTrend || []);
      setCoachingInsights(data.coachingInsights || []);
    } catch (err) {
      console.error("Client sales leaderboard load error:", err);
      setError(err.message || "Failed to load sales leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Sales & CRM
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Sales Leaderboard
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Workspace sales performance based on assigned client deals.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="input-base h-10 min-w-[180px] rounded-xl"
          >
            {CLIENT_LEADERBOARD_PERIODS.map((item) => (
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
            onClick={() => loadLeaderboard(period)}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <ClientTeamKPICards kpis={teamKpis} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Top Performers
              </h2>

              <p className="text-sm text-[var(--text-muted)]">
                Ranked by won revenue
              </p>
            </div>

            <ClientLeaderboardPodium
              data={leaderboard.slice(0, 3)}
              onSelect={setSelectedPerson}
            />
          </div>

          <ClientLeaderboardTable
            data={leaderboard}
            onRowClick={setSelectedPerson}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <ClientActivityBreakdownChart data={activityTrend} />

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
        <ClientSalespersonDrawer
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
