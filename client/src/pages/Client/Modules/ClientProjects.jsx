import { useEffect, useMemo, useState } from "react";

import {
  addClientProjectActivity,
  archiveClientProject,
  archiveClientProjectTask,
  createClientProject,
  createClientProjectTask,
  getClientProjectsData,
  updateClientProject,
  updateClientProjectTask,
} from "../../../services/clientProjects";

import {
  ClientProjectDetailDrawer,
  ClientProjectFormModal,
  ClientProjectTaskModal,
  ClientProjectsErrorState,
  ClientProjectsFilterToolbar,
  ClientProjectsHeader,
  ClientProjectsKPICards,
  ClientProjectsList,
  ClientProjectsLoadingState,
} from "../../../components/client/layout/Client_Projects_Components.jsx";

export default function ClientProjects() {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stages, setStages] = useState([]);
  const [priorities, setPriorities] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    status: "all",
    priority: "all",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects(selectedProjectId = selectedProject?.id) {
    try {
      setLoading(true);
      setError("");

      const data = await getClientProjectsData(workspaceId);

      setWorkspaceId(data.workspaceId);
      setProjects(data.projects || []);
      setStages(data.stages || []);
      setPriorities(data.priorities || []);

      if (selectedProjectId) {
        const refreshedProject = (data.projects || []).find(
          (project) => project.id === selectedProjectId
        );

        setSelectedProject(refreshedProject || null);
      }
    } catch (err) {
      console.error("Client projects load error:", err);
      setError(err.message || "Failed to load client projects.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(payload) {
    try {
      setSaving(true);
      await createClientProject(payload);
      setModalMode(null);
      await loadProjects(null);
    } catch (err) {
      alert(err.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProject(payload) {
    if (!selectedProject?.id) return;

    try {
      setSaving(true);
      await updateClientProject(selectedProject.id, payload);
      setModalMode(null);
      await loadProjects(selectedProject.id);
    } catch (err) {
      alert(err.message || "Failed to update project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveProject() {
    if (!selectedProject?.id) return;

    const confirmed = window.confirm(`Archive "${selectedProject.name}"?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await archiveClientProject(selectedProject.id);
      setSelectedProject(null);
      await loadProjects(null);
    } catch (err) {
      alert(err.message || "Failed to archive project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTask(payload) {
    if (!selectedProject?.id) return;

    try {
      setSaving(true);
      await createClientProjectTask({
        ...payload,
        clientProjectId: selectedProject.id,
      });

      setModalMode(null);
      await loadProjects(selectedProject.id);
    } catch (err) {
      alert(err.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTask(payload) {
    if (!selectedTask?.id || !selectedProject?.id) return;

    try {
      setSaving(true);
      await updateClientProjectTask(selectedTask.id, payload);
      setSelectedTask(null);
      setModalMode(null);
      await loadProjects(selectedProject.id);
    } catch (err) {
      alert(err.message || "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveTask(task) {
    if (!task?.id || !selectedProject?.id) return;

    const confirmed = window.confirm(`Archive task "${task.title}"?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await archiveClientProjectTask(task.id);
      await loadProjects(selectedProject.id);
    } catch (err) {
      alert(err.message || "Failed to archive task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(projectId, message) {
    try {
      setSaving(true);

      await addClientProjectActivity({
        workspaceId,
        clientProjectId: projectId,
        message,
      });

      await loadProjects(projectId);
    } catch (err) {
      alert(err.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        !search ||
        project.name.toLowerCase().includes(search) ||
        project.serviceCategory.toLowerCase().includes(search) ||
        project.servicePackage.toLowerCase().includes(search) ||
        project.description.toLowerCase().includes(search);

      return (
        matchesSearch &&
        (filters.stage === "all" || project.stage === filters.stage) &&
        (filters.status === "all" || project.status === filters.status) &&
        (filters.priority === "all" || project.priority === filters.priority)
      );
    });
  }, [projects, filters]);

  return (
    <div className="space-y-6">
      <ClientProjectsHeader
        onRefresh={() => loadProjects()}
        onCreate={() => setModalMode("create-project")}
      />

      {loading && <ClientProjectsLoadingState />}

      {!loading && error && (
        <ClientProjectsErrorState message={error} onRetry={() => loadProjects()} />
      )}

      {!loading && !error && (
        <>
          <ClientProjectsKPICards projects={projects} />

          <ClientProjectsFilterToolbar
            filters={filters}
            onFilterChange={setFilters}
            stages={stages}
            priorities={priorities}
          />

          <ClientProjectsList
            projects={filteredProjects}
            onSelectProject={setSelectedProject}
          />
        </>
      )}

      {selectedProject && (
        <ClientProjectDetailDrawer
          project={selectedProject}
          saving={saving}
          onClose={() => setSelectedProject(null)}
          onEdit={() => setModalMode("edit-project")}
          onAddTask={() => setModalMode("create-task")}
          onEditTask={(task) => {
            setSelectedTask(task);
            setModalMode("edit-task");
          }}
          onArchiveTask={handleArchiveTask}
          onArchive={handleArchiveProject}
          onAddNote={handleAddNote}
        />
      )}

      {(modalMode === "create-project" || modalMode === "edit-project") && (
        <ClientProjectFormModal
          mode={modalMode === "edit-project" ? "edit" : "create"}
          project={modalMode === "edit-project" ? selectedProject : null}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSubmit={
            modalMode === "edit-project"
              ? handleUpdateProject
              : handleCreateProject
          }
        />
      )}

      {(modalMode === "create-task" || modalMode === "edit-task") && (
        <ClientProjectTaskModal
          mode={modalMode === "edit-task" ? "edit" : "create"}
          task={modalMode === "edit-task" ? selectedTask : null}
          project={selectedProject}
          saving={saving}
          onClose={() => {
            setSelectedTask(null);
            setModalMode(null);
          }}
          onSubmit={
            modalMode === "edit-task" ? handleUpdateTask : handleCreateTask
          }
        />
      )}
    </div>
  );
}
