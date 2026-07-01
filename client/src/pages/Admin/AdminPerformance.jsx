import { useEffect, useState } from "react";

import {
  EvaluationFormModal,
  EvaluationsTable,
  GoalFormModal,
  GoalsTable,
  PerformanceAIInsights,
  PerformanceErrorState,
  PerformanceHeader,
  PerformanceKPICards,
  PerformanceLoadingState,
  ReviewCycleFormModal,
  ReviewCyclesTable,
} from "../../components/admin/layout/Admin_Performance_Components.jsx";

import {
  createEvaluation,
  createGoal,
  createReviewCycle,
  deleteEvaluation,
  deleteGoal,
  deleteReviewCycle,
  getPerformanceData,
  updateEvaluation,
  updateGoal,
  updateReviewCycle,
} from "../../services/human_resources/performance";

const EMPTY_CYCLE_FORM = {
  cycleCode: "",
  name: "",
  reviewType: "quarterly",
  startDate: "",
  endDate: "",
  status: "in_progress",
  description: "",
};

const EMPTY_EVALUATION_FORM = {
  reviewCycleId: "",
  employeeId: "",
  reviewerEmployeeId: "",
  score: "",
  status: "pending",
  reviewDate: "",
  summary: "",
  strengths: "",
  improvementAreas: "",
  aiSignal: "",
};

const EMPTY_GOAL_FORM = {
  employeeId: "",
  goalTitle: "",
  category: "",
  progress: 0,
  status: "on_track",
  dueDate: "",
};

export default function AdminPerformance() {
  const [reviewCycles, setReviewCycles] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [insights, setInsights] = useState([]);

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const [editingCycle, setEditingCycle] = useState(null);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);

  const [cycleForm, setCycleForm] = useState(EMPTY_CYCLE_FORM);
  const [evaluationForm, setEvaluationForm] = useState(EMPTY_EVALUATION_FORM);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPerformance();
  }, []);

  async function loadPerformance() {
    try {
      setLoading(true);
      setError("");

      const data = await getPerformanceData();

      setReviewCycles(data.reviewCycles || []);
      setEvaluations(data.evaluations || []);
      setGoals(data.goals || []);
      setEmployees(data.employees || []);
      setInsights(data.insights || []);
    } catch (err) {
      console.error("Performance load error:", err);
      setError(err.message || "Failed to load performance.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateCycle() {
    setEditingCycle(null);
    setCycleForm(EMPTY_CYCLE_FORM);
    setShowCycleModal(true);
  }

  function openEditCycle(cycle) {
    setEditingCycle(cycle);
    setCycleForm({
      cycleCode: cycle.cycleCode || "",
      name: cycle.name || "",
      reviewType: cycle.reviewType || "quarterly",
      startDate: cycle.startDate || "",
      endDate: cycle.endDate || "",
      status: cycle.status || "in_progress",
      description: cycle.description || "",
    });
    setShowCycleModal(true);
  }

  function openCreateEvaluation() {
    setEditingEvaluation(null);
    setEvaluationForm({
      ...EMPTY_EVALUATION_FORM,
      reviewCycleId: reviewCycles[0]?.id || "",
    });
    setShowEvaluationModal(true);
  }

  function openEditEvaluation(evaluation) {
    setEditingEvaluation(evaluation);
    setEvaluationForm({
      reviewCycleId: evaluation.reviewCycleId || "",
      employeeId: evaluation.employeeId || "",
      reviewerEmployeeId: evaluation.reviewerEmployeeId || "",
      score: evaluation.score ?? "",
      status: evaluation.status || "pending",
      reviewDate: evaluation.reviewDate || "",
      summary: evaluation.summary || "",
      strengths: evaluation.strengths || "",
      improvementAreas: evaluation.improvementAreas || "",
      aiSignal: evaluation.aiSignal || "",
    });
    setShowEvaluationModal(true);
  }

  function openCreateGoal() {
    setEditingGoal(null);
    setGoalForm(EMPTY_GOAL_FORM);
    setShowGoalModal(true);
  }

  function openEditGoal(goal) {
    setEditingGoal(goal);
    setGoalForm({
      employeeId: goal.employeeId || "",
      goalTitle: goal.goalTitle || "",
      category: goal.category || "",
      progress: goal.progress || 0,
      status: goal.status || "on_track",
      dueDate: goal.dueDate || "",
    });
    setShowGoalModal(true);
  }

  async function handleSaveCycle(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingCycle?.id) await updateReviewCycle(editingCycle.id, cycleForm);
      else await createReviewCycle(cycleForm);
      setShowCycleModal(false);
      await loadPerformance();
    } catch (err) {
      alert(err.message || "Failed to save review cycle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEvaluation(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingEvaluation?.id) await updateEvaluation(editingEvaluation.id, evaluationForm);
      else await createEvaluation(evaluationForm);
      setShowEvaluationModal(false);
      await loadPerformance();
    } catch (err) {
      alert(err.message || "Failed to save evaluation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGoal(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingGoal?.id) await updateGoal(editingGoal.id, goalForm);
      else await createGoal(goalForm);
      setShowGoalModal(false);
      await loadPerformance();
    } catch (err) {
      alert(err.message || "Failed to save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCycle(cycle) {
    if (!window.confirm(`Delete review cycle ${cycle.cycleCode}?`)) return;
    try {
      setSaving(true);
      await deleteReviewCycle(cycle.id);
      await loadPerformance();
    } catch (err) {
      alert(err.message || "Failed to delete review cycle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvaluation(evaluation) {
    if (!window.confirm(`Delete evaluation for ${evaluation.employee}?`)) return;
    try {
      setSaving(true);
      await deleteEvaluation(evaluation.id);
      await loadPerformance();
    } catch (err) {
      alert(err.message || "Failed to delete evaluation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGoal(goal) {
    if (!window.confirm(`Delete goal for ${goal.employee}?`)) return;
    try {
      setSaving(true);
      await deleteGoal(goal.id);
      await loadPerformance();
    } catch (err) {
      alert(err.message || "Failed to delete goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PerformanceHeader
        onRefresh={loadPerformance}
        onCreateCycle={openCreateCycle}
        onCreateEvaluation={openCreateEvaluation}
        onCreateGoal={openCreateGoal}
      />

      {loading && <PerformanceLoadingState />}

      {!loading && error && (
        <PerformanceErrorState message={error} onRetry={loadPerformance} />
      )}

      {!loading && !error && (
        <>
          <PerformanceAIInsights insights={insights} />

          <PerformanceKPICards
            reviewCycles={reviewCycles}
            evaluations={evaluations}
            goals={goals}
          />

          <ReviewCyclesTable
            reviewCycles={reviewCycles}
            saving={saving}
            onEdit={openEditCycle}
            onDelete={handleDeleteCycle}
          />

          <EvaluationsTable
            evaluations={evaluations}
            saving={saving}
            onEdit={openEditEvaluation}
            onDelete={handleDeleteEvaluation}
          />

          <GoalsTable
            goals={goals}
            saving={saving}
            onEdit={openEditGoal}
            onDelete={handleDeleteGoal}
          />
        </>
      )}

      {showCycleModal && (
        <ReviewCycleFormModal
          mode={editingCycle ? "edit" : "create"}
          form={cycleForm}
          onChange={setCycleForm}
          onSubmit={handleSaveCycle}
          onClose={() => setShowCycleModal(false)}
          saving={saving}
        />
      )}

      {showEvaluationModal && (
        <EvaluationFormModal
          mode={editingEvaluation ? "edit" : "create"}
          form={evaluationForm}
          onChange={setEvaluationForm}
          onSubmit={handleSaveEvaluation}
          onClose={() => setShowEvaluationModal(false)}
          saving={saving}
          employees={employees}
          reviewCycles={reviewCycles}
        />
      )}

      {showGoalModal && (
        <GoalFormModal
          mode={editingGoal ? "edit" : "create"}
          form={goalForm}
          onChange={setGoalForm}
          onSubmit={handleSaveGoal}
          onClose={() => setShowGoalModal(false)}
          saving={saving}
          employees={employees}
        />
      )}
    </div>
  );
}
