import { useEffect, useState } from "react";

import {
  DepartmentSentimentTable,
  EmployeeEngagementErrorState,
  EmployeeEngagementHeader,
  EmployeeEngagementLoadingState,
  EngagementAIInsights,
  EngagementKPICards,
  FeedbackFormModal,
  FeedbackTable,
  PulseSurveyFormModal,
  PulseSurveysTable,
  RecognitionFeed,
  RecognitionFormModal,
  RetentionRiskFormModal,
  RetentionRiskTable,
} from "../../components/admin/layout/Admin_EmployeeEngagement_Components.jsx";

import {
  createFeedbackItem,
  createPulseSurvey,
  createRecognitionItem,
  createRetentionRisk,
  deleteFeedbackItem,
  deletePulseSurvey,
  deleteRecognitionItem,
  deleteRetentionRisk,
  getEmployeeEngagementData,
  updateFeedbackItem,
  updatePulseSurvey,
  updateRecognitionItem,
  updateRetentionRisk,
} from "../../services/human_resources/employee_engagement";

const EMPTY_SURVEY_FORM = {
  surveyCode: "",
  title: "",
  sentDate: "",
  deadline: "",
  totalRecipients: 0,
  responsesCount: 0,
  averageScore: 0,
  status: "active",
  description: "",
};

const EMPTY_FEEDBACK_FORM = {
  employeeId: "",
  type: "anonymous",
  topic: "",
  content: "",
  sentiment: "neutral",
  date: new Date().toISOString().slice(0, 10),
};

const EMPTY_RISK_FORM = {
  employeeId: "",
  riskLevel: "low",
  signals: "",
  aiNote: "",
  status: "open",
};

const EMPTY_RECOGNITION_FORM = {
  fromEmployeeId: "",
  toEmployeeId: "",
  category: "teamwork",
  message: "",
  likes: 0,
  date: new Date().toISOString().slice(0, 10),
};

export default function AdminEmployeeEngagement() {
  const [overview, setOverview] = useState({});
  const [departmentSentiment, setDepartmentSentiment] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [recognitionFeed, setRecognitionFeed] = useState([]);
  const [retentionRisks, setRetentionRisks] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [insights, setInsights] = useState([]);

  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);

  const [editingSurvey, setEditingSurvey] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [editingRecognition, setEditingRecognition] = useState(null);

  const [surveyForm, setSurveyForm] = useState(EMPTY_SURVEY_FORM);
  const [feedbackForm, setFeedbackForm] = useState(EMPTY_FEEDBACK_FORM);
  const [riskForm, setRiskForm] = useState(EMPTY_RISK_FORM);
  const [recognitionForm, setRecognitionForm] = useState(EMPTY_RECOGNITION_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEmployeeEngagement();
  }, []);

  async function loadEmployeeEngagement() {
    try {
      setLoading(true);
      setError("");

      const data = await getEmployeeEngagementData();

      setOverview(data.overview || {});
      setDepartmentSentiment(data.departmentSentiment || []);
      setSurveys(data.surveys || []);
      setRecognitionFeed(data.recognitionFeed || []);
      setRetentionRisks(data.retentionRisks || []);
      setFeedbackItems(data.feedbackItems || []);
      setEmployees(data.employees || []);
      setInsights(data.insights || []);
    } catch (err) {
      console.error("Employee engagement load error:", err);
      setError(err.message || "Failed to load employee engagement.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateSurvey() {
    setEditingSurvey(null);
    setSurveyForm(EMPTY_SURVEY_FORM);
    setShowSurveyModal(true);
  }

  function openEditSurvey(survey) {
    setEditingSurvey(survey);
    setSurveyForm({
      surveyCode: survey.surveyCode || "",
      title: survey.title || "",
      sentDate: survey.sentDate || "",
      deadline: survey.deadline || "",
      totalRecipients: survey.totalRecipients || 0,
      responsesCount: survey.responsesCount || 0,
      averageScore: survey.averageScore || 0,
      status: survey.status || "active",
      description: survey.description || "",
    });
    setShowSurveyModal(true);
  }

  function openCreateFeedback() {
    setEditingFeedback(null);
    setFeedbackForm(EMPTY_FEEDBACK_FORM);
    setShowFeedbackModal(true);
  }

  function openEditFeedback(item) {
    setEditingFeedback(item);
    setFeedbackForm({
      employeeId: item.employeeId || "",
      type: item.type || "anonymous",
      topic: item.topic || "",
      content: item.content || "",
      sentiment: item.sentiment || "neutral",
      date: item.date || "",
    });
    setShowFeedbackModal(true);
  }

  function openCreateRisk() {
    setEditingRisk(null);
    setRiskForm(EMPTY_RISK_FORM);
    setShowRiskModal(true);
  }

  function openEditRisk(item) {
    setEditingRisk(item);
    setRiskForm({
      employeeId: item.employeeId || "",
      riskLevel: item.riskLevel || "low",
      signals: Array.isArray(item.signals) ? item.signals.join(", ") : "",
      aiNote: item.aiNote || "",
      status: item.status || "open",
    });
    setShowRiskModal(true);
  }

  function openCreateRecognition() {
    setEditingRecognition(null);
    setRecognitionForm(EMPTY_RECOGNITION_FORM);
    setShowRecognitionModal(true);
  }

  function openEditRecognition(item) {
    setEditingRecognition(item);
    setRecognitionForm({
      fromEmployeeId: item.fromEmployeeId || "",
      toEmployeeId: item.toEmployeeId || "",
      category: item.category || "teamwork",
      message: item.message || "",
      likes: item.likes || 0,
      date: item.date || "",
    });
    setShowRecognitionModal(true);
  }

  async function handleSaveSurvey(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingSurvey?.id) await updatePulseSurvey(editingSurvey.id, surveyForm);
      else await createPulseSurvey(surveyForm);
      setShowSurveyModal(false);
      await loadEmployeeEngagement();
    } catch (err) {
      alert(err.message || "Failed to save survey.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFeedback(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingFeedback?.id) await updateFeedbackItem(editingFeedback.id, feedbackForm);
      else await createFeedbackItem(feedbackForm);
      setShowFeedbackModal(false);
      await loadEmployeeEngagement();
    } catch (err) {
      alert(err.message || "Failed to save feedback.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRisk(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingRisk?.id) await updateRetentionRisk(editingRisk.id, riskForm);
      else await createRetentionRisk(riskForm);
      setShowRiskModal(false);
      await loadEmployeeEngagement();
    } catch (err) {
      alert(err.message || "Failed to save retention risk.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRecognition(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingRecognition?.id) {
        await updateRecognitionItem(editingRecognition.id, recognitionForm);
      } else {
        await createRecognitionItem(recognitionForm);
      }
      setShowRecognitionModal(false);
      await loadEmployeeEngagement();
    } catch (err) {
      alert(err.message || "Failed to save recognition.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSurvey(item) {
    if (!window.confirm(`Delete survey ${item.surveyCode}?`)) return;
    await deletePulseSurvey(item.id);
    await loadEmployeeEngagement();
  }

  async function handleDeleteFeedback(item) {
    if (!window.confirm(`Delete feedback about ${item.topic}?`)) return;
    await deleteFeedbackItem(item.id);
    await loadEmployeeEngagement();
  }

  async function handleDeleteRisk(item) {
    if (!window.confirm(`Delete retention risk for ${item.employee}?`)) return;
    await deleteRetentionRisk(item.id);
    await loadEmployeeEngagement();
  }

  async function handleDeleteRecognition(item) {
    if (!window.confirm(`Delete recognition for ${item.to}?`)) return;
    await deleteRecognitionItem(item.id);
    await loadEmployeeEngagement();
  }

  return (
    <div className="space-y-6">
      <EmployeeEngagementHeader
        onRefresh={loadEmployeeEngagement}
        onCreateSurvey={openCreateSurvey}
        onCreateFeedback={openCreateFeedback}
        onCreateRisk={openCreateRisk}
        onCreateRecognition={openCreateRecognition}
      />

      {loading && <EmployeeEngagementLoadingState />}

      {!loading && error && (
        <EmployeeEngagementErrorState
          message={error}
          onRetry={loadEmployeeEngagement}
        />
      )}

      {!loading && !error && (
        <>
          <EngagementAIInsights insights={insights} />
          <EngagementKPICards overview={overview} />

          <div className="grid gap-6 xl:grid-cols-2">
            <DepartmentSentimentTable departments={departmentSentiment} />
            <RetentionRiskTable
              risks={retentionRisks}
              saving={saving}
              onEdit={openEditRisk}
              onDelete={handleDeleteRisk}
            />
          </div>

          <PulseSurveysTable
            surveys={surveys}
            saving={saving}
            onEdit={openEditSurvey}
            onDelete={handleDeleteSurvey}
          />

          <RecognitionFeed
            items={recognitionFeed}
            saving={saving}
            onEdit={openEditRecognition}
            onDelete={handleDeleteRecognition}
          />

          <FeedbackTable
            feedback={feedbackItems}
            saving={saving}
            onEdit={openEditFeedback}
            onDelete={handleDeleteFeedback}
          />
        </>
      )}

      {showSurveyModal && (
        <PulseSurveyFormModal
          mode={editingSurvey ? "edit" : "create"}
          form={surveyForm}
          onChange={setSurveyForm}
          onSubmit={handleSaveSurvey}
          onClose={() => setShowSurveyModal(false)}
          saving={saving}
        />
      )}

      {showFeedbackModal && (
        <FeedbackFormModal
          mode={editingFeedback ? "edit" : "create"}
          form={feedbackForm}
          onChange={setFeedbackForm}
          onSubmit={handleSaveFeedback}
          onClose={() => setShowFeedbackModal(false)}
          saving={saving}
          employees={employees}
        />
      )}

      {showRiskModal && (
        <RetentionRiskFormModal
          mode={editingRisk ? "edit" : "create"}
          form={riskForm}
          onChange={setRiskForm}
          onSubmit={handleSaveRisk}
          onClose={() => setShowRiskModal(false)}
          saving={saving}
          employees={employees}
        />
      )}

      {showRecognitionModal && (
        <RecognitionFormModal
          mode={editingRecognition ? "edit" : "create"}
          form={recognitionForm}
          onChange={setRecognitionForm}
          onSubmit={handleSaveRecognition}
          onClose={() => setShowRecognitionModal(false)}
          saving={saving}
          employees={employees}
        />
      )}
    </div>
  );
}
