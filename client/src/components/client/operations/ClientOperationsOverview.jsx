import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Crown,
  Layers3,
  Sparkles,
  UsersRound,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, hint, tone = "gold" }) {
  const toneClass =
    tone === "cyan"
      ? "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]"
      : tone === "green"
        ? "bg-emerald-500/10 text-emerald-500"
        : "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-60" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {value}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {hint && (
        <p className="relative mt-4 text-xs font-medium text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
}

function EmptyPanel({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
        <Sparkles className="h-5 w-5" />
      </div>

      <p className="mt-4 font-black text-[var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-black text-[#050816] transition hover:opacity-90"
        >
          {actionLabel}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function TeamAvatarStack({ members = [], count = 0 }) {
  const visibleMembers = members.slice(0, 4);

  if (visibleMembers.length === 0) {
    return (
      <div className="flex items-center text-xs font-semibold text-[var(--text-muted)]">
        No members yet
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {visibleMembers.map((member) => (
        <div
          key={member.id}
          className="-ml-2 first:ml-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--hover-bg)] text-[10px] font-black text-[var(--text-primary)]"
          title={member.name}
        >
          {member.initials || "?"}
        </div>
      ))}

      {count > visibleMembers.length && (
        <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--brand-gold-soft)] text-[10px] font-black text-[var(--brand-gold)]">
          +{count - visibleMembers.length}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }) {
  const workload = Number(team.metrics?.workload || 0);
  const workloadLabel =
    workload >= 90 ? "Heavy" : workload >= 70 ? "Busy" : "Healthy";

  return (
    <div className="group overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)] hover:shadow-lg">
      <div
        className="h-1.5"
        style={{ backgroundColor: team.color || team.type_color || "#c9a84c" }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: team.color || team.type_color || "#c9a84c",
                }}
              />
              <h3 className="truncate text-base font-black text-[var(--text-primary)]">
                {team.name}
              </h3>
            </div>

            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {team.type_label || "Operations"}
            </p>
          </div>

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black capitalize text-emerald-500">
            {team.status || "active"}
          </span>
        </div>

        <p className="mt-4 line-clamp-2 min-h-[40px] text-sm leading-5 text-[var(--text-muted)]">
          {team.description || "No description yet."}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Members
            </p>
            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
              {team.member_count || 0}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Open
            </p>
            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
              {team.metrics?.assignments_open || 0}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Load
            </p>
            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
              {workload}%
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-muted)]">
              Workload
            </span>
            <span className="font-black text-[var(--text-primary)]">
              {workloadLabel}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--hover-bg)]">
            <div
              className="h-full rounded-full bg-[var(--brand-gold)] transition-all"
              style={{ width: `${Math.min(workload, 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] p-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Leadership
            </p>
            <p className="mt-1 truncate text-sm font-black text-[var(--text-primary)]">
              {team.lead_name || "Unassigned"}
            </p>
          </div>

          <TeamAvatarStack
            members={team.members || []}
            count={team.member_count || 0}
          />
        </div>
      </div>
    </div>
  );
}

function AssignmentRow({ assignment }) {
  return (
    <div className="grid gap-3 border-b border-[var(--border-color)] px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
      <div className="min-w-0">
        <p className="truncate font-black text-[var(--text-primary)]">
          {assignment.title}
        </p>
        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
          {assignment.record_label || "Standalone assignment"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--text-secondary)]">
          {assignment.assignee_label || "Unassigned"}
        </p>
        <p className="mt-1 truncate text-xs capitalize text-[var(--text-muted)]">
          {assignment.assignee_type}
        </p>
      </div>

      <div>
        <span className="inline-flex rounded-full bg-[var(--hover-bg)] px-3 py-1 text-xs font-black text-[var(--text-secondary)]">
          {assignment.status_label || assignment.status}
        </span>
      </div>

      <div>
        <span className="inline-flex rounded-full bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-black text-[var(--brand-gold)]">
          {assignment.priority_label || assignment.priority}
        </span>
      </div>
    </div>
  );
}

function AssignmentsPanel({ assignments, statusesCount, onCreateAssignment }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">
            Assignments
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Lightweight ownership and responsibility tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateAssignment}
          className="hidden rounded-2xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)] sm:inline-flex"
        >
          Add
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr] border-b border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-xs font-black uppercase tracking-wide text-[var(--text-muted)] md:grid">
          <span>Assignment</span>
          <span>Assignee</span>
          <span>Status</span>
          <span>Priority</span>
        </div>

        {assignments.length === 0 ? (
          <div className="p-6">
            <EmptyPanel
              title="No assignments yet"
              description={`${statusesCount} statuses are ready for assignment tracking. Create one when you need clear ownership.`}
              actionLabel="Create Assignment"
              onAction={onCreateAssignment}
            />
          </div>
        ) : (
          assignments.map((assignment) => (
            <AssignmentRow key={assignment.id} assignment={assignment} />
          ))
        )}
      </div>
    </section>
  );
}

export default function ClientOperationsOverview({
  kpis,
  teams,
  assignments,
  statusesCount,
  onCreateTeam,
  onCreateAssignment,
}) {
  const hasTeams = teams.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label="Teams"
          value={kpis.teams}
          hint="Active operational teams"
          tone="gold"
        />
        <StatCard
          icon={BriefcaseBusiness}
          label="Members"
          value={kpis.members}
          hint="Employees assigned to teams"
          tone="cyan"
        />
        <StatCard
          icon={ClipboardList}
          label="Open Assignments"
          value={kpis.activeAssignments}
          hint="Pending or in progress"
          tone="gold"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={kpis.completed}
          hint={`${kpis.roles} configurable roles available`}
          tone="green"
        />
      </div>

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
              <Crown className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--brand-gold)]">
                Workspace Operations
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                Personalized team structure for this client workspace
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
                Keep the workflow simple for now: define teams, assign members,
                and track ownership. Advanced analytics can be added later
                without changing the foundation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                Structure
              </p>
              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                Workspace-scoped
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                Mode
              </p>
              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                Lite MVP
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)]">
                Teams
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Team containers with roles, hierarchy, and workload.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreateTeam}
              className="hidden rounded-2xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)] sm:inline-flex"
            >
              Add
            </button>
          </div>

          {!hasTeams ? (
            <EmptyPanel
              title="No teams yet"
              description="Create the first client operations team to start assigning people and responsibilities."
              actionLabel="Create Team"
              onAction={onCreateTeam}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </section>

        <AssignmentsPanel
          assignments={assignments}
          statusesCount={statusesCount}
          onCreateAssignment={onCreateAssignment}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Layers3 className="h-5 w-5 text-[var(--brand-gold)]" />
            <p className="font-black text-[var(--text-primary)]">
              Team Types
            </p>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Clients can define their own operational categories instead of being
            locked into Admin defaults.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UsersRound className="h-5 w-5 text-[var(--brand-gold)]" />
            <p className="font-black text-[var(--text-primary)]">
              Member Roles
            </p>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Workspace roles support client-specific naming like Supervisor,
            Agent, Lead, Coordinator, or Specialist.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-[var(--brand-gold)]" />
            <p className="font-black text-[var(--text-primary)]">
              Assignments
            </p>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Simple ownership tracking now. Later this can connect to CRM,
            Projects, Tasks, Bookings, and Commerce.
          </p>
        </div>
      </div>
    </div>
  );
}
