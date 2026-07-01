import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, X, Sparkles, Camera, Search } from "lucide-react";
import logo from "../../../assets/EXPONIFY_LOGO.png";

import { cn, initials } from "../../../lib/adminUtils";
import { supabase } from "../../../config/supabaseClient";

import {
  buildNavigationRegistry,
  getERPRegistryData,
} from "../../../services/operations/erp_registry";

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function uploadAvatar(file) {
  if (!file) return;
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPG, PNG, GIF or WebP images are allowed.');
  if (file.size > MAX_BYTES) throw new Error('File must be under 5 MB.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated.');
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/storage/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ base64, filename: file.name, contentType: file.type }),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Upload failed.'); }
  window.dispatchEvent(new CustomEvent('profileUpdated'));
}

export default function AdminSidebar({ open, onClose, user }) {
  const location = useLocation();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
  const searchRef = useRef(null);

  const [query, setQuery] = useState("");

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try { await uploadAvatar(file); } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const [registryDivisions, setRegistryDivisions] = useState([]);
  const [registryFeatures, setRegistryFeatures] = useState([]);
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [registryError, setRegistryError] = useState("");
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadAdminNavigation() {
      try {
        setLoadingRegistry(true);
        setRegistryError("");

        const data = await getERPRegistryData();

        if (!mounted) return;

        setRegistryDivisions(data.divisions || []);
        setRegistryFeatures(data.features || []);
      } catch (err) {
        console.error("Admin sidebar registry load error:", err);

        if (mounted) {
          setRegistryError(err.message || "Failed to load admin navigation.");
        }
      } finally {
        if (mounted) {
          setLoadingRegistry(false);
        }
      }
    }

    loadAdminNavigation();

    return () => {
      mounted = false;
    };
  }, []);

  const navSections = useMemo(() => {
    return buildNavigationRegistry({
      divisions: registryDivisions,
      features: registryFeatures,
      enabledFeatureKeys: [],
      mode: "admin",
    });
  }, [registryDivisions, registryFeatures]);

  const activeDivisionKey = useMemo(() => {
    const match = navSections.find((section) =>
      section.items.some((item) => item.adminRoute === location.pathname)
    );
    return match?.key || navSections[0]?.key || "";
  }, [location.pathname, navSections]);

  useEffect(() => {
    if (!activeDivisionKey) return;
    setOpenSections((prev) => ({ ...prev, [activeDivisionKey]: true }));
  }, [activeDivisionKey]);

  /* ── Filtered sections for search ──────────────────────────────────────── */
  const filteredSections = useMemo(() => {
    if (!query.trim()) return navSections;
    const q = query.toLowerCase();
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.label.toLowerCase().includes(q)
        ),
        _titleMatch: section.title.toLowerCase().includes(q),
      }))
      .filter((s) => s._titleMatch || s.items.length > 0);
  }, [navSections, query]);

  /* Auto-expand all sections when user is searching */
  useEffect(() => {
    if (!query.trim()) return;
    setOpenSections((prev) => {
      const next = { ...prev };
      filteredSections.forEach((s) => { next[s.key] = true; });
      return next;
    });
  }, [query, filteredSections]);

  function toggleSection(sectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  const isSearching = query.trim().length > 0;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-dvh w-[min(280px,86vw)] flex-col overflow-hidden border-r shadow-xl transition-transform duration-300 ease-out lg:w-[280px] lg:translate-x-0 lg:shadow-none",
        "border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[var(--text-primary)]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.13),transparent_32%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.10),transparent_30%)]",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative flex h-[65px] flex-shrink-0 items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] shadow-lg shadow-yellow-500/10 overflow-hidden">
            <img src={logo} alt="Exponify PH" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-black tracking-tight text-[var(--text-primary)]">
                ExponifyPH
              </span>
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-gold)]" />
            </div>
            <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">
              AI Enterprise OS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin sidebar"
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Quick search ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <div className="relative group">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] transition-colors duration-150 group-focus-within:text-[var(--brand-gold)]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search navigation…"
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] py-2 pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-150 focus:border-[var(--brand-gold-border)] focus:bg-[var(--bg-sidebar)] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
                type="button"
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--text-muted)] text-[var(--bg-sidebar)] hover:bg-[var(--text-secondary)] transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loadingRegistry && (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-9 animate-pulse rounded-xl bg-[var(--hover-bg)]" />
            ))}
          </div>
        )}

        {!loadingRegistry && registryError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
            {registryError}
          </div>
        )}

        {!loadingRegistry && !registryError && (
          <>
            {/* No results */}
            <AnimatePresence>
              {isSearching && filteredSections.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 py-10 text-center"
                >
                  <Search className="h-6 w-6 text-[var(--text-muted)]" />
                  <p className="text-xs text-[var(--text-muted)]">
                    No results for <span className="font-semibold text-[var(--text-secondary)]">"{query}"</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {filteredSections.map((section, sectionIndex) => {
                const SectionIcon = section.icon;
                const isSectionOpen = !!openSections[section.key];
                const isSectionActive = section.key === activeDivisionKey;

                return (
                  <div key={section.key}>
                    {/* Section separator — after the first item */}
                    {sectionIndex > 0 && !isSearching && (
                      <div className="mx-3 my-1.5 flex items-center gap-2">
                        <div className="h-px flex-1 bg-[var(--border-color)]/60" />
                      </div>
                    )}

                    {/* Section header button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className={cn(
                        "relative group flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-150 overflow-hidden",
                        isSectionActive
                          ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] font-bold text-[var(--brand-gold)]"
                          : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {isSectionActive && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-[var(--brand-gold)]" />
                      )}

                      {/* Icon — shifts right on hover */}
                      <SectionIcon
                        className={cn(
                          "h-4 w-4 flex-shrink-0 transition-transform duration-150",
                          isSectionActive
                            ? "text-[var(--brand-gold)]"
                            : "text-[var(--text-muted)] group-hover:translate-x-[2px] group-hover:text-[var(--brand-cyan)]"
                        )}
                      />

                      {/* Label — shifts right on hover */}
                      <span className={cn(
                        "min-w-0 flex-1 truncate text-left transition-transform duration-150",
                        !isSectionActive && "group-hover:translate-x-[2px]"
                      )}>
                        {section.title}
                      </span>

                      {/* Item count badge */}
                      {section.items.length > 0 && !isSectionOpen && !isSectionActive && (
                        <span className="flex-shrink-0 rounded-md bg-[var(--hover-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] tabular-nums">
                          {section.items.length}
                        </span>
                      )}

                      {/* Chevron */}
                      <motion.div
                        animate={{ rotate: isSectionOpen ? 180 : 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </motion.div>
                    </button>

                    {/* Animated items container */}
                    <AnimatePresence initial={false}>
                      {isSectionOpen && (
                        <motion.div
                          key="items"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="ml-5 space-y-0.5 border-l border-[var(--border-color)] pl-2 pt-0.5 pb-1">
                            {section.items.map(({ key, adminRoute, icon: Icon, label }, itemIndex) => (
                              <motion.div
                                key={key}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIndex * 0.03, duration: 0.15 }}
                              >
                                <NavLink
                                  to={adminRoute}
                                  onClick={onClose}
                                  className={({ isActive }) =>
                                    cn(
                                      "relative group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-150 overflow-hidden",
                                      isActive
                                        ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] font-semibold text-[var(--brand-gold)]"
                                        : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                                    )
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && (
                                        <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-[var(--brand-gold)]" />
                                      )}

                                      {/* Icon — micro-slide on hover */}
                                      <Icon
                                        className={cn(
                                          "h-4 w-4 flex-shrink-0 transition-transform duration-150",
                                          isActive
                                            ? "text-[var(--brand-gold)]"
                                            : "text-[var(--text-muted)] group-hover:translate-x-[2px] group-hover:text-[var(--brand-cyan)]"
                                        )}
                                      />

                                      {/* Label — micro-slide on hover */}
                                      <span className={cn(
                                        "min-w-0 flex-1 truncate transition-transform duration-150",
                                        !isActive && "group-hover:translate-x-[2px]"
                                      )}>
                                        {label}
                                      </span>

                                      {isActive && (
                                        <ChevronRight className="h-3 w-3 flex-shrink-0 text-[var(--brand-gold)]" />
                                      )}
                                    </>
                                  )}
                                </NavLink>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* ── User card ───────────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 border-t border-[var(--border-color)] px-4 py-3">
        {user && (
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <button
              type="button"
              title="Change photo"
              onClick={() => avatarInputRef.current?.click()}
              className="relative group flex-shrink-0 h-9 w-9"
            >
              <div className={`h-9 w-9 rounded-2xl overflow-hidden border border-[var(--brand-gold-border)] ${user.avatar_url?.includes('dicebear') ? 'avatar-float' : ''}`}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || 'User'}
                    className={`w-full h-full ${user.avatar_url.includes('dicebear') ? 'object-contain p-0.5' : 'object-cover'}`}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] flex items-center justify-center text-xs font-black text-[#050816]">
                    {initials(user.full_name || user.email || 'Admin')}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {avatarUploading
                  ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5 text-white" />}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                {user.full_name || "Admin"}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {user.role || "Administrator"}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
