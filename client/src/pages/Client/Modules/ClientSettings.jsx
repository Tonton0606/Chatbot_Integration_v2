import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../config/supabaseClient";
import { AnimatePresence } from "framer-motion";
import {
  Settings, Save, Eye, EyeOff, Globe, Bell, Shield, User,
  Camera, Upload, X, Wand2, AlertTriangle, CheckCircle,
} from "lucide-react";
import CartoonAvatarPicker from "../../../components/admin/ui/CartoonAvatarPicker";

export default function ClientSettings() {
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef(null);

  // Profile fields
  const [fullName, setFullName] = useState("");

  // Workspace settings
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceEmail, setWorkspaceEmail] = useState("");
  const [workspacePhone, setWorkspacePhone] = useState("");
  const [workspaceAddress, setWorkspaceAddress] = useState("");
  const [workspaceTimezone, setWorkspaceTimezone] = useState("Asia/Manila");

  // Password change
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [workflowNotifs, setWorkflowNotifs] = useState(true);
  const [lowStockNotifs, setLowStockNotifs] = useState(true);

  // Chat Head toggle
  const [globalChatEnabled, setGlobalChatEnabled] = useState(false);
  const [showChatHead, setShowChatHead] = useState(localStorage.getItem('hide_ai_chat_head') !== 'true');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setWorkspaceEmail(session.user.email || "");
      }
    });
    const name = localStorage.getItem("workspace_name") || "";
    setWorkspaceName(name);
    loadCurrentAvatar();

    // Fetch AI Chatbot global settings
    const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
    if (workspaceId) {
      supabase
        .from("ai_chatbot_settings")
        .select("chat_head_enabled")
        .eq("workspace_id", workspaceId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.chat_head_enabled) setGlobalChatEnabled(true);
        });
    }
  }, []);

  const loadCurrentAvatar = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", authUser.id)
      .maybeSingle();
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    if (profile?.full_name) setFullName(profile.full_name);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { setAvatarError("Only JPG, PNG, GIF or WebP images are allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError("File must be under 5 MB."); return; }
    setAvatarUploading(true); setAvatarError(""); setAvatarSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/storage/avatar', {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ base64, filename: file.name, contentType: file.type }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      setAvatarUrl(data.url);
      setAvatarSuccess(true);
      window.dispatchEvent(new CustomEvent("profileUpdated"));
    } catch (e) {
      setAvatarError(e.message || "Upload failed. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/storage/avatar', {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      setAvatarUrl(""); setAvatarSuccess(false);
      window.dispatchEvent(new CustomEvent("profileUpdated"));
    } catch (e) {
      setAvatarError(e.message || "Failed to remove photo.");
    }
  };

  const handleCartoonSelect = async (url) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", authUser.id);
      if (error) throw error;
      setAvatarUrl(url); setAvatarSuccess(true); setAvatarError("");
      window.dispatchEvent(new CustomEvent("profileUpdated"));
    } catch (e) {
      setAvatarError(e.message || "Failed to set cartoon avatar.");
    }
  };

  async function saveProfile() {
    setSaving(true); setErr(""); setSaved(false);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", authUser.id);
      if (error) throw error;
      setSaved(true);
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveWorkspace() {
    setSaving(true); setErr(""); setSaved(false);
    try {
      localStorage.setItem("workspace_name", workspaceName);
      const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
      if (workspaceId) {
        await supabase.from("workspaces").update({
          name: workspaceName, email: workspaceEmail,
          phone: workspacePhone, address: workspaceAddress, timezone: workspaceTimezone,
        }).eq("id", workspaceId);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!newPass || !confirmPass) { setErr("Fill all password fields."); return; }
    if (newPass !== confirmPass) { setErr("Passwords do not match."); return; }
    if (newPass.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setSaving(true); setErr(""); setSaved(false);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setNewPass(""); setConfirmPass("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold)]/20 transition-colors mb-4";
  const labelCls = "block mb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide";

  const tabs = [
    { id: "profile",       label: "Profile",       icon: <User size={15} /> },
    { id: "workspace",     label: "Workspace",     icon: <Globe size={15} /> },
    { id: "security",      label: "Security",      icon: <Shield size={15} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={15} /> },
  ];

  return (
    <div className="space-y-6 p-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[var(--brand-gold)]" />
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[var(--border-color)]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setErr(""); setSaved(false); setAvatarError(""); setAvatarSuccess(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg">
        {/* Feedback banners */}
        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {err}
          </div>
        )}
        {saved && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            <CheckCircle className="h-4 w-4 flex-shrink-0" /> Saved successfully.
          </div>
        )}

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 space-y-5">
            <h3 className="font-bold text-base">Profile Settings</h3>

            {/* Avatar row */}
            <div className="flex items-center gap-5 pb-5 border-b border-[var(--border-color)]">
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--brand-gold-border)] shadow-lg shadow-yellow-500/10">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className={`w-full h-full ${avatarUrl.includes("dicebear") ? "object-contain p-1" : "object-cover"}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] flex items-center justify-center text-2xl font-black text-[#050816]">
                      {fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "C"}
                    </div>
                  )}
                </div>
                {/* Hover overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-2xl bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  {avatarUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">Profile Photo</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">JPG, PNG, GIF, WebP — max 5 MB</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-gold)] transition-colors hover:bg-[var(--brand-gold)]/20 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {avatarUploading ? "Uploading…" : "Upload photo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-500/20"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Generate Avatar
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
                {avatarError && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {avatarError}
                  </p>
                )}
                {avatarSuccess && (
                  <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Photo updated — visible everywhere in the app
                  </p>
                )}
              </div>
            </div>

            {/* Name + phone */}
            <div>
              <label className={labelCls}>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={user?.email || ""} readOnly className={`${inputCls} opacity-60 cursor-not-allowed`} />
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-[#050816] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}

        {/* ── Workspace Tab ── */}
        {tab === "workspace" && (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 space-y-1">
            <h3 className="font-bold text-base mb-4">Workspace Profile</h3>
            <label className={labelCls}>Business Name</label>
            <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="Your business name" className={inputCls} />
            <label className={labelCls}>Contact Email</label>
            <input value={workspaceEmail} onChange={e => setWorkspaceEmail(e.target.value)} type="email" placeholder="contact@business.ph" className={inputCls} />
            <label className={labelCls}>Phone Number</label>
            <input value={workspacePhone} onChange={e => setWorkspacePhone(e.target.value)} placeholder="+63 9XX XXX XXXX" className={inputCls} />
            <label className={labelCls}>Address</label>
            <input value={workspaceAddress} onChange={e => setWorkspaceAddress(e.target.value)} placeholder="Metro Manila, Philippines" className={inputCls} />
            <label className={labelCls}>Timezone</label>
            <select value={workspaceTimezone} onChange={e => setWorkspaceTimezone(e.target.value)} className={`${inputCls} appearance-none`}>
              <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
              <option value="UTC">UTC</option>
            </select>
            <button
              onClick={saveWorkspace}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-[#050816] transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}

        {/* ── Security Tab ── */}
        {tab === "security" && (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 space-y-1">
            <h3 className="font-bold text-base">Change Password</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Logged in as: {user?.email}</p>
            <label className={labelCls}>New Password</label>
            <div className="relative mb-4">
              <input
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                type={showPass ? "text" : "password"}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold)]/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              type={showPass ? "text" : "password"}
              placeholder="Repeat password"
              className={inputCls}
            />
            <button
              onClick={changePassword}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-[#050816] transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
            >
              <Shield className="h-4 w-4" />
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        )}

        {/* ── Notifications Tab ── */}
        {tab === "notifications" && (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <h3 className="font-bold text-base mb-4">Notification Preferences</h3>
            {[
              { label: "Email Notifications", desc: "Receive important alerts via email", state: emailNotifs, set: setEmailNotifs },
              { label: "Workflow Alerts", desc: "Notify me when a workflow triggers", state: workflowNotifs, set: setWorkflowNotifs },
              { label: "Low Stock Alerts", desc: "Alert when inventory falls below threshold", state: lowStockNotifs, set: setLowStockNotifs },
              ...(globalChatEnabled ? [{ label: "AI Chat Assistant", desc: "Show the floating AI Chat Head in the portal", state: showChatHead, set: (val) => { setShowChatHead(val); localStorage.setItem('hide_ai_chat_head', (!val).toString()); } }] : [])
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-4 border-b border-[var(--border-color)] last:border-0">
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{item.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => item.set(!item.state)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-colors duration-200 ${item.state ? "bg-[var(--brand-gold)] border-[var(--brand-gold)]" : "bg-[var(--hover-bg)] border-[var(--border-color)]"}`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${item.state ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            <button
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-[#050816] transition-opacity hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              Save Preferences
            </button>
          </div>
        )}
      </div>

      {/* CartoonAvatarPicker modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <CartoonAvatarPicker
            onSelect={(url) => { handleCartoonSelect(url); setShowAvatarPicker(false); }}
            onClose={() => setShowAvatarPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
