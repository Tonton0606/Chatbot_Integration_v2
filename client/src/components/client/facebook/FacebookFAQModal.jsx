import { useEffect, useMemo, useState } from "react";

const EMPTY_FORM = {
  question: "",
  answer: "",
  category: "General",
  keywords: "",
  status: "active",
  language: "auto",
};

function buildFormFromFaq(faq = {}) {
  return {
    question: faq.question || "",
    answer: faq.answer || "",
    category: faq.category || "General",
    keywords: Array.isArray(faq.keywords) ? faq.keywords.join(", ") : "",
    status: faq.status || "active",
    language: faq.language || "auto",
  };
}

export default function FacebookFAQModal({
  open = false,
  faq = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const isEditing = Boolean(faq?.id);

  const title = useMemo(
    () => (isEditing ? "Edit FAQ" : "Create FAQ"),
    [isEditing]
  );

  useEffect(() => {
    if (!open) return;

    setForm(isEditing ? buildFormFromFaq(faq) : EMPTY_FORM);
  }, [open, isEditing, faq]);

  if (!open) return null;

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit?.({
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim() || "General",
      keywords: form.keywords,
      status: form.status || "active",
      language: form.language || "auto",
    });
  }

  return (
    <div className="facebook-connect-modal-backdrop">
      <div className="facebook-connect-modal" role="dialog" aria-modal="true">
        <div className="facebook-connect-modal-header">
          <div>
            <h2 className="facebook-connect-modal-title">{title}</h2>
            <p className="facebook-connect-modal-description">
              Add a verified answer the Facebook AI can safely use when replying
              to customers.
            </p>
          </div>

          <button
            type="button"
            className="facebook-connect-button"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
        </div>

        <form className="facebook-connect-modal-body" onSubmit={handleSubmit}>
          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Question</span>
            <input
              className="facebook-connect-input"
              value={form.question}
              onChange={(event) => updateField("question", event.target.value)}
              placeholder="Example: What services does Exponify offer?"
              required
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Approved Answer</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.answer}
              onChange={(event) => updateField("answer", event.target.value)}
              placeholder="Write the exact approved answer the AI can use."
              required
            />
          </label>

          <div className="facebook-connect-form-grid facebook-connect-form-grid-flush">
            <label className="facebook-connect-field">
              <span className="facebook-connect-label">Category</span>
              <input
                className="facebook-connect-input"
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
                placeholder="General"
              />
            </label>

            <label className="facebook-connect-field">
              <span className="facebook-connect-label">Keywords</span>
              <input
                className="facebook-connect-input"
                value={form.keywords}
                onChange={(event) =>
                  updateField("keywords", event.target.value)
                }
                placeholder="services, crm, chatbot"
              />
            </label>

            <label className="facebook-connect-field">
              <span className="facebook-connect-label">Status</span>
              <select
                className="facebook-connect-select"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </label>

            <label className="facebook-connect-field">
              <span className="facebook-connect-label">Language</span>
              <select
                className="facebook-connect-select"
                value={form.language}
                onChange={(event) =>
                  updateField("language", event.target.value)
                }
              >
                <option value="auto">Auto</option>
                <option value="en">English</option>
                <option value="fil">Filipino</option>
              </select>
            </label>
          </div>

          <div className="facebook-connect-modal-footer">
            <button
              type="button"
              className="facebook-connect-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="facebook-connect-button facebook-connect-button-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create FAQ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
