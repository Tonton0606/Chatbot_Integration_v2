import { Image, Link2, Type } from "lucide-react";
import TextStyleControls from "../TextStyleControls";
import {
  Field,
  ImageUrlUploadField,
  inputClass,
  SaveButton,
  SectionHeader,
  textareaClass,
} from "../shared";

import HeroBadgeSection from "./general/HeroBadgeSection";
import HeroBenefitsSection from "./general/HeroBenefitsSection";
import HeroButtonsSection from "./general/HeroButtonsSection";
import HeroHeadlineSection from "./general/HeroHeadlineSection";
import HeroLayoutSection from "./general/HeroLayoutSection";
import HeroLogoSection from "./general/HeroLogoSection";
import HeroMetricsSection from "./general/HeroMetricsSection";
import {
  DEFAULT_BENEFIT,
  DEFAULT_METRIC,
  SHAPE_RADIUS,
  asArray,
  asObject,
  editorClass,
} from "./general/generalTabUtils";

export default function LandingGeneralTab({
  form,
  saving,
  onChange,
  onSave,
  onUploadAsset,
  activePreviewId,
  onEditorFocus,
}) {
  const payload = asObject(form.payload);
  const heroBenefits = asArray(payload.hero_benefits);
  const heroMetrics = asArray(payload.hero_metrics);

  function selectEditor(previewId) {
    onEditorFocus?.(previewId);
  }

  function submit(event) {
    event.preventDefault();
    onSave();
  }

  function updatePayload(key, value) {
    onChange("payload", {
      ...payload,
      [key]: value,
    });
  }

  function updateTextStyle(target, styles) {
    const currentStyles = asObject(payload.styles);
    const currentTextStyles = asObject(currentStyles.text);

    onChange("payload", {
      ...payload,
      styles: {
        ...currentStyles,
        text: {
          ...currentTextStyles,
          [target]: styles,
        },
      },
    });
  }

  function resetTextStyle(target) {
    const currentStyles = asObject(payload.styles);
    const currentTextStyles = asObject(currentStyles.text);
    const nextTextStyles = { ...currentTextStyles };

    delete nextTextStyles[target];

    onChange("payload", {
      ...payload,
      styles: {
        ...currentStyles,
        text: nextTextStyles,
      },
    });
  }

  function updateScopedStyle(scope, key, property, value) {
    const currentStyles = asObject(payload.styles);
    const currentScope = asObject(currentStyles[scope]);
    const currentTarget = asObject(currentScope[key]);

    onChange("payload", {
      ...payload,
      styles: {
        ...currentStyles,
        [scope]: {
          ...currentScope,
          [key]: {
            ...currentTarget,
            [property]: value,
          },
        },
      },
    });
  }

  function updateShape(scope, key, shape) {
    updateScopedStyle(scope, key, "shape", shape);
    updateScopedStyle(
      scope,
      key,
      "borderRadius",
      SHAPE_RADIUS[shape] || SHAPE_RADIUS.rounded_rectangle
    );
  }

  function updateBenefit(index, key, value) {
    const nextBenefits = [...heroBenefits];

    nextBenefits[index] = {
      ...(nextBenefits[index] || DEFAULT_BENEFIT),
      [key]: value,
    };

    updatePayload("hero_benefits", nextBenefits);
  }

  function addBenefit() {
    updatePayload("hero_benefits", [...heroBenefits, DEFAULT_BENEFIT]);
  }

  function removeBenefit(index) {
    updatePayload(
      "hero_benefits",
      heroBenefits.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updateMetric(index, key, value) {
    const nextMetrics = [...heroMetrics];

    nextMetrics[index] = {
      ...(nextMetrics[index] || DEFAULT_METRIC),
      [key]: value,
    };

    updatePayload("hero_metrics", nextMetrics);
  }

  function addMetric() {
    updatePayload("hero_metrics", [...heroMetrics, DEFAULT_METRIC]);
  }

  function removeMetric(index) {
    updatePayload(
      "hero_metrics",
      heroMetrics.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-7">
      <section
        data-editor-id="editor-hero"
        className={editorClass(
          activePreviewId,
          "hero",
          "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
        )}
      >
        <SectionHeader
          icon={Type}
          title="Main Content"
          description="Set the public landing page name, headline, subheadline, and hero text."
        />

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Page Name">
              <input
                data-editor-id="editor-hero-brand-title"
                value={form.title || ""}
                onFocus={() => selectEditor("hero-brand-title")}
                onChange={(event) => onChange("title", event.target.value)}
                className={editorClass(
                  activePreviewId,
                  "hero-brand-title",
                  inputClass
                )}
                placeholder="Example: Mich Val Workspace"
              />
            </Field>

            <Field label="Public Slug">
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--text-muted)]" />

                <input
                  value={form.slug || ""}
                  onChange={(event) => onChange("slug", event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="mich-val-workspace"
                />
              </div>
            </Field>
          </div>

          <div
            data-editor-id="editor-hero-brand-title-style"
            onFocusCapture={() => selectEditor("hero-brand-title")}
            onClick={() => selectEditor("hero-brand-title")}
          >
            <TextStyleControls
              label="Page Name Style"
              styles={payload.styles?.text?.hero_brand_title || {}}
              onChange={(styles) => updateTextStyle("hero_brand_title", styles)}
              onReset={() => resetTextStyle("hero_brand_title")}
            />
          </div>

          <HeroBadgeSection
            form={form}
            payload={payload}
            activePreviewId={activePreviewId}
            onEditorFocus={onEditorFocus}
            onChange={onChange}
            updateTextStyle={updateTextStyle}
            resetTextStyle={resetTextStyle}
            updateScopedStyle={updateScopedStyle}
            updateShape={updateShape}
          />

          <HeroHeadlineSection
            form={form}
            payload={payload}
            activePreviewId={activePreviewId}
            onEditorFocus={onEditorFocus}
            onChange={onChange}
            updatePayload={updatePayload}
            updateTextStyle={updateTextStyle}
            resetTextStyle={resetTextStyle}
            updateScopedStyle={updateScopedStyle}
          />

          <div
            data-editor-id="editor-hero-subheadline"
            className={editorClass(activePreviewId, "hero-subheadline")}
          >
            <Field label="Subheadline">
              <textarea
                value={form.subheadline || ""}
                onFocus={() => selectEditor("hero-subheadline")}
                onChange={(event) => onChange("subheadline", event.target.value)}
                className={editorClass(
                  activePreviewId,
                  "hero-subheadline",
                  textareaClass
                )}
                placeholder="Explain your offer in a clear and simple way."
              />
            </Field>
          </div>

          <div onFocusCapture={() => selectEditor("hero-subheadline")}>
            <TextStyleControls
              label="Subheadline Style"
              styles={payload.styles?.text?.hero_subheadline || {}}
              onChange={(styles) => updateTextStyle("hero_subheadline", styles)}
              onReset={() => resetTextStyle("hero_subheadline")}
            />
          </div>
        </div>
      </section>

      <HeroButtonsSection
        payload={payload}
        activePreviewId={activePreviewId}
        onEditorFocus={onEditorFocus}
        updatePayload={updatePayload}
        updateTextStyle={updateTextStyle}
        resetTextStyle={resetTextStyle}
      />

      <HeroLayoutSection
        payload={payload}
        activePreviewId={activePreviewId}
        onEditorFocus={onEditorFocus}
        updatePayload={updatePayload}
      />

      <HeroLogoSection
        form={form}
        payload={payload}
        activePreviewId={activePreviewId}
        onEditorFocus={onEditorFocus}
        updateScopedStyle={updateScopedStyle}
        updateShape={updateShape}
      />

      <section
        data-editor-id="editor-hero-benefits"
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
      >
        <SectionHeader
          icon={Type}
          title="Hero Benefit Cards"
          description="These are short selling points shown under the hero text."
        />

        <HeroBenefitsSection
          payload={payload}
          heroBenefits={heroBenefits}
          activePreviewId={activePreviewId}
          onEditorFocus={onEditorFocus}
          updateBenefit={updateBenefit}
          addBenefit={addBenefit}
          removeBenefit={removeBenefit}
          updateTextStyle={updateTextStyle}
          resetTextStyle={resetTextStyle}
          updateScopedStyle={updateScopedStyle}
          updateShape={updateShape}
        />
      </section>

      <section
        data-editor-id="editor-hero-metrics"
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
      >
        <SectionHeader
          icon={Type}
          title="Hero Trust Metrics"
          description="Add proof points such as years of service, protected clients, or consultation type."
        />

        <HeroMetricsSection
          payload={payload}
          heroMetrics={heroMetrics}
          activePreviewId={activePreviewId}
          onEditorFocus={onEditorFocus}
          updateMetric={updateMetric}
          addMetric={addMetric}
          removeMetric={removeMetric}
          updateTextStyle={updateTextStyle}
          resetTextStyle={resetTextStyle}
          updateScopedStyle={updateScopedStyle}
          updateShape={updateShape}
        />
      </section>

      <section
        data-editor-id="editor-hero-media"
        className={editorClass(
          activePreviewId,
          "hero-media",
          "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
        )}
        onFocusCapture={() => selectEditor("hero-media")}
      >
        <SectionHeader
          icon={Image}
          title="Brand Images"
          description="Upload your logo and hero image or video. These are shown at the top of the public page."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <ImageUrlUploadField
            label="Logo"
            value={form.logo_url}
            assetType="logo"
            onChange={(value) => onChange("logo_url", value)}
            onUploadAsset={onUploadAsset}
          />

          <ImageUrlUploadField
            label="Hero Image or Video"
            value={form.hero_image_url}
            assetType="hero"
            onChange={(value) => onChange("hero_image_url", value)}
            onUploadAsset={onUploadAsset}
            showAutoPlayToggle={true}
            autoPlayValue={Boolean(payload.hero_video_autoplay)}
            onAutoPlayChange={(value) => updatePayload("hero_video_autoplay", value)}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}
