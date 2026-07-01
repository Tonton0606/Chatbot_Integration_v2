import { useMemo, useState } from "react";
import { Layers3 } from "lucide-react";

const STYLE_GROUPS = [
  { key: "card", label: "Card" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "cta", label: "Button" },
  { key: "media", label: "Media Style" },
];

const CONFIG_GROUPS = [{ key: "media", label: "Media Layout" }];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getAvailableStyleGroups(styles = {}) {
  return STYLE_GROUPS.filter((group) => styles?.[group.key]);
}

function getAvailableConfigGroups(config = {}) {
  return CONFIG_GROUPS.filter((group) => config?.[group.key]);
}

export default function ServiceStylePropagationControls({
  styles = {},
  config = {},
  saving,
  onApplyToSection,
}) {
  const normalizedStyles = asObject(styles);
  const normalizedConfig = asObject(config);

  const availableStyleGroups = useMemo(
    () => getAvailableStyleGroups(normalizedStyles),
    [normalizedStyles]
  );

  const availableConfigGroups = useMemo(
    () => getAvailableConfigGroups(normalizedConfig),
    [normalizedConfig]
  );

  const [selectedStyleGroups, setSelectedStyleGroups] = useState(() =>
    STYLE_GROUPS.map((group) => group.key)
  );

  const [selectedConfigGroups, setSelectedConfigGroups] = useState(() =>
    CONFIG_GROUPS.map((group) => group.key)
  );

  const hasStyles = availableStyleGroups.length > 0;
  const hasConfig = availableConfigGroups.length > 0;
  const hasAnythingToApply = hasStyles || hasConfig;

  function toggleStyleGroup(groupKey) {
    setSelectedStyleGroups((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey]
    );
  }

  function toggleConfigGroup(groupKey) {
    setSelectedConfigGroups((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey]
    );
  }

  function getSelectedStylePayload() {
    return selectedStyleGroups.reduce((output, groupKey) => {
      if (normalizedStyles?.[groupKey]) {
        output[groupKey] = normalizedStyles[groupKey];
      }

      return output;
    }, {});
  }

  function getSelectedConfigPayload() {
    return selectedConfigGroups.reduce((output, groupKey) => {
      if (normalizedConfig?.[groupKey]) {
        output[groupKey] = normalizedConfig[groupKey];
      }

      return output;
    }, {});
  }

  function handleApplyToSection() {
    const selectedStyles = getSelectedStylePayload();
    const selectedConfig = getSelectedConfigPayload();

    if (
      !Object.keys(selectedStyles).length &&
      !Object.keys(selectedConfig).length
    ) {
      return;
    }

    onApplyToSection?.({
      styles: selectedStyles,
      ...selectedConfig,
    });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
          <Layers3 className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <h5 className="font-black text-[var(--text-primary)]">
            Apply this card style
          </h5>

          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Copy selected appearance and media layout settings from this card to
            all cards in this section.
          </p>
        </div>
      </div>

      {!hasAnythingToApply && (
        <p className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-secondary)]">
          No custom styles or media layout yet. Edit the card, button, media, or
          typography first.
        </p>
      )}

      {hasAnythingToApply && (
        <>
          {hasStyles && (
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Appearance
              </p>

              {STYLE_GROUPS.map((group) => {
                const disabled = !normalizedStyles?.[group.key];
                const checked = selectedStyleGroups.includes(group.key);

                return (
                  <label
                    key={group.key}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                      disabled
                        ? "border-[var(--border-color)] opacity-40"
                        : "border-[var(--border-color)] bg-[var(--bg-card)]"
                    }`}
                  >
                    <span className="text-[var(--text-primary)]">
                      {group.label}
                    </span>

                    <input
                      type="checkbox"
                      disabled={disabled || saving}
                      checked={!disabled && checked}
                      onChange={() => toggleStyleGroup(group.key)}
                    />
                  </label>
                );
              })}
            </div>
          )}

          {hasConfig && (
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Layout Config
              </p>

              {CONFIG_GROUPS.map((group) => {
                const disabled = !normalizedConfig?.[group.key];
                const checked = selectedConfigGroups.includes(group.key);

                return (
                  <label
                    key={group.key}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                      disabled
                        ? "border-[var(--border-color)] opacity-40"
                        : "border-[var(--border-color)] bg-[var(--bg-card)]"
                    }`}
                  >
                    <span className="text-[var(--text-primary)]">
                      {group.label}
                    </span>

                    <input
                      type="checkbox"
                      disabled={disabled || saving}
                      checked={!disabled && checked}
                      onChange={() => toggleConfigGroup(group.key)}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleApplyToSection}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black text-[var(--text-primary)] hover:border-[var(--brand-gold)] disabled:opacity-60"
          >
            <Layers3 className="mr-2 h-4 w-4" />
            Apply to This Section
          </button>
        </>
      )}
    </div>
  );
}
