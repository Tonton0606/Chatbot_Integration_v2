import React, { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Pencil,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import {
  createMarketingCollateralLink,
  deleteMarketingCollateralLink,
  fetchMarketingCollateralLinks,
  subscribeToMarketingCollateralLinks,
  updateMarketingCollateralLink,
} from "../../services/marketing/collateral";
import { Button, Input } from "../admin/ui";

const ASSET_TYPES = [
  {
    value: "design",
    label: "Design / Image",
    groupLabel: "Designs & Images",
    description: "Canva files, brand boards, social graphics, mockups",
    icon: ImageIcon,
    colorClass: "text-purple-400",
    accentClass: "bg-purple-500/12 border-purple-500/20",
  },
  {
    value: "document",
    label: "Document / Slides",
    groupLabel: "Documents & Slides",
    description: "Decks, PDFs, briefs, scripts, proposal files",
    icon: FileText,
    colorClass: "text-blue-400",
    accentClass: "bg-blue-500/12 border-blue-500/20",
  },
  {
    value: "video",
    label: "Video",
    groupLabel: "Videos",
    description: "Video drafts, reels, product clips, campaign previews",
    icon: Video,
    colorClass: "text-red-400",
    accentClass: "bg-red-500/12 border-red-500/20",
  },
];

const FILTERS = [{ value: "all", label: "All" }, ...ASSET_TYPES];

const EMPTY_FORM = {
  title: "",
  url: "",
  type: "design",
  description: "",
};

function getTypeConfig(type) {
  return ASSET_TYPES.find((item) => item.value === type) || ASSET_TYPES[0];
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AssetTypePicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        Asset Type
      </label>
      <div className="grid gap-2">
        {ASSET_TYPES.map((type) => {
          const Icon = type.icon;
          const selected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                selected
                  ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)]"
                  : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--brand-cyan-border)]"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${type.accentClass}`}
              >
                <Icon className={`h-4 w-4 ${type.colorClass}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                  {type.label}
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {type.description}
                </span>
              </span>
              <span
                className={`h-3 w-3 rounded-full border ${
                  selected
                    ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]"
                    : "border-[var(--border-color)]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollateralCard({ item, onEdit, onDelete }) {
  const type = getTypeConfig(item.type);
  const Icon = type.icon;

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)] hover:shadow-[var(--shadow-md)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${type.accentClass}`}
        >
          <Icon className={`h-5 w-5 ${type.colorClass}`} />
        </div>
        <span className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-secondary)]">
          {formatDate(item.createdAt || item.date)}
        </span>
      </div>

      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-bold text-[var(--text-primary)]">
          {item.title}
        </h3>
        <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-gold)]">
          {type.label}
        </span>
      </div>

      {item.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
          {item.description}
        </p>
      )}

      <div className="mb-5 flex items-center gap-2 truncate text-sm text-[var(--text-muted)]">
        <LinkIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{item.url}</span>
      </div>

      <div className="mt-auto border-t border-[var(--border-color)] pt-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--hover-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--brand-cyan-soft)] hover:text-[var(--brand-cyan)]"
          >
            Open Link <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition hover:border-[var(--brand-gold-border)] hover:text-[var(--brand-gold)]"
            aria-label={`Edit ${item.title}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
            aria-label={`Delete ${item.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CollateralSection({ type, items, onEdit, onDelete }) {
  const Icon = type.icon;

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${type.accentClass}`}
        >
          <Icon className={`h-5 w-5 ${type.colorClass}`} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {type.groupLabel}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {items.length} saved {items.length === 1 ? "asset" : "assets"}
          </p>
        </div>
        <div className="h-px flex-1 bg-[var(--border-color)]" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <CollateralCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

export default function MarketingCollateralManager({ surface = "admin" }) {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLinks() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchMarketingCollateralLinks();
      setLinks(data);
    } catch (err) {
      setError(err.message || "Unable to load marketing collateral.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLinks();

    const channel = subscribeToMarketingCollateralLinks(() => {
      loadLinks();
    });

    return () => {
      if (channel?.unsubscribe) {
        channel.unsubscribe();
      }
    };
  }, []);

  const counts = useMemo(() => {
    return links.reduce(
      (acc, item) => {
        acc.all += 1;
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      { all: 0, design: 0, document: 0, video: 0 }
    );
  }, [links]);

  const visibleGroups = useMemo(() => {
    return ASSET_TYPES.map((type) => ({
      type,
      items: links.filter((item) => item.type === type.value),
    })).filter((group) => activeFilter === "all" || group.type.value === activeFilter);
  }, [activeFilter, links]);

  function openCreateModal() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setForm({
      title: item.title,
      url: item.url,
      type: item.type,
      description: item.description || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      if (editingItem) {
        await updateMarketingCollateralLink(editingItem.id, form);
      } else {
        await createMarketingCollateralLink(form, user?.id);
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingItem(null);
      await loadLinks();
    } catch (err) {
      setError(err.message || "Unable to save collateral link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) return;

    setError("");

    try {
      await deleteMarketingCollateralLink(item.id);
      await loadLinks();
    } catch (err) {
      setError(err.message || "Unable to delete collateral link.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Marketing Collateral
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage, categorize, and store external embedded campaign assets and links.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Add Link
        </Button>
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.value;
            const Icon = filter.icon;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
                    : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-border)] hover:text-[var(--brand-cyan)]"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {filter.label}
                <span className="rounded-full bg-[var(--hover-bg)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                  {counts[filter.value] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
          Loading marketing collateral...
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
            <LinkIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            No marketing collateral yet
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Add design links, documents, slide decks, or videos to start building the library.
          </p>
          <Button className="mt-5" icon={Plus} onClick={openCreateModal}>
            Add First Link
          </Button>
        </div>
      ) : visibleGroups.every((group) => group.items.length === 0) ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
          No assets found for this category.
        </div>
      ) : (
        <div className="space-y-9">
          {visibleGroups.map((group) => (
            <CollateralSection
              key={group.type.value}
              type={group.type}
              items={group.items}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
              <div>
                <h2 className="text-sm font-bold">
                  {editingItem ? "Edit Collateral Link" : "Add New Collateral Link"}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Save external assets by category for fast team access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <Input
                label="Asset Title"
                placeholder="e.g. Summer Campaign Canva Link"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <Input
                label="Embedded URL"
                placeholder="https://..."
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
              />
              <Input
                label="Short Description"
                placeholder="Optional context for this asset"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <AssetTypePicker
                value={form.type}
                onChange={(type) => setForm((current) => ({ ...current, type }))}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" loading={saving} onClick={handleSave}>
                  {editingItem ? "Save Changes" : "Save Link"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
