import { useState } from "react";

import FacebookFAQModal from "./FacebookFAQModal";

function formatKeywords(keywords = []) {
  if (!Array.isArray(keywords) || keywords.length === 0) return "—";
  return keywords.join(", ");
}

export default function FacebookFAQTable({
  faqs = [],
  loading = false,
  saving = false,
  onCreate,
  onEdit,
  onArchive,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  function openCreateModal() {
    setEditingFaq(null);
    setModalOpen(true);
  }

  function openEditModal(faq) {
    setEditingFaq(faq);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setEditingFaq(null);
    setModalOpen(false);
  }

  async function handleSubmit(payload) {
    if (editingFaq) {
      await onEdit?.(editingFaq, payload);
    } else {
      await onCreate?.(payload);
    }

    closeModal();
  }

  return (
    <div className="facebook-connect-panel">
      <div className="facebook-connect-panel-header">
        <div>
          <h2 className="facebook-connect-panel-title">FAQ Manager</h2>
          <p className="facebook-connect-panel-description">
            Client-approved answers that the Facebook AI can use safely.
          </p>
        </div>

        <button
          type="button"
          className="facebook-connect-button facebook-connect-button-primary"
          onClick={openCreateModal}
          disabled={saving}
        >
          {saving ? "Saving..." : "Create FAQ"}
        </button>
      </div>

      {loading && <div className="facebook-connect-empty">Loading FAQs...</div>}

      {!loading && faqs.length === 0 && (
        <div className="facebook-connect-empty">
          No FAQs yet. Create the first approved answer for this Facebook page.
        </div>
      )}

      {!loading && faqs.length > 0 && (
        <div className="facebook-connect-table-wrap">
          <table className="facebook-connect-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Category</th>
                <th>Keywords</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {faqs.map((faq) => (
                <tr key={faq.id}>
                  <td>
                    <strong>{faq.question || "Untitled question"}</strong>
                  </td>

                  <td>{faq.answer || "—"}</td>
                  <td>{faq.category || "—"}</td>
                  <td>{formatKeywords(faq.keywords)}</td>
                  <td>{faq.usageCount || 0}</td>

                  <td>
                    <span className="facebook-connect-badge">
                      {faq.status || "active"}
                    </span>
                  </td>

                  <td>
                    <div className="facebook-connect-inline-actions">
                      <button
                        type="button"
                        className="facebook-connect-action-link"
                        onClick={() => openEditModal(faq)}
                        disabled={saving}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="facebook-connect-action-link facebook-connect-action-danger"
                        onClick={() => onArchive?.(faq)}
                        disabled={saving}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FacebookFAQModal
        open={modalOpen}
        faq={editingFaq}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
