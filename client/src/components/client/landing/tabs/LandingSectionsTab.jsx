import { Plus } from "lucide-react";

import { Field, inputClass } from "../shared";
import SectionEditorCard from "./sections/SectionEditorCard";

export default function LandingSectionsTab({
  sections,
  sectionTypes,
  saving,
  selectedType,
  onSelectType,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onMoveSection,
  onUploadAsset,
}) {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <div className="mb-4">
          <h3 className="font-black text-[var(--text-primary)]">
            Add Landing Section
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Add, reorder, hide, and customize page sections.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Section Type">
            <select
              value={selectedType}
              onChange={(event) => onSelectType(event.target.value)}
              className={inputClass}
            >
              {(sectionTypes || []).map((type) => (
                <option key={type.section_key} value={type.section_key}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            onClick={() => onAddSection(selectedType)}
            disabled={saving || !selectedType}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </button>
        </div>
      </section>

      {(sections || []).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-10 text-center">
          <h3 className="font-bold text-[var(--text-primary)]">
            No sections yet
          </h3>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Add sections like About, Services, FAQ, Gallery, or Contact.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {(sections || []).map((section, index) => (
            <SectionEditorCard
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              saving={saving}
              onSave={(payload) => onUpdateSection(section.id, payload)}
              onDelete={() => onDeleteSection(section.id)}
              onMoveUp={() => onMoveSection(index, index - 1)}
              onMoveDown={() => onMoveSection(index, index + 1)}
              onUploadAsset={onUploadAsset}
            />
          ))}
        </div>
      )}
    </div>
  );
}
