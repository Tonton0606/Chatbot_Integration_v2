import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from "../ui";

import {
  Plus,
  Upload,
  UserPlus,
  Link,
  Download,
  Folder,
  FolderOpen,
  Users,
  Tag,
  Edit2,
  Trash2,
  X,
} from "lucide-react";

const formFieldClass =
  "w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)] bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-primary)]";

export function LeadStats({ leadBatches, leads }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--brand-cyan)]">
              {leadBatches.length}
            </div>
            <div className="text-sm text-[var(--text-muted)]">Total Batches</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--success)]">
              {leads.length}
            </div>
            <div className="text-sm text-[var(--text-muted)]">Total Leads</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--brand-gold)]">
              {leads.filter((l) => l.status === "new").length}
            </div>
            <div className="text-sm text-[var(--text-muted)]">New Leads</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--brand-cyan)]">
              {leads.filter((l) => l.status === "qualified").length}
            </div>
            <div className="text-sm text-[var(--text-muted)]">Qualified</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function LeadTools({
  fileInputRef,
  handleFileImport,
  onManualAdd,
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lead Generation Tools</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-[var(--text-primary)]">
                Import Leads
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Upload CSV files to import leads in bulk (requires batch selection)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 text-[var(--text-primary)]">
                Manual Entry
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Add leads manually (batch selection required)
              </p>

              <Button variant="outline" onClick={onManualAdd} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 text-[var(--text-primary)]">
                Automated Lead Capture
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Google maps lead capture
              </p>

              <Button variant="outline" className="w-full" disabled>
                <Link className="w-4 h-4 mr-2" />
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function LeadBatchList({
  leadBatches,
  leadsByBatch,
  selectedBatchView,
  setSelectedBatchView,
  handleExport,
  setSelectedBatchForAdding,
  setShowManualModal,
  setShowBatchModal,
  handleEditBatch,
  handleDeleteBatch,
  getStatusColor,
  LEAD_STATUSES,
  handleEdit,
  handleDelete,
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lead Batches ({leadBatches.length})</CardTitle>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                All leads are organized into batches. Click on a batch to view its leads.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  selectedBatchView ? handleExport(selectedBatchView) : handleExport()
                }
              >
                <Download className="w-4 h-4 mr-2" />
                {selectedBatchView ? "Export Batch" : "Export All"}
              </Button>

              <Button icon={Plus} onClick={() => setShowBatchModal(true)}>
                Create Batch
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {leadBatches.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
              <p className="mb-4 text-[var(--text-muted)]">
                No lead batches created yet
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Create a batch first, then add leads to it
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {leadBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="border rounded-lg p-4 border-[var(--border-color)] bg-[var(--hover-bg)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setSelectedBatchView(selectedBatchView === batch.id ? null : batch.id)
                        }
                        className="flex items-center text-left hover:bg-transparent"
                      >
                        {selectedBatchView === batch.id ? (
                          <FolderOpen className="w-5 h-5 mr-2 text-[var(--brand-cyan)]" />
                        ) : (
                          <Folder className="w-5 h-5 mr-2 text-[var(--brand-cyan)]" />
                        )}

                        <div>
                          <h4 className="font-medium text-[var(--text-primary)]">
                            {batch.name}
                          </h4>
                          <div className="flex items-center text-sm text-[var(--text-muted)]">
                            <Users className="w-3 h-3 mr-1" />
                            {(leadsByBatch[batch.id] || []).length} leads
                          </div>
                        </div>
                      </Button>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(batch.id)}
                        title={`Export ${batch.name} batch leads`}
                      >
                        <Download className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBatchForAdding(batch);
                          setShowManualModal(true);
                        }}
                        title="Add new lead to this batch"
                      >
                        <UserPlus className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBatch(batch)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="text-[var(--danger)]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {batch.description && (
                    <p className="text-sm mb-2 text-[var(--text-secondary)]">
                      {batch.description}
                    </p>
                  )}

                  {batch.tags && batch.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {batch.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]"
                        >
                          <Tag className="w-2 h-2 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedBatchView === batch.id && (
                    <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-[var(--text-primary)]">
                          Leads in this batch ({(leadsByBatch[batch.id] || []).length})
                        </h5>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBatchForAdding(batch);
                            setShowManualModal(true);
                          }}
                        >
                          <UserPlus className="w-3 h-3 mr-2" />
                          Add Lead
                        </Button>
                      </div>

                      {(leadsByBatch[batch.id] || []).length === 0 ? (
                        <div className="text-center py-6 text-[var(--text-muted)]">
                          <p className="mb-2">No leads in this batch yet</p>
                          <p className="text-sm">
                            Click "Add Lead" to add leads to this batch
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[var(--border-color)]">
                                <th className="text-left py-2 px-3 font-medium">Name</th>
                                <th className="text-left py-2 px-3 font-medium">Email</th>
                                <th className="text-left py-2 px-3 font-medium">Company</th>
                                <th className="text-left py-2 px-3 font-medium">Status</th>
                                <th className="text-left py-2 px-3 font-medium">Actions</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(leadsByBatch[batch.id] || []).map((lead) => (
                                <tr
                                  key={lead.id}
                                  className="border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                                >
                                  <td className="py-2 px-3">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {lead.first_name || ""} {lead.last_name || ""}
                                      </div>
                                      {lead.job_title && (
                                        <div className="text-xs text-[var(--text-muted)]">
                                          {lead.job_title}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-2 px-3">
                                    <div className="text-sm">{lead.email}</div>
                                    {lead.phone && (
                                      <div className="text-xs text-[var(--text-muted)]">
                                        {lead.phone}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-2 px-3 text-sm">
                                    {lead.company || "-"}
                                  </td>

                                  <td className="py-2 px-3">
                                    <Badge className={`${getStatusColor(lead.status)} text-xs`}>
                                      {LEAD_STATUSES.find((s) => s.value === lead.status)?.label ||
                                        lead.status}
                                    </Badge>
                                  </td>

                                  <td className="py-2 px-3">
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(lead)}
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(lead.id)}
                                        className="text-[var(--danger)]"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function ManualLeadModal(props) {
  const {
    showManualModal,
    editingLead,
    selectedBatchForAdding,
    setShowManualModal,
    resetForm,
    setSelectedBatchForAdding,
    handleManualSubmit,
    formData,
    setFormData,
    LEAD_SOURCES,
    LEAD_STATUSES,
    leadBatches,
  } = props;

  return (
    <>
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {editingLead
                    ? "Edit Lead"
                    : selectedBatchForAdding
                      ? `Add Lead to "${selectedBatchForAdding.name}"`
                      : "Add New Lead"}
                </h3>

                <button
                  onClick={() => {
                    setShowManualModal(false);
                    resetForm();
                    setSelectedBatchForAdding(null);
                  }}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className={formFieldClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className={formFieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className={formFieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={formFieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className={formFieldClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      className={formFieldClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                      Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className={formFieldClass}
                    >
                      {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={formFieldClass}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className={formFieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Assign to Batch *
                  </label>
                  <select
                    value={formData.batch_id}
                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                    required
                    className={formFieldClass}
                  >
                    <option value="">Select a batch (required)</option>
                    {leadBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs mt-1 text-[var(--text-muted)]">
                    Every lead must be assigned to a batch
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. VIP, Enterprise, Tech"
                    className={formFieldClass}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowManualModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>

                  <Button type="submit">
                    {editingLead ? "Update" : "Add"} Lead
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function ImportPreviewModal(props) {
  const {
    showImportModal,
    setShowImportModal,
    setImportData,
    setImportPreview,
    setSelectedImportBatch,
    importPreview,
    selectedImportBatch,
    leadBatches,
    handleImportSubmit,
  } = props;

  return (
    <>
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Import Leads Preview
                </h3>

                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData("");
                    setImportPreview([]);
                    setSelectedImportBatch("");
                  }}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Found {importPreview.length} leads in your file. Here's a preview of the first 5:
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Assign to Batch *
                  </label>
                  <select
                    value={selectedImportBatch}
                    onChange={(e) => setSelectedImportBatch(e.target.value)}
                    required
                    className={formFieldClass}
                  >
                    <option value="">Select a batch (required)</option>
                    {leadBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs mt-1 text-[var(--text-muted)]">
                    All imported leads must be assigned to a batch
                  </p>
                </div>

                {importPreview.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-color)]">
                          <th className="text-left py-2 px-2">Email</th>
                          <th className="text-left py-2 px-2">Name</th>
                          <th className="text-left py-2 px-2">Company</th>
                          <th className="text-left py-2 px-2">Phone</th>
                        </tr>
                      </thead>

                      <tbody>
                        {importPreview.map((lead, index) => (
                          <tr
                            key={index}
                            className="border-b border-[var(--border-color)]"
                          >
                            <td className="py-2 px-2">{lead.email || "-"}</td>
                            <td className="py-2 px-2">
                              {`${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "-"}
                            </td>
                            <td className="py-2 px-2">{lead.company || "-"}</td>
                            <td className="py-2 px-2">{lead.phone || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportData("");
                      setImportPreview([]);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button onClick={handleImportSubmit}>
                    Import {importPreview.length} Leads
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function BatchModal(props) {
  const {
    showBatchModal,
    editingBatch,
    setShowBatchModal,
    resetBatchForm,
    handleBatchSubmit,
    batchFormData,
    setBatchFormData,
    selectedLeads,
  } = props;

  return (
    <>
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {editingBatch ? "Edit Batch" : "Create New Batch"}
                </h3>

                <button
                  onClick={() => {
                    setShowBatchModal(false);
                    resetBatchForm();
                  }}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Batch Name *
                  </label>
                  <input
                    type="text"
                    value={batchFormData.name}
                    onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
                    required
                    placeholder="e.g. VIP Customers, Q1 Prospects"
                    className={formFieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Description
                  </label>
                  <textarea
                    value={batchFormData.description}
                    onChange={(e) =>
                      setBatchFormData({ ...batchFormData, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Optional description of this batch"
                    className={formFieldClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={batchFormData.tags}
                    onChange={(e) => setBatchFormData({ ...batchFormData, tags: e.target.value })}
                    placeholder="e.g. high-value, enterprise, tech"
                    className={formFieldClass}
                  />
                </div>

                {!editingBatch && selectedLeads.length > 0 && (
                  <div className="p-3 rounded-lg bg-[var(--brand-cyan-soft)] border border-[var(--brand-cyan-border)]">
                    <p className="text-sm text-[var(--brand-cyan)]">
                      {selectedLeads.length} leads will be added to this batch
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBatchModal(false);
                      resetBatchForm();
                    }}
                  >
                    Cancel
                  </Button>

                  <Button type="submit">
                    {editingBatch ? "Update" : "Create"} Batch
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function LeadDeleteModal(props) {
  const {
    deleteModal,
    setDeleteModal,
    confirmDeleteLead,
    confirmDeleteBatch,
  } = props;

  return (
    <>
      {deleteModal.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--danger-soft)]">
                  <Trash2 className="w-6 h-6 text-[var(--danger)]" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Delete {deleteModal.type === "lead" ? "Lead" : "Batch"}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Are you sure you want to delete this{" "}
                    {deleteModal.type === "lead" ? "lead" : "batch"}?
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {deleteModal.type === "lead" ? deleteModal.name : `"${deleteModal.name}"`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteModal({ type: null, id: null, name: "" })}
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  onClick={deleteModal.type === "lead" ? confirmDeleteLead : confirmDeleteBatch}
                  className="bg-[var(--danger)] hover:opacity-90 text-white"
                >
                  Delete {deleteModal.type === "lead" ? "Lead" : "Batch"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
