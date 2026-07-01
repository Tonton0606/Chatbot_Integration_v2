import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Grid3X3,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserRound,
} from "lucide-react";

function formatUserName(member) {
  return member.user?.full_name || member.user?.email || "Workspace Member";
}

function roleClass(role) {
  if (role === "owner") {
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  }

  if (role === "admin") {
    return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
  }

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function divisionKeyForModule(module) {
  return module.divisionKey || "workspace";
}

function divisionTitleForModule(module) {
  return module.divisionTitle || "Workspace";
}

function groupModulesByDivision(modules = []) {
  const map = new Map();

  for (const module of modules) {
    const key = divisionKeyForModule(module);

    if (!map.has(key)) {
      map.set(key, {
        key,
        title: divisionTitleForModule(module),
        order: Number(module.divisionOrder ?? 9999),
        items: [],
      });
    }

    map.get(key).items.push(module);
  }

  return Array.from(map.values())
    .map((division) => ({
      ...division,
      items: division.items.sort((a, b) => {
        const orderDiff = Number(a.order || 0) - Number(b.order || 0);
        return orderDiff || String(a.label || "").localeCompare(String(b.label || ""));
      }),
    }))
    .sort((a, b) => {
      const orderDiff = Number(a.order || 9999) - Number(b.order || 9999);
      return orderDiff || String(a.title || "").localeCompare(String(b.title || ""));
    });
}

function isPrivilegedRole(role) {
  return role === "owner" || role === "admin";
}

function canArchiveMember({ selectedMember, currentUserId, workspaceRole }) {
  if (!selectedMember?.id) return false;
  if (!currentUserId) return false;
  if (selectedMember.user_id === currentUserId) return false;
  if (selectedMember.role === "owner") return false;

  if (selectedMember.role === "admin") {
    return workspaceRole === "owner";
  }

  return workspaceRole === "owner" || workspaceRole === "admin";
}

export default function WorkspaceMemberAccessPanel({
  members = [],
  modules = [],
  memberAccessRows = [],
  currentUserId = "",
  workspaceRole = "",
  savingKey,
  archivingMemberId = "",
  onToggleAccess,
  onArchiveMember,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [openDivisions, setOpenDivisions] = useState({});

  const selectedMember = useMemo(() => {
    if (!members.length) return null;

    return (
      members.find((member) => member.user_id === selectedMemberId) ||
      members[0]
    );
  }, [members, selectedMemberId]);

  const divisions = useMemo(() => groupModulesByDivision(modules), [modules]);

  function isModuleEnabledForMember(memberId, featureKey) {
    return memberAccessRows.some(
      (row) =>
        row.user_id === memberId &&
        row.feature_key === featureKey &&
        row.is_enabled
    );
  }

  function toggleDivisionOpen(divisionKey) {
    setOpenDivisions((prev) => ({
      ...prev,
      [divisionKey]: !prev[divisionKey],
    }));
  }

  function getEnabledCount(member) {
    if (!member) return 0;

    if (isPrivilegedRole(member.role)) {
      return modules.length;
    }

    return modules.filter((module) =>
      isModuleEnabledForMember(member.user_id, module.key)
    ).length;
  }

  function handleArchiveSelectedMember() {
    if (!selectedMember?.id || !onArchiveMember) return;

    onArchiveMember(selectedMember);
  }

  if (!members.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center shadow-sm">
        <UserRound className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
        <h2 className="mt-3 font-bold text-[var(--text-primary)]">
          No workspace members yet
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Invite members first before configuring member-level access.
        </p>
      </div>
    );
  }

  if (!modules.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
        <h2 className="mt-3 font-bold text-[var(--text-primary)]">
          No workspace modules available
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Enable client modules in Workspace Access first before assigning them
          to members.
        </p>
      </div>
    );
  }

  const selectedIsPrivileged = isPrivilegedRole(selectedMember?.role);
  const archiveAllowed = canArchiveMember({
    selectedMember,
    currentUserId,
    workspaceRole,
  });
  const archiveSaving = archivingMemberId === selectedMember?.id;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-[var(--text-primary)]">
              Member Module Access
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Select a workspace member, then enable only the modules they
              should access. Owners and workspace admins inherit all enabled
              workspace modules.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.6fr)]">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <h3 className="font-bold text-[var(--text-primary)]">
              Workspace Members
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Choose whose access you want to configure.
            </p>
          </div>

          <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
            {members.map((member) => {
              const active = selectedMember?.user_id === member.user_id;
              const enabledCount = getEnabledCount(member);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.user_id)}
                  className={
                    active
                      ? "w-full rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4 text-left shadow-sm"
                      : "w-full rounded-2xl border border-transparent p-4 text-left hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[var(--text-primary)]">
                        {formatUserName(member)}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {member.user?.email}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${roleClass(
                            member.role
                          )}`}
                        >
                          {member.role}
                        </span>

                        <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                          {enabledCount}/{modules.length} modules
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Selected Member
                </p>

                <h3 className="mt-1 truncate text-xl font-bold text-[var(--text-primary)]">
                  {formatUserName(selectedMember)}
                </h3>

                <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                  {selectedMember?.user?.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${roleClass(
                    selectedMember?.role
                  )}`}
                >
                  {selectedMember?.role}
                </span>

                <span className="rounded-full border border-green-500/20 bg-[var(--success-soft)] px-3 py-1 text-xs font-bold uppercase text-[var(--success)]">
                  {getEnabledCount(selectedMember)} enabled
                </span>

                {selectedIsPrivileged && (
                  <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-bold uppercase text-[var(--brand-gold)]">
                    Inherited Access
                  </span>
                )}

                {archiveAllowed && (
                  <button
                    type="button"
                    disabled={archiveSaving}
                    onClick={handleArchiveSelectedMember}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase text-red-500 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {archiveSaving ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            </div>

            {selectedIsPrivileged && (
              <p className="mt-4 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-3 text-sm text-[var(--brand-gold)]">
                This user is a workspace {selectedMember?.role}. They inherit all
                enabled workspace modules and do not need member-level toggles.
              </p>
            )}

            {!archiveAllowed && selectedMember?.role !== "owner" && (
              <p className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-muted)]">
                Member removal is available only when you have permission and
                the selected member is not your own account.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {divisions.map((division) => {
              const isOpen = openDivisions[division.key] ?? true;

              const enabledCount = selectedIsPrivileged
                ? division.items.length
                : division.items.filter((module) =>
                    isModuleEnabledForMember(selectedMember.user_id, module.key)
                  ).length;

              return (
                <div
                  key={division.key}
                  className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] p-5">
                    <button
                      type="button"
                      onClick={() => toggleDivisionOpen(division.key)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]">
                        <Grid3X3 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-[var(--text-primary)]">
                          {division.title}
                        </h3>

                        <p className="text-sm text-[var(--text-muted)]">
                          {enabledCount} of {division.items.length} modules
                          enabled
                        </p>
                      </div>

                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {division.items.map((module) => {
                        const enabled = selectedIsPrivileged
                          ? true
                          : isModuleEnabledForMember(
                              selectedMember.user_id,
                              module.key
                            );

                        const key = `${selectedMember.user_id}:${module.key}`;
                        const saving = savingKey === key;

                        return (
                          <div
                            key={module.key}
                            className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-bold text-[var(--text-primary)]">
                                  {module.label}
                                </h4>

                                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                                  {module.description}
                                </p>
                              </div>

                              {selectedIsPrivileged ? (
                                <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-gold)]">
                                  Inherited
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() =>
                                    onToggleAccess({
                                      userId: selectedMember.user_id,
                                      featureKey: module.key,
                                      isEnabled: !enabled,
                                    })
                                  }
                                  className={
                                    enabled
                                      ? "text-[var(--success)] disabled:opacity-50"
                                      : "text-[var(--text-muted)] disabled:opacity-50"
                                  }
                                  title={`Toggle ${module.label} access`}
                                >
                                  {enabled ? (
                                    <ToggleRight className="h-8 w-8" />
                                  ) : (
                                    <ToggleLeft className="h-8 w-8" />
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-xs font-bold uppercase text-[var(--text-muted)]">
                                {module.divisionTitle}
                              </span>

                              <span
                                className={
                                  enabled
                                    ? "rounded-full border border-green-500/20 bg-[var(--success-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--success)]"
                                    : "rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-xs font-bold uppercase text-[var(--text-muted)]"
                                }
                              >
                                {enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
