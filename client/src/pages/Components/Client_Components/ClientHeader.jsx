import { useRef, useState } from "react";
import { Menu, ChevronDown, LogOut, Settings, Sparkles, Moon, Sun, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { supabase } from "../../../config/supabaseClient.js";
import { initials } from "../../../lib/adminUtils.js";
import { useTheme } from "../../../context/ThemeContext.jsx";
import { signOutAndRevoke } from '../../../services/auth/authActions';
import ExecutiveSearch from "../../../components/admin/ui/ExecutiveSearch";

function ClientHeader({
  onMenu,
  onToggleSidebar,
  title = "Client Portal",
  user,
  workspace,
}) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [showUser, setShowUser] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const photoInputRef = useRef(null);

  const openSidebar = onMenu || onToggleSidebar;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type) || file.size > 5 * 1024 * 1024) return;
    setAvatarUploading(true);
    setShowUser(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
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
      if (res.ok) window.dispatchEvent(new CustomEvent('profileUpdated'));
    } finally {
      setAvatarUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await signOutAndRevoke();
    navigate("/");
  };

  const goToSettings = () => {
    navigate("/Client/Settings");
    setShowUser(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[65px] w-full items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-header)]/95 px-4 py-3 backdrop-blur-xl transition-colors duration-300">
      <button
        type="button"
        onClick={openSidebar}
        aria-label="Open client sidebar"
        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-shrink-0">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="truncate text-sm font-black tracking-tight text-[var(--text-primary)] sm:max-w-[220px] sm:text-base md:max-w-[320px] lg:max-w-none"
            >
              {title}
            </motion.h1>
          </AnimatePresence>
          <Sparkles className="hidden h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-gold)] sm:block" />
        </div>

        <p className="hidden text-[11px] font-medium text-[var(--text-muted)] sm:block">
          {workspace?.name || "Workspace"} · ExponifyPH Client OS
        </p>
      </div>

      <div className="mx-auto hidden min-w-0 flex-1 justify-center md:flex">
        <div className="w-full max-w-2xl">
          <ExecutiveSearch />
        </div>
      </div>

      <div className="ml-auto flex min-w-0 flex-shrink-0 items-center gap-2 md:ml-0">
        <motion.button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-gold-border)] hover:text-[var(--brand-gold)]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? "moon" : "sun"}
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.18 }}
            >
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <div className="hidden rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-cyan)] md:inline-flex">
          AI Workspace
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUser((v) => !v)}
            className="flex max-w-[220px] items-center gap-2 rounded-2xl border border-transparent px-2 py-1.5 transition-colors hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
          >
            {/* Avatar */}
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-[var(--brand-gold-border)] ${user?.avatar_url?.includes('dicebear') ? 'avatar-float' : ''}`}>
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.full_name || 'User'}
                  className={`w-full h-full ${user.avatar_url.includes('dicebear') ? 'object-contain p-0.5' : 'object-cover'}`}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] flex items-center justify-center text-xs font-black text-[#050816]">
                  {initials(user?.full_name || user?.email || "Client")}
                </div>
              )}
            </div>

            <span className="hidden max-w-[130px] truncate text-sm font-semibold text-[var(--text-secondary)] sm:block">
              {user?.full_name || "Client"}
            </span>

            <motion.div
              animate={{ rotate: showUser ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="hidden sm:block"
            >
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showUser && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUser(false)}
                />

                {/* Dropdown */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full z-50 mt-2 w-[min(14rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2 shadow-2xl"
                >
                  <div className="border-b border-[var(--border-color)] px-3 py-2">
                    <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {user?.full_name || "Client User"}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {user?.email}
                    </p>
                  </div>

                  {/* Change Photo */}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                    {avatarUploading ? 'Uploading…' : (user?.avatar_url ? 'Change Photo' : 'Upload Photo')}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />

                  <button
                    type="button"
                    onClick={() => { toggleTheme(); setShowUser(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                  >
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </button>

                  <button
                    type="button"
                    onClick={goToSettings}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default ClientHeader;
