import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import WorkspaceAccessHeader from "../../../components/client/workspace-access/WorkspaceAccessHeader";
import WorkspaceInvitationsPanel from "../../../components/client/workspace-access/WorkspaceInvitationsPanel";
import WorkspaceMemberAccessPanel from "../../../components/client/workspace-access/WorkspaceMemberAccessPanel";

import {
  archiveClientWorkspaceMember,
  buildMemberAccessRows,
  cancelClientWorkspaceInvitation,
  getClientWorkspaceAccessData,
  inviteClientWorkspaceMember,
  updateWorkspaceMemberFeatureAccess,
} from "../../../services/operations/client_workspace_access";

const DEFAULT_INVITATION_FORM = {
  email: "",
  role: "member",
};

function parseInviteEmails(value = "") {
  return [
    ...new Set(
      String(value)
        .split(/[\n,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

async function copyTextToClipboard(text) {
  if (!text) {
    throw new Error("Nothing to copy.");
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed.");
  }

  return true;
}

export default function ClientWorkspaceAccess() {
  const [activeTab, setActiveTab] = useState("invitations");

  const [workspace, setWorkspace] = useState(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceRole, setWorkspaceRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const [members, setMembers] = useState([]);
  const [modules, setModules] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [memberAccessRows, setMemberAccessRows] = useState([]);

  const [invitationForm, setInvitationForm] = useState(DEFAULT_INVITATION_FORM);
  const [latestInvitation, setLatestInvitation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [archivingMemberId, setArchivingMemberId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkspaceAccess();
  }, []);

  async function loadWorkspaceAccess() {
    try {
      setLoading(true);
      setError("");

      const data = await getClientWorkspaceAccessData();

      setWorkspace(data.workspace || null);
      setWorkspaceId(data.workspaceId || "");
      setWorkspaceRole(data.workspaceRole || "");
      setCurrentUserId(data.currentUserId || "");
      setMembers(data.members || []);
      setModules(data.modules || []);
      setInvitations(data.invitations || []);
      setMemberAccessRows(data.memberAccessRows || []);
    } catch (err) {
      console.error("Client workspace access load error:", err);
      setError(err.message || "Failed to load workspace access.");
    } finally {
      setLoading(false);
    }
  }

  function updateInvitationForm(field, value) {
    setInvitationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleCreateInvitation(event) {
    event.preventDefault();

    const emails = parseInviteEmails(invitationForm.email);

    if (!emails.length) {
      alert("Enter at least one email address.");
      return;
    }

    try {
      setSavingInvite(true);

      const results = [];
      const failed = [];

      for (const email of emails) {
        try {
          const created = await inviteClientWorkspaceMember({
            email,
            role: invitationForm.role,
          });

          results.push(created);
        } catch (err) {
          failed.push({
            email,
            message: err.message || "Failed to create invitation.",
          });
        }
      }

      if (results.length) {
        setLatestInvitation(
          results.length === 1
            ? results[0]
            : {
                inviteUrl: results.map((item) => item.inviteUrl).join("\n"),
                invitations: results,
              }
        );
      }

      if (!failed.length) {
        setInvitationForm(DEFAULT_INVITATION_FORM);
      }

      await loadWorkspaceAccess();
      setActiveTab("invitations");

      if (failed.length) {
        alert(
          `Created ${results.length} invitation(s), but ${failed.length} failed:\n\n${failed
            .map((item) => `${item.email}: ${item.message}`)
            .join("\n")}`
        );
      } else {
        alert(`Created ${results.length} invitation(s).`);
      }
    } catch (err) {
      console.error("Client workspace invitation error:", err);
      alert(err.message || "Failed to create invitation.");
    } finally {
      setSavingInvite(false);
    }
  }

  async function handleCancelInvitation(invitation) {
    const confirmed = window.confirm(
      `Cancel invitation for ${invitation.email}?`
    );

    if (!confirmed) return;

    try {
      await cancelClientWorkspaceInvitation(invitation.id);

      if (latestInvitation?.invitation?.id === invitation.id) {
        setLatestInvitation(null);
      }

      await loadWorkspaceAccess();
    } catch (err) {
      console.error("Cancel client workspace invitation error:", err);
      alert(err.message || "Failed to cancel invitation.");
    }
  }

  async function handleCopyInvitation(inviteUrl) {
    try {
      await copyTextToClipboard(inviteUrl);
      alert("Invite link copied.");
    } catch (err) {
      console.error("Copy invite link error:", err);
      alert("Copy failed. Please select the invite link and copy it manually.");
    }
  }

  async function handleToggleMemberAccess({ userId, featureKey, isEnabled }) {
    if (!workspaceId) return;

    const key = `${userId}:${featureKey}`;

    try {
      setSavingKey(key);

      const updated = await updateWorkspaceMemberFeatureAccess({
        workspaceId,
        userId,
        featureKey,
        isEnabled,
      });

      setMemberAccessRows((prev) => {
        const exists = prev.some(
          (row) =>
            row.workspace_id === workspaceId &&
            row.user_id === userId &&
            row.feature_key === featureKey
        );

        if (!exists) {
          return [...prev, updated];
        }

        return prev.map((row) =>
          row.workspace_id === workspaceId &&
          row.user_id === userId &&
          row.feature_key === featureKey
            ? updated
            : row
        );
      });
    } catch (err) {
      console.error("Member feature access update error:", err);
      alert(err.message || "Failed to update member access.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleArchiveMember(member) {
    if (!workspaceId || !member?.id) return;

    const memberName =
      member.user?.full_name || member.user?.email || "this member";

    const confirmed = window.confirm(
      `Remove ${memberName} from this workspace?\n\nThey will lose access to this workspace, but their account will not be deleted. You can invite them again later.`
    );

    if (!confirmed) return;

    try {
      setArchivingMemberId(member.id);

      await archiveClientWorkspaceMember({
        workspaceId,
        memberId: member.id,
      });

      setMemberAccessRows((prev) =>
        prev.map((row) =>
          row.workspace_id === workspaceId && row.user_id === member.user_id
            ? {
                ...row,
                is_enabled: false,
                enabled_at: null,
              }
            : row
        )
      );

      await loadWorkspaceAccess();
      alert(`${memberName} has been removed from this workspace.`);
    } catch (err) {
      console.error("Archive workspace member error:", err);
      alert(err.message || "Failed to remove workspace member.");
    } finally {
      setArchivingMemberId("");
    }
  }

  const memberRows = useMemo(() => {
    return buildMemberAccessRows({
      members,
      modules,
      memberAccessRows,
    });
  }, [members, modules, memberAccessRows]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
        <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
          Loading workspace access...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

          <div className="flex-1">
            <h3 className="font-semibold text-[var(--danger)]">
              Workspace access unavailable
            </h3>

            <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>

            <button
              type="button"
              onClick={loadWorkspaceAccess}
              className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceAccessHeader
        workspace={workspace}
        workspaceRole={workspaceRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadWorkspaceAccess}
      />

      {activeTab === "invitations" && (
        <WorkspaceInvitationsPanel
          form={invitationForm}
          invitations={invitations}
          latestInvitation={latestInvitation}
          saving={savingInvite}
          onFormChange={updateInvitationForm}
          onSubmit={handleCreateInvitation}
          onCancelInvitation={handleCancelInvitation}
          onCopyInvitation={handleCopyInvitation}
        />
      )}

      {activeTab === "access" && (
        <WorkspaceMemberAccessPanel
          members={memberRows}
          modules={modules}
          memberAccessRows={memberAccessRows}
          currentUserId={currentUserId}
          workspaceRole={workspaceRole}
          savingKey={savingKey}
          archivingMemberId={archivingMemberId}
          onToggleAccess={handleToggleMemberAccess}
          onArchiveMember={handleArchiveMember}
        />
      )}
    </div>
  );
}
