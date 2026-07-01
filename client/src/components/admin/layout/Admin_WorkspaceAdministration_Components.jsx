import {
  AlertCircle,
  Archive,
  Briefcase,
  Building2,
  CheckCircle2,
  Copy,
  Edit,
  Eye,
  Mail,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import {
  WORKSPACE_MEMBER_ROLES,
  WORKSPACE_STATUSES,
  WORKSPACE_TYPES,
} from "../../../services/operations/workspace_administration";

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status) {
  if (status === "active")
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  if (status === "inactive")
    return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
  if (status === "suspended")
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  if (status === "archived")
    return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function inviteStatusClass(status) {
  if (status === "pending")
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  if (status === "accepted")
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  if (status === "cancelled")
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  if (status === "expired")
    return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function typeClass(type) {
  if (type === "company")
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  if (type === "shared")
    return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
  if (type === "internal")
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function ownerName(workspace) {
  return (
    workspace.owner?.full_name ||
    workspace.owner?.email ||
    "No owner assigned"
  );
}

export function WorkspaceAdministrationHeader({
  onRefresh,
  onCreateWorkspace,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          Admin <span className="mx-1">›</span>{" "}
          <span className="text-[var(--brand-gold)]">Workspace Administration</span>
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
          Workspace Administration
        </h1>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage workspaces, owners, members, invitations, status, and tenant lifecycle.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          type="button"
          onClick={onCreateWorkspace}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-gold-hover)]"
        >
          <Plus className="h-4 w-4" />
          Workspace
        </button>
      </div>
    </div>
  );
}

export function WorkspaceAdministrationLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading workspace administration...
      </p>
    </div>
  );
}

export function WorkspaceAdministrationErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load workspace administration
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceAdministrationKPICards({ workspaces = [] }) {
  const activeCount = workspaces.filter(
    (workspace) => workspace.status === "active"
  ).length;

  const sharedCount = workspaces.filter(
    (workspace) => workspace.workspace_type === "shared"
  ).length;

  const companyCount = workspaces.filter(
    (workspace) => workspace.workspace_type === "company"
  ).length;

  const memberCount = workspaces.reduce(
    (total, workspace) => total + (workspace.workspace_members?.length || 0),
    0
  );

  const cards = [
    {
      label: "Total Workspaces",
      value: workspaces.length,
      icon: Building2,
      color: "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    },
    {
      label: "Active",
      value: activeCount,
      icon: CheckCircle2,
      color: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    },
    {
      label: "Shared / Company",
      value: `${sharedCount} / ${companyCount}`,
      icon: Briefcase,
      color: "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    },
    {
      label: "Members",
      value: memberCount,
      icon: Users,
      color: "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>

                <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">
                  Tenant lifecycle management
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WorkspaceAdministrationToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search workspace, owner, member email..."
          className="h-10 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-gold)]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value)}
          className="h-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--brand-gold)]"
        >
          <option value="all">All types</option>
          {WORKSPACE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="h-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--brand-gold)]"
        >
          <option value="all">All statuses</option>
          {WORKSPACE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function WorkspaceTable({
  workspaces = [],
  selectedWorkspaceId,
  onSelectWorkspace,
  onEditWorkspace,
  onStatusChange,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Workspace</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {workspaces.map((workspace) => {
            const isSelected = selectedWorkspaceId === workspace.id;

            return (
              <tr
                key={workspace.id}
                className={isSelected ? "bg-[var(--brand-gold-soft)]/60" : "hover:bg-[var(--hover-bg)]"}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelectWorkspace(workspace)}
                    className="flex items-start gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]">
                      <Building2 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {workspace.name}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {workspace.id}
                      </p>
                    </div>
                  </button>
                </td>

                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--text-primary)]">
                    {ownerName(workspace)}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {workspace.owner?.email || "—"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${typeClass(
                      workspace.workspace_type
                    )}`}
                  >
                    {workspace.workspace_type}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                      workspace.status
                    )}`}
                  >
                    {workspace.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {workspace.workspace_members?.length || 0}
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(workspace.created_at)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectWorkspace(workspace)}
                      className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                      title="Inspect"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditWorkspace(workspace)}
                      className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onStatusChange(
                          workspace,
                          workspace.status === "active"
                            ? "suspended"
                            : "active"
                        )
                      }
                      className={
                        workspace.status === "active"
                          ? "rounded-xl border border-red-500/20 p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          : "rounded-xl border border-green-500/20 p-2 text-[var(--success)] hover:bg-[var(--success-soft)]"
                      }
                      title={
                        workspace.status === "active"
                          ? "Suspend workspace"
                          : "Activate workspace"
                      }
                    >
                      {workspace.status === "active" ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onStatusChange(workspace, "archived")}
                      className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {!workspaces.length && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">
                No workspaces found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function WorkspaceDetailPanel({
  workspace,
  profiles = [],
  memberForm,
  invitationForm = { email: "", role: "member" },
  invitations = [],
  latestInvitation = null,
  onMemberFormChange,
  onInvitationFormChange,
  onAddMember,
  onRemoveMember,
  onCreateInvitation,
  onCancelInvitation,
  onCopyInvitation,
}) {
  if (!workspace) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-muted)]">
        Select a workspace to inspect owner, members, and invitations.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Selected Workspace
        </p>

        <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
          {workspace.name}
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Owner: {ownerName(workspace)}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InfoBox label="Type" value={workspace.workspace_type} />
        <InfoBox label="Status" value={workspace.status} />
        <InfoBox
          label="Members"
          value={workspace.workspace_members?.length || 0}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[var(--brand-gold)]" />
          <h4 className="font-bold text-[var(--text-primary)]">Invite Member</h4>
        </div>

        <form onSubmit={onCreateInvitation} className="grid gap-3 md:grid-cols-3">
          <input
            value={invitationForm.email}
            onChange={(event) =>
              onInvitationFormChange("email", event.target.value)
            }
            type="email"
            required
            placeholder="employee@company.com"
            className="h-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)] md:col-span-2"
          />

          <select
            value={invitationForm.role}
            onChange={(event) =>
              onInvitationFormChange("role", event.target.value)
            }
            className="h-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] md:col-span-3"
          >
            Create Invitation
          </button>
        </form>

        {latestInvitation?.inviteUrl && (
          <div className="mt-4 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-gold)]">
              Latest Invite Link
            </p>

            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={latestInvitation.inviteUrl}
                className="h-10 min-w-0 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs text-[var(--text-secondary)] outline-none"
              />

              <button
                type="button"
                onClick={() => onCopyInvitation(latestInvitation.inviteUrl)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-3 text-xs font-bold text-white hover:bg-[var(--brand-gold-hover)]"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>

            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Store or send this link now. The raw token is not saved again after this creation response.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[var(--brand-gold)]" />
          <h4 className="font-bold text-[var(--text-primary)]">Manual Attach / Update Member</h4>
        </div>

        <form onSubmit={onAddMember} className="grid gap-3 md:grid-cols-3">
          <select
            value={memberForm.user_id}
            onChange={(event) =>
              onMemberFormChange("user_id", event.target.value)
            }
            required
            className="h-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)] md:col-span-2"
          >
            <option value="">Select active profile</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || profile.email} · {profile.email}
              </option>
            ))}
          </select>

          <select
            value={memberForm.role}
            onChange={(event) =>
              onMemberFormChange("role", event.target.value)
            }
            className="h-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
          >
            {WORKSPACE_MEMBER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] md:col-span-3"
          >
            Save Member
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3">
          <h4 className="font-bold text-[var(--text-primary)]">Pending / Recent Invitations</h4>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {invitations.map((invite) => (
              <tr key={invite.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {invite.email}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Invited {formatDate(invite.created_at)}
                  </p>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {invite.role}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${inviteStatusClass(
                      invite.status
                    )}`}
                  >
                    {invite.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(invite.expires_at)}
                </td>

                <td className="px-4 py-3 text-right">
                  {invite.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => onCancelInvitation(invite)}
                      className="rounded-xl border border-red-500/20 p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      title="Cancel invitation"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}

            {!invitations.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  No invitations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3">
          <h4 className="font-bold text-[var(--text-primary)]">Workspace Members</h4>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Workspace Role</th>
              <th className="px-4 py-3">Profile Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {(workspace.workspace_members || []).map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {member.user?.full_name || member.user?.email || "User"}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {member.user?.email || "—"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-gold)]">
                    {member.role}
                  </span>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {member.user?.role || "—"}
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(member.joined_at || member.created_at)}
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveMember(member)}
                    className="rounded-xl border border-red-500/20 p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}

            {!workspace.workspace_members?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WorkspaceFormModal({
  open,
  mode,
  form,
  profiles = [],
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--bg-card)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {mode === "edit" ? "Edit Workspace" : "Create Workspace"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1 text-sm font-semibold text-[var(--text-muted)] hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Workspace Name
            </span>

            <input
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              required
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
              placeholder="Acme PH Workspace"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Type
              </span>

              <select
                value={form.workspace_type}
                onChange={(event) =>
                  onChange("workspace_type", event.target.value)
                }
                className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
              >
                {WORKSPACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Status
              </span>

              <select
                value={form.status}
                onChange={(event) => onChange("status", event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
              >
                {WORKSPACE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Owner
            </span>

            <select
              value={form.owner_user_id || ""}
              onChange={(event) => onChange("owner_user_id", event.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
            >
              <option value="">No owner</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email} · {profile.email}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
