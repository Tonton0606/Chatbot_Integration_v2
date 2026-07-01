import { useEffect, useMemo, useState } from "react";

import {
  archiveClientTask,
  createClientTask,
  getClientTasksData,
  updateClientTask,
} from "../../../services/clientTasks";

import {
  ClientTaskDetailDrawer,
  ClientTaskFormModal,
  ClientTasksErrorState,
  ClientTasksHeader,
  ClientTasksKPICards,
  ClientTasksKanban,
  ClientTasksList,
  ClientTasksLoadingState,
  ClientTasksToolbar,
} from "../../../components/client/layout/Client_Tasks_Components.jsx";

export default function ClientTasks() {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [view, setView] = useState("kanban");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    project: "all",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks(selectedTaskId = selectedTask?.id) {
    try {
      setLoading(true);
      setError("");

      const data = await getClientTasksData(workspaceId);

      setWorkspaceId(data.workspaceId);
      setTasks(data.tasks || []);
      setProjects(data.projects || []);
      setStatuses(data.statuses || []);
      setPriorities(data.priorities || []);

      if (selectedTaskId) {
        const refreshedTask = (data.tasks || []).find(
          (task) => task.id === selectedTaskId
        );

        setSelectedTask(refreshedTask || null);
      }
    } catch (err) {
      console.error("Client tasks load error:", err);
      setError(err.message || "Failed to load client tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(payload) {
    try {
      setSaving(true);
      await createClientTask(payload);
      setModalMode(null);
      await loadTasks(null);
    } catch (err) {
      alert(err.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTask(payload) {
    if (!selectedTask?.id) return;

    try {
      setSaving(true);
      await updateClientTask(selectedTask.id, payload);
      setModalMode(null);
      await loadTasks(selectedTask.id);
    } catch (err) {
      alert(err.message || "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveTask() {
    if (!selectedTask?.id) return;

    const confirmed = window.confirm(`Archive task "${selectedTask.title}"?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await archiveClientTask(selectedTask.id);
      setSelectedTask(null);
      await loadTasks(null);
    } catch (err) {
      alert(err.message || "Failed to archive task.");
    } finally {
      setSaving(false);
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search) ||
        (task.project?.name || "").toLowerCase().includes(search);

      const matchesProject =
        filters.project === "all" ||
        (filters.project === "standalone" && !task.clientProjectId) ||
        task.clientProjectId === filters.project;

      return (
        matchesSearch &&
        matchesProject &&
        (filters.status === "all" || task.status === filters.status) &&
        (filters.priority === "all" || task.priority === filters.priority)
      );
    });
  }, [tasks, filters]);

  return (
    <div className="space-y-6">
      <ClientTasksHeader
        onRefresh={() => loadTasks()}
        onCreate={() => setModalMode("create-task")}
      />

      {loading && <ClientTasksLoadingState />}

      {!loading && error && (
        <ClientTasksErrorState message={error} onRetry={() => loadTasks()} />
      )}

      {!loading && !error && (
        <>
          <ClientTasksKPICards tasks={tasks} />

          <ClientTasksToolbar
            filters={filters}
            onFilterChange={setFilters}
            statuses={statuses}
            priorities={priorities}
            projects={projects}
            view={view}
            onViewChange={setView}
          />

          {view === "kanban" ? (
            <ClientTasksKanban
              tasks={filteredTasks}
              statuses={statuses}
              onSelectTask={setSelectedTask}
            />
          ) : (
            <ClientTasksList
              tasks={filteredTasks}
              onSelectTask={setSelectedTask}
            />
          )}
        </>
      )}

      {selectedTask && (
        <ClientTaskDetailDrawer
          task={selectedTask}
          saving={saving}
          onClose={() => setSelectedTask(null)}
          onEdit={() => setModalMode("edit-task")}
          onArchive={handleArchiveTask}
        />
      )}

      {(modalMode === "create-task" || modalMode === "edit-task") && (
        <ClientTaskFormModal
          mode={modalMode === "edit-task" ? "edit" : "create"}
          task={modalMode === "edit-task" ? selectedTask : null}
          projects={projects}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSubmit={
            modalMode === "edit-task" ? handleUpdateTask : handleCreateTask
          }
        />
      )}
    </div>
  );
}
