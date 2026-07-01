import {
  Bold,
  Italic,
  Minus,
  Plus,
  RotateCcw,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

const fontOptions = [
  "Inter",
  "Arial",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Lora",
  "Merriweather",
];

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 72;

export default function TextStyleControls({
  label = "Text Style",
  styles = {},
  onChange,
  onReset,
}) {
  const current = {
    fontSize: Number(styles.fontSize || 16),
    fontFamily: styles.fontFamily || "",
    color: styles.color || "",
    bold: Boolean(styles.bold),
    italic: Boolean(styles.italic),
    underline: Boolean(styles.underline),
    textAlign: styles.textAlign || styles.text_align || "",
    translateX: Number(styles.translateX ?? styles.translate_x ?? 0),
    translateY: Number(styles.translateY ?? styles.translate_y ?? 0),
  };

  function updateOffset(key, delta) {
    update(key, (current[key] || 0) + delta);
  }

  function resetOffset() {
    onChange({
      ...current,
      translateX: 0,
      translate_x: 0,
      translateY: 0,
      translate_y: 0,
    });
  }

  function update(key, value) {
    const updates = {
      ...current,
      [key]: value,
    };
    
    // Also ensure snake_case versions are set for database compatibility
    if (key === "translateX") {
      updates.translate_x = value;
    } else if (key === "translateY") {
      updates.translate_y = value;
    }
    
    onChange(updates);
  }

  function updateFontSize(nextSize) {
    const safeSize = Math.max(
      MIN_FONT_SIZE,
      Math.min(MAX_FONT_SIZE, Number(nextSize) || 16)
    );

    update("fontSize", safeSize);
  }

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-black text-[var(--text-primary)]">
            {label}
          </h4>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Adjust text like you would in Word or PowerPoint.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 w-fit items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)]"
        >
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Font
            </span>

            <select
              value={current.fontFamily}
              onChange={(event) => update("fontFamily", event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            >
              <option value="">Default</option>

              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Size
            </span>

            <div className="flex h-11 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <button
                type="button"
                onClick={() => updateFontSize(current.fontSize - 1)}
                className="grid w-11 place-items-center border-r border-[var(--border-color)] text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                aria-label="Decrease font size"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={current.fontSize}
                onChange={(event) => updateFontSize(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-center text-sm font-bold text-[var(--text-primary)] outline-none"
                aria-label="Font size"
              />

              <span className="flex items-center pr-2 text-xs font-bold text-[var(--text-muted)]">
                px
              </span>

              <button
                type="button"
                onClick={() => updateFontSize(current.fontSize + 1)}
                className="grid w-11 place-items-center border-l border-[var(--border-color)] text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                aria-label="Increase font size"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Text Color
            </span>

            <div className="flex h-11 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <input
                type="color"
                value={current.color || "#111827"}
                onChange={(event) => update("color", event.target.value)}
                className="h-full w-14 cursor-pointer border-0 bg-transparent p-1"
                aria-label="Text color picker"
              />

              <input
                value={current.color || ""}
                onChange={(event) => update("color", event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none"
                placeholder="Default"
                aria-label="Text color value"
              />
            </div>
          </label>

          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Style
            </span>

            <div className="flex h-11 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <button
                type="button"
                onClick={() => update("bold", !current.bold)}
                className={`grid w-12 place-items-center border-r border-[var(--border-color)] text-sm font-black transition ${
                  current.bold
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.bold}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => update("italic", !current.italic)}
                className={`grid w-12 place-items-center border-r border-[var(--border-color)] text-sm transition ${
                  current.italic
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.italic}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => update("underline", !current.underline)}
                className={`grid w-12 place-items-center text-sm transition ${
                  current.underline
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.underline}
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Alignment
            </span>

            <div className="flex h-11 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <button
                type="button"
                onClick={() => update("textAlign", "left")}
                className={`grid w-12 place-items-center border-r border-[var(--border-color)] text-sm transition ${
                  current.textAlign === "left" || !current.textAlign
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.textAlign === "left" || !current.textAlign}
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => update("textAlign", "center")}
                className={`grid w-12 place-items-center border-r border-[var(--border-color)] text-sm transition ${
                  current.textAlign === "center"
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.textAlign === "center"}
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => update("textAlign", "right")}
                className={`grid w-12 place-items-center border-r border-[var(--border-color)] text-sm transition ${
                  current.textAlign === "right"
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.textAlign === "right"}
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => update("textAlign", "justify")}
                className={`grid w-12 place-items-center text-sm transition ${
                  current.textAlign === "justify"
                    ? "bg-[var(--brand-gold)] text-black"
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-pressed={current.textAlign === "justify"}
                title="Justify"
              >
                <AlignJustify className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--border-color)] pt-4">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Position / Spacing Offset
          </span>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* 4-Way D-Pad Layout Controller */}
            <div className="grid grid-cols-3 gap-1 w-28 h-28 shrink-0 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-color)]">
              <div></div>
              <button
                type="button"
                onClick={() => updateOffset("translateY", -5)}
                className="grid place-items-center rounded-xl bg-[var(--bg-main)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] transition border border-[var(--border-color)]"
                title="Move Up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <div></div>

              <button
                type="button"
                onClick={() => updateOffset("translateX", -5)}
                className="grid place-items-center rounded-xl bg-[var(--bg-main)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] transition border border-[var(--border-color)]"
                title="Move Left"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="grid place-items-center text-[10px] font-black text-[var(--text-muted)] select-none uppercase tracking-wider">
                Move
              </div>
              <button
                type="button"
                onClick={() => updateOffset("translateX", 5)}
                className="grid place-items-center rounded-xl bg-[var(--bg-main)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] transition border border-[var(--border-color)]"
                title="Move Right"
              >
                <ArrowRight className="h-4 w-4" />
              </button>

              <div></div>
              <button
                type="button"
                onClick={() => updateOffset("translateY", 5)}
                className="grid place-items-center rounded-xl bg-[var(--bg-main)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] transition border border-[var(--border-color)]"
                title="Move Down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <div></div>
            </div>

            {/* Slide Controls and Values */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <div>
                  <span className="font-bold text-[var(--text-primary)]">X: </span>
                  {current.translateX || 0}px
                </div>
                <div>
                  <span className="font-bold text-[var(--text-primary)]">Y: </span>
                  {current.translateY || 0}px
                </div>
                {(current.translateX !== 0 || current.translateY !== 0) ? (
                  <button
                    type="button"
                    onClick={resetOffset}
                    className="text-[10px] font-bold text-[var(--brand-gold)] hover:underline"
                  >
                    Reset Position
                  </button>
                ) : null}
              </div>

              {/* Slider for X */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Horizontal (X)</span>
                  <span>{current.translateX || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  value={current.translateX || 0}
                  onChange={(e) => update("translateX", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-gold)]"
                />
              </div>

              {/* Slider for Y */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Vertical (Y)</span>
                  <span>{current.translateY || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  value={current.translateY || 0}
                  onChange={(e) => update("translateY", Number(e.target.value))}
                  className="w-full h-1 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-gold)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
