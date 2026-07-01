import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../config/supabaseClient";
import { Users, Mail, Phone, Shield, UserCheck, Clock } from "lucide-react";

const ROLE_COLORS = {
  admin: "var(--brand-gold)",
  manager: "var(--brand-cyan)",
  member: "var(--text-muted)",
  viewer: "#6b7280",
};

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

export default function ClientTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user);
      const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
      if (!workspaceId) { setLoading(false); return; }

      // Try workspace_members table first, fall back to workspace_access
      let data = null;
      let error = null;

      const res1 = await supabase
        .from("workspace_members")
        .select("id, user_id, email, full_name, role, status, created_at, last_active_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!res1.error) {
        data = res1.data;
      } else {
        const res2 = await supabase
          .from("workspace_access")
          .select("id, user_id, email, full_name, role, status, created_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false });
        if (!res2.error) data = res2.data;
        else error = res2.error;
      }

      if (error) console.error("Team load error:", error);
      setMembers(data || []);
    } catch (e) {
      console.error("Team error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const adminCount = members.filter(m => m.role === "admin").length;
  const activeCount = members.filter(m => m.status === "active" || !m.status).length;

  return (
    <div style={{ padding: "24px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Team</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Workspace members and access levels</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Members", value: members.length, icon: <Users size={20} color="var(--brand-gold)" /> },
          { label: "Active", value: activeCount, icon: <UserCheck size={20} color="#22c55e" /> },
          { label: "Admins", value: adminCount, icon: <Shield size={20} color="var(--brand-cyan)" /> },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            {s.icon}
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading…</div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: 12 }}>
          <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>No team members found.</p>
          <p style={{ fontSize: 13 }}>Add team members through Admin → Account Control.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {members.map(m => {
            const isCurrentUser = m.user_id === currentUser?.id || m.email === currentUser?.email;
            return (
              <div key={m.id} style={{ background: "var(--bg-card)", border: `1px solid ${isCurrentUser ? "rgba(212,175,55,0.4)" : "var(--border-color)"}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--brand-gold), var(--brand-cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#000", flexShrink: 0 }}>
                    {(m.full_name || m.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                      {m.full_name || "—"}
                      {isCurrentUser && <span style={{ fontSize: 11, color: "var(--brand-gold)", border: "1px solid var(--brand-gold)", borderRadius: 4, padding: "1px 5px" }}>You</span>}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email || "—"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: ROLE_COLORS[m.role] || "var(--text-muted)", border: `1px solid ${ROLE_COLORS[m.role] || "var(--border-color)"}`, borderRadius: 6, padding: "2px 8px" }}>
                    <Shield size={11} /> {ROLE_LABELS[m.role] || m.role || "Member"}
                  </span>
                  {m.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                      <Phone size={11} /> {m.phone}
                    </span>
                  )}
                  {m.last_active_at && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                      <Clock size={11} /> {new Date(m.last_active_at).toLocaleDateString("en-PH")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
