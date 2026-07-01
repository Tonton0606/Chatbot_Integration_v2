import { Plus } from "lucide-react";

import {
  Field,
  ImageUrlUploadField,
  inputClass,
  textareaClass,
} from "../../shared";

export default function AddServiceCardForm({
  draft,
  saving,
  selectedGroup,
  onSubmit,
  onChange,
  onUploadAsset,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border-color)] pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {selectedGroup?.title || "Services"}
          </p>

          <h3 className="font-black text-[var(--text-primary)]">
            Add Service Card
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            New cards will be added only to the selected services section.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !selectedGroup}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Field label="Service Title">
          <input
            value={draft.title}
            onChange={(event) =>
              onChange({
                ...draft,
                title: event.target.value,
              })
            }
            className={inputClass}
            placeholder="Example: Life Insurance"
          />
        </Field>

        <Field label="Button Text">
          <input
            value={draft.cta_label}
            onChange={(event) =>
              onChange({
                ...draft,
                cta_label: event.target.value,
              })
            }
            className={inputClass}
            placeholder="Book Consultation"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(event) =>
              onChange({
                ...draft,
                description: event.target.value,
              })
            }
            className={textareaClass}
            placeholder="Describe this offer in a simple client-friendly way."
          />
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">
          Service Image
        </p>

        <ImageUrlUploadField
          label=""
          value={draft.image_url}
          assetType="service"
          hideUrlInput
          onChange={(value) =>
            onChange({
              ...draft,
              image_url: value,
            })
          }
          onUploadAsset={onUploadAsset}
          showAutoPlayToggle={true}
          autoPlayValue={Boolean(draft.payload?.video_autoplay)}
          onAutoPlayChange={(value) =>
            onChange({
              ...draft,
              payload: {
                ...draft.payload,
                video_autoplay: value,
              },
            })
          }
        />
      </div>
    </form>
  );
}
