import { Plus, Trash2 } from "lucide-react";

import {
  Field,
  ImageUrlUploadField,
  inputClass,
  textareaClass,
} from "../../shared";
import SectionItemDesignControls from "./SectionItemDesignControls";

const MEDIA_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "background", label: "Background" },
];

const MEDIA_FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>

      <select
        className={`${inputClass} h-9 text-xs`}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SectionItemsEditor({
  sectionType,
  items,
  onAddItem,
  onAddTextbox,
  onUpdateItem,
  onDeleteItem,
  onUploadAsset,
}) {
  const itemLabel =
    sectionType === "faq"
      ? "FAQ Item"
      : sectionType === "contact"
        ? "Contact Item"
        : sectionType === "about"
          ? "About Card"
          : "Content Card";

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-black text-[var(--text-primary)]">
            Section Items
          </h4>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Add editable content cards, textboxes, images, buttons, and style
            each block independently.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-gold)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {itemLabel}
          </button>

          <button
            type="button"
            onClick={onAddTextbox}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-gold)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Textbox
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 grid gap-3">
          {items.map((item, index) => (
            <SectionItemEditor
              key={item.id || index}
              sectionType={sectionType}
              item={item}
              index={index}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onUploadAsset={onUploadAsset}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionItemEditor({
  sectionType,
  item,
  index,
  onUpdateItem,
  onDeleteItem,
  onUploadAsset,
}) {
  function updateStyleValue(target, property, value) {
    const currentStyles = asObject(item.styles);
    const currentTarget = asObject(currentStyles[target]);

    onUpdateItem(index, "styles", {
      ...currentStyles,
      [target]: {
        ...currentTarget,
        [property]: value,
      },
    });
  }

  function updateTextStyle(target, styles) {
    onUpdateItem(index, "styles", {
      ...asObject(item.styles),
      [target]: styles,
    });
  }

  function resetTextStyle(target) {
    const nextStyles = { ...asObject(item.styles) };
    delete nextStyles[target];

    onUpdateItem(index, "styles", nextStyles);
  }

  if (item.type === "textbox") {
    return (
      <SectionItemShell
        label={`Textbox #${index + 1}`}
        onDelete={() => onDeleteItem(index)}
      >
        <Field label="Textbox Content">
          <textarea
            value={item.content || ""}
            onChange={(event) =>
              onUpdateItem(index, "content", event.target.value)
            }
            className={textareaClass}
            placeholder="Write paragraph content here."
          />
        </Field>

        <SectionItemDesignControls
          item={item}
          onUpdateStyleValue={updateStyleValue}
          onUpdateTextStyle={updateTextStyle}
          onResetTextStyle={resetTextStyle}
        />
      </SectionItemShell>
    );
  }

  if (sectionType === "faq") {
    return (
      <SectionItemShell
        label={`FAQ #${index + 1}`}
        onDelete={() => onDeleteItem(index)}
      >
        <div className="grid gap-3">
          <Field label="Question">
            <input
              value={item.question || ""}
              onChange={(event) =>
                onUpdateItem(index, "question", event.target.value)
              }
              className={inputClass}
              placeholder="Example: What are the requirements?"
            />
          </Field>

          <Field label="Answer">
            <textarea
              value={item.answer || ""}
              onChange={(event) =>
                onUpdateItem(index, "answer", event.target.value)
              }
              className={textareaClass}
              placeholder="Write the answer here."
            />
          </Field>

          <ButtonControls
            item={item}
            index={index}
            onUpdateItem={onUpdateItem}
          />

          <SectionItemDesignControls
            item={item}
            onUpdateStyleValue={updateStyleValue}
            onUpdateTextStyle={updateTextStyle}
            onResetTextStyle={resetTextStyle}
          />
        </div>
      </SectionItemShell>
    );
  }

  if (sectionType === "contact") {
    return (
      <SectionItemShell
        label={`Contact #${index + 1}`}
        onDelete={() => onDeleteItem(index)}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Label">
            <input
              value={item.label || ""}
              onChange={(event) =>
                onUpdateItem(index, "label", event.target.value)
              }
              className={inputClass}
              placeholder="Email, Phone, Messenger"
            />
          </Field>

          <Field label="Value">
            <input
              value={item.value || ""}
              onChange={(event) =>
                onUpdateItem(index, "value", event.target.value)
              }
              className={inputClass}
              placeholder="hello@example.com"
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Description">
            <textarea
              value={item.description || ""}
              onChange={(event) =>
                onUpdateItem(index, "description", event.target.value)
              }
              className={textareaClass}
              placeholder="Optional contact details."
            />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Optional Link Label">
            <input
              value={item.link_label || ""}
              onChange={(event) =>
                onUpdateItem(index, "link_label", event.target.value)
              }
              className={inputClass}
              placeholder="Example: Open Messenger"
            />
          </Field>

          <Field label="Optional Link URL">
            <input
              value={item.link_url || ""}
              onChange={(event) =>
                onUpdateItem(index, "link_url", event.target.value)
              }
              className={inputClass}
              placeholder="https://example.com"
            />
          </Field>
        </div>

        <MediaControls
          item={item}
          index={index}
          onUpdateItem={onUpdateItem}
          onUploadAsset={onUploadAsset}
        />

        <SectionItemDesignControls
          item={item}
          onUpdateStyleValue={updateStyleValue}
          onUpdateTextStyle={updateTextStyle}
          onResetTextStyle={resetTextStyle}
        />
      </SectionItemShell>
    );
  }

  return (
    <SectionItemShell
      label={`${sectionType === "about" ? "About Card" : "Item"} #${index + 1}`}
      onDelete={() => onDeleteItem(index)}
    >
      <div className="grid gap-3">
        <Field label="Title">
          <input
            value={item.title || ""}
            onChange={(event) =>
              onUpdateItem(index, "title", event.target.value)
            }
            className={inputClass}
            placeholder="Example: Una sa Pilipinas"
          />
        </Field>

        <Field label="Body">
          <textarea
            value={item.body || ""}
            onChange={(event) => onUpdateItem(index, "body", event.target.value)}
            className={textareaClass}
            placeholder="Add supporting details for this row."
          />
        </Field>

        <MediaControls
          item={item}
          index={index}
          onUpdateItem={onUpdateItem}
          onUploadAsset={onUploadAsset}
        />

        <ButtonControls item={item} index={index} onUpdateItem={onUpdateItem} />

        <SectionItemDesignControls
          item={item}
          onUpdateStyleValue={updateStyleValue}
          onUpdateTextStyle={updateTextStyle}
          onResetTextStyle={resetTextStyle}
        />
      </div>
    </SectionItemShell>
  );
}

function MediaControls({ item, index, onUpdateItem, onUploadAsset }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        Media
      </p>

      <ImageUrlUploadField
        label="Image / Media"
        value={item.image_url || item.media_url || ""}
        assetType="section"
        onChange={(value) => {
          onUpdateItem(index, "image_url", value);
          onUpdateItem(index, "media_url", value);
        }}
        onUploadAsset={onUploadAsset}
        showAutoPlayToggle={true}
        autoPlayValue={Boolean(item.video_autoplay)}
        onAutoPlayChange={(value) => onUpdateItem(index, "video_autoplay", value)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <SelectRow
          label="Position"
          value={item.media_position || item.image_position || "top"}
          options={MEDIA_POSITION_OPTIONS}
          onChange={(value) => onUpdateItem(index, "media_position", value)}
        />

        <SelectRow
          label="Fit"
          value={item.media_fit || item.object_fit || "cover"}
          options={MEDIA_FIT_OPTIONS}
          onChange={(value) => onUpdateItem(index, "media_fit", value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Width">
          <input
            value={item.media_width || ""}
            onChange={(event) =>
              onUpdateItem(index, "media_width", event.target.value)
            }
            className={inputClass}
            placeholder="42% or 280px"
          />
        </Field>

        <Field label="Max Width">
          <input
            value={item.media_max_width || ""}
            onChange={(event) =>
              onUpdateItem(index, "media_max_width", event.target.value)
            }
            className={inputClass}
            placeholder="640px"
          />
        </Field>

        <Field label="Height">
          <input
            value={item.media_height || ""}
            onChange={(event) =>
              onUpdateItem(index, "media_height", event.target.value)
            }
            className={inputClass}
            placeholder="220px"
          />
        </Field>
      </div>
    </div>
  );
}

function ButtonControls({ item, index, onUpdateItem }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        Button / Link
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Button Label">
          <input
            value={item.button_label || item.link_label || ""}
            onChange={(event) =>
              onUpdateItem(index, "button_label", event.target.value)
            }
            className={inputClass}
            placeholder="Example: Learn More"
          />
        </Field>

        <Field label="Button URL">
          <input
            value={item.button_url || item.link_url || ""}
            onChange={(event) =>
              onUpdateItem(index, "button_url", event.target.value)
            }
            className={inputClass}
            placeholder="https://example.com"
          />
        </Field>
      </div>
    </div>
  );
}

function SectionItemShell({ label, onDelete, children }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 text-xs font-bold text-[var(--danger)]"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </button>
      </div>

      {children}
    </div>
  );
}
