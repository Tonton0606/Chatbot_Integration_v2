import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus, RefreshCw, Settings } from "lucide-react";

import "../../../styles/clientOperationsTeams.css";

import { supabase } from "../../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../../../services/workspaceResolver";

import {
  createClientOperationTeam,
  getClientOperationTeamSetupOptions,
  getClientOperationTeams,
} from "../../../services/client/operations/teams";

import {
  createClientOperationAssignment,
  getClientOperationAssignments,
  CLIENT_OPERATION_ASSIGNMENT_PRIORITIES,
  CLIENT_OPERATION_ASSIGNEE_TYPES,
} from "../../../services/client/operations/assignments";

import {
  ClientOperationsTeamRolesModal,
  ClientOperationsTeamTypesModal,
} from "../../../components/client/operations/ClientOperationsConfigModals";

import {
  CreateAssignmentModal,
  CreateTeamModal,
} from "../../../components/client/operations/ClientOperationsTeamModals";

import ClientOperationsDashboard from "../../../components/client/operations/ClientOperationsDashboard";

function LoadingState() {
  return (
    <div className="client-op-page">
      <div className="client-op-empty">
        <Loader2 className="h-5 w-5 animate-spin" />
        <div className="client-op-empty-title">Loading client operations...</div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="client-op-page">
      <div className="client-op-empty">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <div className="client-op-empty-title">Failed to load operations</div>
        <div className="client-op-empty-sub">{message}</div>
        <button type="button" onClick={onRetry} className="client-op-btn primary">
          Retry
        </button>
      </div>
    </div>
  );
}

async function getActiveClientEmployees() {
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("client_hr_employees")
    .select(
      "id, first_name, last_name, email, employee_code, is_active, archived_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw error;

  return data || [];
}

export default function ClientOperationsTeams() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeModal, setActiveModal] = useState("");
  const [formError, setFormError] = useState("");
  const [setupOptions, setSetupOptions] = useState({
    teamTypes: [],
    teamRoles: [],
  });

  const [teamForm, setTeamForm] = useState({
    name: "",
    type_id: "",
    type_key: "operations",
    description: "",
    color: "",
    initial_employee_id: "",
    initial_role_id: "",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    assignee_type: "team",
    assignee_id: "",
    role_id: "",
    priority: "medium",
    due_date: "",
  });

  function resetTeamForm(options = setupOptions) {
    const defaultType = options.teamTypes?.[0];

    setTeamForm({
      name: "",
      type_id: defaultType?.id || "",
      type_key: defaultType?.type_key || "operations",
      description: "",
      color: defaultType?.color || "",
      initial_employee_id: "",
      initial_role_id: "",
    });
  }

  function resetAssignmentForm() {
    setAssignmentForm({
      title: "",
      description: "",
      assignee_type: teams.length > 0 ? "team" : "employee",
      assignee_id: "",
      role_id: "",
      priority: "medium",
      due_date: "",
    });
  }

  async function loadOperations() {
    try {
      setLoading(true);
      setError("");

      const [teamsData, assignmentsData, optionsData, employeesData] =
        await Promise.all([
          getClientOperationTeams(),
          getClientOperationAssignments(),
          getClientOperationTeamSetupOptions(),
          getActiveClientEmployees(),
        ]);

      setTeams(teamsData || []);
      setAssignments(assignmentsData || []);
      setSetupOptions(optionsData || { teamTypes: [], teamRoles: [] });
      setEmployees(employeesData || []);

      resetTeamForm(optionsData || { teamTypes: [], teamRoles: [] });
    } catch (err) {
      console.error("Client operations teams load error:", err);
      setError(err.message || "Failed to load client operations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOperations();
  }, []);

  async function handleCreateTeam(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");

      if (!teamForm.name.trim()) {
        throw new Error("Team name is required.");
      }

      const members = teamForm.initial_employee_id
        ? [
            {
              employee_id: teamForm.initial_employee_id,
              role_id: teamForm.initial_role_id || null,
              capacity_points: 40,
            },
          ]
        : [];

      await createClientOperationTeam({
        name: teamForm.name,
        type_id: teamForm.type_id || null,
        type_key: teamForm.type_key || "operations",
        description: teamForm.description,
        color: teamForm.color || null,
        members,
      });

      setActiveModal("");
      resetTeamForm();
      await loadOperations();
    } catch (err) {
      console.error("Create team error:", err);
      setFormError(err.message || "Failed to create team.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAssignment(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");

      if (!assignmentForm.title.trim()) {
        throw new Error("Assignment title is required.");
      }

      if (!assignmentForm.assignee_id) {
        throw new Error("Assignment assignee is required.");
      }

      await createClientOperationAssignment({
        title: assignmentForm.title,
        description: assignmentForm.description,
        assignee_type: assignmentForm.assignee_type,
        assignee_id: assignmentForm.assignee_id,
        role_id: assignmentForm.role_id || null,
        priority: assignmentForm.priority,
        due_date: assignmentForm.due_date || null,
        record_label: assignmentForm.title,
      });

      setActiveModal("");
      resetAssignmentForm();
      await loadOperations();
    } catch (err) {
      console.error("Create assignment error:", err);
      setFormError(err.message || "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  }

  const kpis = useMemo(() => {
    const completed = assignments.filter(
      (assignment) => assignment.status === "completed"
    ).length;

    const activeAssignments = assignments.filter(
      (assignment) => assignment.status !== "completed"
    ).length;

    const members = teams.reduce(
      (sum, team) => sum + Number(team.member_count || 0),
      0
    );

    return {
      teams: teams.length,
      members,
      assignments: assignments.length,
      activeAssignments,
      completed,
      roles: setupOptions.teamRoles?.length || 0,
    };
  }, [assignments, setupOptions.teamRoles?.length, teams]);

  function openTeamModal() {
    resetTeamForm();
    setFormError("");
    setActiveModal("team");
  }

  function openAssignmentModal() {
    resetAssignmentForm();
    setFormError("");
    setActiveModal("assignment");
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadOperations} />;
  }

  return (
    <div className="client-op-page">
      {activeModal === "team" && (
        <CreateTeamModal
          setupOptions={setupOptions}
          employees={employees}
          saving={saving}
          form={teamForm}
          setForm={setTeamForm}
          onClose={() => {
            setActiveModal("");
            setFormError("");
          }}
          onSubmit={handleCreateTeam}
        />
      )}

      {activeModal === "assignment" && (
        <CreateAssignmentModal
          teams={teams}
          employees={employees}
          setupOptions={setupOptions}
          saving={saving}
          form={assignmentForm}
          setForm={setAssignmentForm}
          onClose={() => {
            setActiveModal("");
            setFormError("");
          }}
          onSubmit={handleCreateAssignment}
          assigneeTypes={CLIENT_OPERATION_ASSIGNEE_TYPES}
          priorities={CLIENT_OPERATION_ASSIGNMENT_PRIORITIES}
        />
      )}

      {activeModal === "teamTypes" && (
        <ClientOperationsTeamTypesModal
          onClose={() => setActiveModal("")}
          onChanged={loadOperations}
        />
      )}

      {activeModal === "teamRoles" && (
        <ClientOperationsTeamRolesModal
          onClose={() => setActiveModal("")}
          onChanged={loadOperations}
        />
      )}

      <div className="client-op-header">
        <div>
          <div className="client-op-breadcrumb">
            Operations <span>›</span> <strong>Teams & Assignments</strong>
          </div>

          <h1 className="client-op-title">Teams & Assignments</h1>

          <p className="client-op-subtitle">
            Manage lightweight client teams, hierarchy, workload, and operational
            assignments using workspace-safe client HR records.
          </p>

          {formError && (
            <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">
              {formError}
            </p>
          )}
        </div>

        <div className="client-op-header-actions">
          <button type="button" onClick={openAssignmentModal} className="client-op-btn">
            <Plus className="h-4 w-4" />
            Create Assignment
          </button>

          <button type="button" onClick={openTeamModal} className="client-op-btn primary">
            <Plus className="h-4 w-4" />
            Create Team
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError("");
              setActiveModal("teamTypes");
            }}
            className="client-op-btn"
          >
            <Settings className="h-4 w-4" />
            Team Types
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError("");
              setActiveModal("teamRoles");
            }}
            className="client-op-btn"
          >
            <Settings className="h-4 w-4" />
            Member Roles
          </button>

          <button type="button" onClick={loadOperations} className="client-op-btn ghost">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <ClientOperationsDashboard
        kpis={kpis}
        teams={teams}
        assignments={assignments}
        teamTypes={setupOptions.teamTypes || []}
        onCreateTeam={openTeamModal}
        onCreateAssignment={openAssignmentModal}
      />
    </div>
  );
}
