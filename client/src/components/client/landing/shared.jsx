import { Save, Upload, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

export const cardClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

export const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

export const textareaClass =
  "min-h-[110px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

function inferMediaType(value = "") {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "unknown";
  if (VIDEO_EXTENSIONS.test(cleanValue)) return "video";
  if (IMAGE_EXTENSIONS.test(cleanValue)) return "image";

  return "image";
}

function formatFileSize(bytes = 0) {
  const size = Number(bytes || 0);

  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-[var(--border-color)] pb-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--brand-gold)]">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      {!!label && (
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
      )}

      {children}
    </label>
  );
}

export function SaveButton({ saving }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="mr-2 h-4 w-4" />
      {saving ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function ImageUrlUploadField({
  label,
  value,
  assetType,
  onChange,
  onUploadAsset,
  hideUrlInput = false,
  showPreviewLink = false,
  showImagePreview = true,
  showAutoPlayToggle = false,
  autoPlayValue = false,
  onAutoPlayChange,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(null);

  const mediaType = useMemo(() => inferMediaType(value), [value]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(1);
      setUploadingFile(file);

      const detectedAssetType = file.type?.startsWith("video/")
        ? "video"
        : file.type?.startsWith("image/")
          ? "image"
          : assetType;

      const fileUrl = await onUploadAsset({
        file,
        assetType: detectedAssetType || assetType || "media",
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      onChange(fileUrl);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      event.target.value = "";
    }
  }

  return (
    <div className="grid gap-3">
      {!hideUrlInput && (
        <Field label={label}>
          <input
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            className={inputClass}
            placeholder="Paste media URL or upload from device"
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)] ${
            uploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
          }`}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? `Uploading ${uploadProgress}%` : "Upload Media"}

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {showPreviewLink && value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] px-4 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview
          </a>
        )}
      </div>

      {uploading && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[var(--text-secondary)]">
            <span className="truncate">
              {uploadingFile?.name || "Uploading media"}
            </span>

            <span className="shrink-0 text-[var(--brand-gold)]">
              {uploadProgress}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-main)]">
            <div
              className="h-full rounded-full bg-[var(--brand-gold)] transition-all duration-200"
              style={{
                width: `${Math.max(1, Math.min(100, uploadProgress))}%`,
              }}
            />
          </div>

          {!!uploadingFile?.size && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {formatFileSize(uploadingFile.size)}
            </p>
          )}
        </div>
      )}

      {showImagePreview && value && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)]">
          {mediaType === "video" ? (
            <div>
              <video
                src={value}
                controls
                autoPlay={autoPlayValue}
                muted={autoPlayValue}
                loop={autoPlayValue}
                className="h-52 w-full bg-black object-contain"
              >
                Your browser does not support the video tag.
              </video>
              
              {showAutoPlayToggle && onAutoPlayChange && (
                <div className="flex items-center gap-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
                  <input
                    type="checkbox"
                    id="autoplay-toggle"
                    checked={!!autoPlayValue}
                    onChange={(e) => onAutoPlayChange(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--brand-gold)] focus:ring-[var(--brand-gold-soft)]"
                  />
                  <label htmlFor="autoplay-toggle" className="text-sm font-bold text-[var(--text-primary)] cursor-pointer select-none">
                    Autoplay Video
                  </label>
                </div>
              )}
            </div>
          ) : (
            <img src={value} alt="" className="h-40 w-full object-cover" />
          )}
        </div>
      )}
    </div>
  );
}
