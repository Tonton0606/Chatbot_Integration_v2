import { Plus, PanelBottom, Trash2 } from "lucide-react";
import {
  cardClass,
  Field,
  ImageUrlUploadField,
  inputClass,
  SaveButton,
  SectionHeader,
  textareaClass,
} from "../shared";

const SOCIAL_PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "twitter", label: "Twitter / X" },
  { id: "linkedin", label: "LinkedIn" },
];

export default function LandingFooterTab({
  footer,
  saving,
  onChange,
  onSave,
  onUploadAsset,
}) {
  const currentFooter = footer || {};
  const socialLinks = Array.isArray(currentFooter.social_links)
    ? currentFooter.social_links
    : [];

  function updateField(key, value) {
    const nextFooter = { ...currentFooter, [key]: value };
    onChange(nextFooter);
  }

  function addSocialLink() {
    const nextLinks = [...socialLinks, { platform: "facebook", url: "" }];
    updateField("social_links", nextLinks);
  }

  function updateSocialLink(index, field, value) {
    const nextLinks = [...socialLinks];
    nextLinks[index] = { ...nextLinks[index], [field]: value };
    updateField("social_links", nextLinks);
  }

  function removeSocialLink(index) {
    const nextLinks = socialLinks.filter((_, i) => i !== index);
    updateField("social_links", nextLinks);
  }

  function submit(event) {
    event.preventDefault();
    onSave();
  }

  return (
    <section className={`${cardClass} p-5`}>
      <SectionHeader
        icon={PanelBottom}
        title="Footer Configuration"
        description="Design an aesthetic, modern footer for your landing page with your logo, links, and text."
      />

      <form onSubmit={submit} className="grid gap-6">
        <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={currentFooter.is_enabled !== false}
            onChange={(e) => updateField("is_enabled", e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-[var(--brand-gold)] focus:ring-[var(--brand-gold)]"
          />
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Enable Footer on Landing Page
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Background Color">
            <input
              type="color"
              value={currentFooter.background_color || "#0B301A"}
              onChange={(e) => updateField("background_color", e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1"
            />
          </Field>

          <Field label="Text Color">
            <input
              type="color"
              value={currentFooter.text_color || "#FFFFFF"}
              onChange={(e) => updateField("text_color", e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1"
            />
          </Field>

          <Field label="Font Size">
            <input
              type="text"
              value={currentFooter.font_size || "14px"}
              onChange={(e) => updateField("font_size", e.target.value)}
              placeholder="e.g. 14px or 0.875rem"
              className={inputClass}
            />
          </Field>
        </div>

        <ImageUrlUploadField
          label="Footer Logo (Optional)"
          value={currentFooter.logo_url}
          assetType="logo"
          onChange={(value) => updateField("logo_url", value)}
          onUploadAsset={onUploadAsset}
        />

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-bold text-[var(--text-primary)]">Social Media Links</h4>
            <button
              type="button"
              onClick={addSocialLink}
              className="flex items-center gap-1 text-sm font-bold text-[var(--brand-gold)] transition hover:text-[var(--brand-gold-hover)]"
            >
              <Plus className="h-4 w-4" /> Add Link
            </button>
          </div>

          <div className="grid gap-3">
            {socialLinks.map((link, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={link.platform}
                  onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                  className={`w-full sm:w-48 ${inputClass}`}
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                
                <input
                  type="url"
                  placeholder="https://..."
                  value={link.url || ""}
                  onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                  className={`flex-1 ${inputClass}`}
                />

                <button
                  type="button"
                  onClick={() => removeSocialLink(index)}
                  className="flex shrink-0 items-center justify-center rounded-xl p-2 text-[var(--text-secondary)] transition hover:bg-red-500/10 hover:text-red-500"
                  title="Remove link"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            
            {socialLinks.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No social links added yet.</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Paragraph 1 (e.g. Privacy Notice)">
            <textarea
              value={currentFooter.paragraph_1 || ""}
              onChange={(e) => updateField("paragraph_1", e.target.value)}
              className={textareaClass}
              rows={5}
              placeholder="Privacy Notice: We collect..."
            />
          </Field>

          <Field label="Paragraph 2 (e.g. Data Handling Info)">
            <textarea
              value={currentFooter.paragraph_2 || ""}
              onChange={(e) => updateField("paragraph_2", e.target.value)}
              className={textareaClass}
              rows={5}
              placeholder="The personal data obtained from this transaction..."
            />
          </Field>
        </div>

        <Field label="Copyright Text">
          <input
            type="text"
            value={currentFooter.copyright_text || ""}
            onChange={(e) => updateField("copyright_text", e.target.value)}
            className={inputClass}
            placeholder="© Copyright 2026 Your Company"
          />
        </Field>

        <div className="flex justify-end pt-2">
          <SaveButton saving={saving} />
        </div>
      </form>
    </section>
  );
}
