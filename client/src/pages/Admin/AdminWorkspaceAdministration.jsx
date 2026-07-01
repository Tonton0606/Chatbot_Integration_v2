import { useEffect, useMemo, useState } from "react";

import {
  createWorkspace,
  getWorkspaceAdministrationData,
  getWorkspaceAssignableProfiles,
  removeWorkspaceMember,
  updateWorkspace,
  updateWorkspaceStatus,
  upsertWorkspaceMember,
} from "../../services/operations/workspace_administration";

import {
  cancelWorkspaceInvitation,
  createWorkspaceInvitation,
  expireWorkspaceInvitations,
  listWorkspaceInvitations,
} from "../../services/operations/workspace_invitations";

import {
  WorkspaceAdministrationErrorState,
  WorkspaceAdministrationHeader,
  WorkspaceAdministrationKPICards,
  WorkspaceAdministrationLoadingState,
  WorkspaceAdministrationToolbar,
  WorkspaceDetailPanel,
  WorkspaceFormModal,
  WorkspaceTable,
} from "../../components/admin/layout/Admin_WorkspaceAdministration_Components.jsx";

const DEFAULT_WORKSPACE_FORM = {
  name: "",
  workspace_type: "individual",
  status: "active",
  owner_user_id: "",
};

const DEFAULT_MEMBER_FORM = {
  user_id: "",
  role: "member",
};

const DEFAULT_INVITATION_FORM = {
  email: "",
  role: "member",
};

export default function AdminWorkspaceAdministration() {
  const [workspaces, setWorkspaces] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("create");
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null);

  const [workspaceForm, setWorkspaceForm] = useState(DEFAULT_WORKSPACE_FORM);
  const [memberForm, setMemberForm] = useState(DEFAULT_MEMBER_FORM);
  const [invitationForm, setInvitationForm] = useState(DEFAULT_INVITATION_FORM);
  const [invitations, setInvitations] = useState([]);
  const [latestInvitation, setLatestInvitation] = useState(null);

  useEffect(() => {
    loadWorkspaceAdministration();
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setInvitations([]);
      setLatestInvitation(null);
      return;
    }

    loadWorkspaceInvitations(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  async function loadWorkspaceAdministration() {
    try {
      setLoading(true);
      setError("");

      await expireWorkspaceInvitations();

      const [workspaceRows, profileRows] = await Promise.all([
        getWorkspaceAdministrationData(),
        getWorkspaceAssignableProfiles(),
      ]);

      setWorkspaces(workspaceRows || []);
      setProfiles(profileRows || []);

      if (!selectedWorkspaceId) {
        setSelectedWorkspaceId(workspaceRows?.[0]?.id || "");
      }
    } catch (err) {
      console.error("Workspace administration load error:", err);
      setError(err.message || "Failed to load workspace administration.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkspaceInvitations(workspaceId) {
    try {
      const rows = await listWorkspaceInvitations(workspaceId);
      setInvitations(rows || []);
    } catch (err) {
      console.error("Workspace invitations load error:", err);
      setInvitations([]);
    }
  }

  function updateWorkspaceForm(field, value) {
    setWorkspaceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateMemberForm(field, value) {
    setMemberForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateInvitationForm(field, value) {
    setInvitationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openCreateWorkspaceModal() {
    setWorkspaceMode("create");
    setEditingWorkspaceId(null);
    setWorkspaceForm(DEFAULT_WORKSPACE_FORM);
    setWorkspaceModalOpen(true);
  }

  function openEditWorkspaceModal(workspace) {
    setWorkspaceMode("edit");
    setEditingWorkspaceId(workspace.id);

    setWorkspaceForm({
      name: workspace.name || "",
      workspace_type: workspace.workspace_type || "individual",
      status: workspace.status || "active",
      owner_user_id: workspace.owner_user_id || "",
    });

    setWorkspaceModalOpen(true);
  }

  async function handleWorkspaceSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (workspaceMode === "edit") {
        await updateWorkspace(editingWorkspaceId, workspaceForm);
      } else {
        const created = await createWorkspace(workspaceForm);
        setSelectedWorkspaceId(created.id);
      }

      setWorkspaceModalOpen(false);
      await loadWorkspaceAdministration();
    } catch (err) {
      console.error("Workspace save error:", err);
      alert(err.message || "Failed to save workspace.");
    } finally {
      setSaving(false);
    }
  }

  async function handleWorkspaceStatusChange(workspace, nextStatus) {
    const confirmed = window.confirm(
      `Change "${workspace.name}" status to "${nextStatus}"?`
    );

    if (!confirmed) return;

    try {
      await updateWorkspaceStatus(workspace.id, nextStatus);
      await loadWorkspaceAdministration();
    } catch (err) {
      console.error("Workspace status error:", err);
      alert(err.message || "Failed to update workspace status.");
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();

    if (!selectedWorkspaceId) {
      alert("Select a workspace first.");
      return;
    }

    try {
      await upsertWorkspaceMember({
        workspaceId: selectedWorkspaceId,
        userId: memberForm.user_id,
        role: memberForm.role,
      });

      setMemberForm(DEFAULT_MEMBER_FORM);
      await loadWorkspaceAdministration();
    } catch (err) {
      console.error("Workspace member save error:", err);
      alert(err.message || "Failed to save workspace member.");
    }
  }

  async function handleCreateInvitation(event) {
    event.preventDefault();

    if (!selectedWorkspaceId) {
      alert("Select a workspace first.");
      return;
    }

    try {
      const created = await createWorkspaceInvitation({
        workspaceId: selectedWorkspaceId,
        email: invitationForm.email,
        role: invitationForm.role,
      });

      setLatestInvitation(created);
      setInvitationForm(DEFAULT_INVITATION_FORM);
      await loadWorkspaceInvitations(selectedWorkspaceId);
    } catch (err) {
      console.error("Workspace invitation create error:", err);
      alert(err.message || "Failed to create invitation.");
    }
  }

  async function handleCancelInvitation(invitation) {
    const confirmed = window.confirm(
      `Cancel invitation for ${invitation.email}?`
    );

    if (!confirmed) return;

    try {
      await cancelWorkspaceInvitation(invitation.id);
      if (latestInvitation?.invitation?.id === invitation.id) {
        setLatestInvitation(null);
      }
      await loadWorkspaceInvitations(selectedWorkspaceId);
    } catch (err) {
      console.error("Workspace invitation cancel error:", err);
      alert(err.message || "Failed to cancel invitation.");
    }
  }

  async function handleCopyInvitation(inviteUrl) {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied.");
    } catch (err) {
      console.error("Copy invite link error:", err);
      alert("Failed to copy invite link.");
    }
  }

  async function handleRemoveMember(member) {
    const confirmed = window.confirm(
      `Remove ${member.user?.email || "this member"} from workspace?`
    );

    if (!confirmed) return;

    try {
      await removeWorkspaceMember(member.id);
      await loadWorkspaceAdministration();
    } catch (err) {
      console.error("Remove workspace member error:", err);
      alert(err.message || "Failed to remove workspace member.");
    }
  }

  function handleSelectWorkspace(workspace) {
    setSelectedWorkspaceId(workspace.id);
    setLatestInvitation(null);
  }

  const selectedWorkspace = useMemo(() => {
    return (
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ||
      null
    );
  }, [workspaces, selectedWorkspaceId]);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const ownerText = [
        workspace.owner?.full_name,
        workspace.owner?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const memberText = (workspace.workspace_members || [])
        .map((member) =>
          [
            member.user?.full_name,
            member.user?.email,
            member.role,
            member.user?.role,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        workspace.name?.toLowerCase().includes(query) ||
        workspace.id?.toLowerCase().includes(query) ||
        ownerText.includes(query) ||
        memberText.includes(query);

      const matchesType =
        typeFilter === "all" || workspace.workspace_type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || workspace.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [workspaces, search, typeFilter, statusFilter]);

  if (loading) {
    return <WorkspaceAdministrationLoadingState />;
  }

  if (error) {
    return (
      <WorkspaceAdministrationErrorState
        message={error}
        onRetry={loadWorkspaceAdministration}
      />
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceAdministrationHeader
        onRefresh={loadWorkspaceAdministration}
        onCreateWorkspace={openCreateWorkspaceModal}
      />

      <WorkspaceAdministrationKPICards workspaces={workspaces} />

      <WorkspaceAdministrationToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WorkspaceTable
            workspaces={filteredWorkspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            onSelectWorkspace={handleSelectWorkspace}
            onEditWorkspace={openEditWorkspaceModal}
            onStatusChange={handleWorkspaceStatusChange}
          />
        </div>

        <div>
          <WorkspaceDetailPanel
            workspace={selectedWorkspace}
            profiles={profiles}
            memberForm={memberForm}
            invitationForm={invitationForm}
            invitations={invitations}
            latestInvitation={latestInvitation}
            onMemberFormChange={updateMemberForm}
            onInvitationFormChange={updateInvitationForm}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onCreateInvitation={handleCreateInvitation}
            onCancelInvitation={handleCancelInvitation}
            onCopyInvitation={handleCopyInvitation}
          />
        </div>
      </div>

      <WorkspaceFormModal
        open={workspaceModalOpen}
        mode={workspaceMode}
        form={workspaceForm}
        profiles={profiles}
        saving={saving}
        onChange={updateWorkspaceForm}
        onSubmit={handleWorkspaceSubmit}
        onClose={() => setWorkspaceModalOpen(false)}
      />
    </div>
  );
}
