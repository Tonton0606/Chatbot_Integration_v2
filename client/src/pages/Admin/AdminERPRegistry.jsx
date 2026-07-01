import { useEffect, useMemo, useState } from "react";

import {
  createERPDivision,
  createERPFeature,
  deleteERPDivision,
  deleteERPFeature,
  getERPRegistryData,
  updateERPDivision,
  updateERPFeature,
} from "../../services/operations/erp_registry";

import {
  DivisionFormModal,
  DivisionRegistryTable,
  ERPRegistryErrorState,
  ERPRegistryHeader,
  ERPRegistryKPICards,
  ERPRegistryLoadingState,
  ERPRegistryToolbar,
  FeatureFormModal,
  FeatureRegistryTable,
} from "../../components/admin/layout/Admin_ERPRegistry_Components.jsx";

const DEFAULT_DIVISION_FORM = {
  division_key: "",
  title: "",
  icon: "",
  description: "",
  order_index: 0,
  admin_visible: true,
  client_visible: true,
  status: "active",
  status_note: "",
};

const DEFAULT_FEATURE_FORM = {
  division_id: "",
  feature_key: "",
  label: "",
  icon: "",
  description: "",
  admin_route: "",
  client_route: "",
  admin_visible: true,
  client_visible: true,
  status: "planned",
  status_note: "",
  auto_enable_with_division: false,
  order_index: 0,
};

export default function AdminERPRegistry() {
  const [divisions, setDivisions] = useState([]);
  const [features, setFeatures] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");

  const [view, setView] = useState("features");

  const [divisionModalOpen, setDivisionModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);

  const [divisionMode, setDivisionMode] = useState("create");
  const [featureMode, setFeatureMode] = useState("create");

  const [editingDivisionId, setEditingDivisionId] = useState(null);
  const [editingFeatureId, setEditingFeatureId] = useState(null);

  const [divisionForm, setDivisionForm] = useState(
    DEFAULT_DIVISION_FORM
  );

  const [featureForm, setFeatureForm] = useState(
    DEFAULT_FEATURE_FORM
  );

  useEffect(() => {
    loadRegistry();
  }, []);

  async function loadRegistry() {
    try {
      setLoading(true);
      setError("");

      const data = await getERPRegistryData();

      setDivisions(data.divisions || []);
      setFeatures(data.features || []);
    } catch (err) {
      console.error("ERP registry load error:", err);

      setError(
        err.message || "Failed to load ERP registry."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateDivisionForm(field, value) {
    setDivisionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateFeatureForm(field, value) {
    setFeatureForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openCreateDivisionModal() {
    setDivisionMode("create");
    setEditingDivisionId(null);

    setDivisionForm(DEFAULT_DIVISION_FORM);

    setDivisionModalOpen(true);
  }

  function openEditDivisionModal(division) {
    setDivisionMode("edit");
    setEditingDivisionId(division.id);

    setDivisionForm({
      division_key: division.division_key || "",
      title: division.title || "",
      icon: division.icon || "",
      description: division.description || "",
      order_index: division.order_index || 0,
      admin_visible: !!division.admin_visible,
      client_visible: !!division.client_visible,
      status: division.status || "active",
      status_note: division.status_note || "",
    });

    setDivisionModalOpen(true);
  }

  function openCreateFeatureModal() {
    setFeatureMode("create");
    setEditingFeatureId(null);

    setFeatureForm(DEFAULT_FEATURE_FORM);

    setFeatureModalOpen(true);
  }

  function openEditFeatureModal(feature) {
    setFeatureMode("edit");
    setEditingFeatureId(feature.id);

    setFeatureForm({
      division_id: feature.division_id || "",
      feature_key: feature.feature_key || "",
      label: feature.label || "",
      icon: feature.icon || "",
      description: feature.description || "",
      admin_route: feature.admin_route || "",
      client_route: feature.client_route || "",
      admin_visible: !!feature.admin_visible,
      client_visible: !!feature.client_visible,
      status: feature.status || "planned",
      status_note: feature.status_note || "",
      auto_enable_with_division:
        !!feature.auto_enable_with_division,
      order_index: feature.order_index || 0,
    });

    setFeatureModalOpen(true);
  }

  async function handleDivisionSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (divisionMode === "edit") {
        await updateERPDivision(
          editingDivisionId,
          divisionForm
        );
      } else {
        await createERPDivision(divisionForm);
      }

      setDivisionModalOpen(false);

      await loadRegistry();
    } catch (err) {
      console.error("Division save error:", err);

      alert(err.message || "Failed to save division.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFeatureSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (featureMode === "edit") {
        await updateERPFeature(
          editingFeatureId,
          featureForm
        );
      } else {
        await createERPFeature(featureForm);
      }

      setFeatureModalOpen(false);

      await loadRegistry();
    } catch (err) {
      console.error("Feature save error:", err);

      alert(err.message || "Failed to save feature.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDivision(division) {
    const confirmed = window.confirm(
      `Delete division "${division.title}"?\n\nThis will also delete all connected ERP features.`
    );

    if (!confirmed) return;

    try {
      await deleteERPDivision(division.id);

      await loadRegistry();
    } catch (err) {
      console.error("Delete division error:", err);

      alert(err.message || "Failed to delete division.");
    }
  }

  async function handleDeleteFeature(feature) {
    const confirmed = window.confirm(
      `Delete feature "${feature.label}"?`
    );

    if (!confirmed) return;

    try {
      await deleteERPFeature(feature.id);

      await loadRegistry();
    } catch (err) {
      console.error("Delete feature error:", err);

      alert(err.message || "Failed to delete feature.");
    }
  }

  const filteredDivisions = useMemo(() => {
    return divisions.filter((division) => {
      const matchesSearch =
        !search ||
        division.title
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        division.division_key
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        division.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [divisions, search, statusFilter]);

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      const matchesSearch =
        !search ||
        feature.label
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        feature.feature_key
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        feature.admin_route
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        feature.client_route
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        feature.status === statusFilter;

      const matchesDivision =
        divisionFilter === "all" ||
        feature.division_id === divisionFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDivision
      );
    });
  }, [
    features,
    search,
    statusFilter,
    divisionFilter,
  ]);

  if (loading) {
    return <ERPRegistryLoadingState />;
  }

  if (error) {
    return (
      <ERPRegistryErrorState
        message={error}
        onRetry={loadRegistry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ERPRegistryHeader
        onRefresh={loadRegistry}
        onCreateDivision={openCreateDivisionModal}
        onCreateFeature={openCreateFeatureModal}
      />

      <ERPRegistryKPICards
        divisions={divisions}
        features={features}
      />

      <ERPRegistryToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        divisionFilter={divisionFilter}
        onDivisionFilterChange={setDivisionFilter}
        divisions={divisions}
        view={view}
        onViewChange={setView}
      />

      {view === "divisions" ? (
        <DivisionRegistryTable
          divisions={filteredDivisions}
          onEdit={openEditDivisionModal}
          onDelete={handleDeleteDivision}
        />
      ) : (
        <FeatureRegistryTable
          features={filteredFeatures}
          onEdit={openEditFeatureModal}
          onDelete={handleDeleteFeature}
        />
      )}

      <DivisionFormModal
        open={divisionModalOpen}
        mode={divisionMode}
        form={divisionForm}
        saving={saving}
        onChange={updateDivisionForm}
        onSubmit={handleDivisionSubmit}
        onClose={() => setDivisionModalOpen(false)}
      />

      <FeatureFormModal
        open={featureModalOpen}
        mode={featureMode}
        form={featureForm}
        divisions={divisions}
        saving={saving}
        onChange={updateFeatureForm}
        onSubmit={handleFeatureSubmit}
        onClose={() => setFeatureModalOpen(false)}
      />
    </div>
  );
}
