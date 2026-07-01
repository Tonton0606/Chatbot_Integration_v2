/**
 * Exponify AI — Floating chatbot for all client pages
 * Features: full conversation history, module navigation, multilingual (EN/TL/Taglish), suggestions
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, X, Send, Sparkles, MessageSquare, ChevronDown, ChevronUp,
  Loader2, ChevronRight, RefreshCw, Copy, Check, Zap, ArrowRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE === "/api" || /\/api$/i.test(RAW_API_BASE)
  ? RAW_API_BASE : `${RAW_API_BASE}/api`;

const MAX_HISTORY = 8;

// Detect current module from route
function detectModule(pathname) {
  if (!pathname) return "dashboard";
  const p = pathname.toLowerCase();
  if (p.includes("inbox") && p.includes("facebook")) return "Facebook Inbox";
  if (p.includes("inbox")) return "Inbox";
  if (p.includes("crm")) return "CRM";
  if (p.includes("contacts")) return "Contacts";
  if (p.includes("deals")) return "Deals";
  if (p.includes("tasks")) return "Tasks";
  if (p.includes("leads")) return "Leads";
  if (p.includes("projects")) return "Projects";
  if (p.includes("analytics")) return "Analytics";
  if (p.includes("revenue")) return "Revenue";
  if (p.includes("pipeline")) return "Pipeline Analytics";
  if (p.includes("leaderboard")) return "Sales Leaderboard";
  if (p.includes("booking")) return "Booking";
  if (p.includes("employees")) return "Employees";
  if (p.includes("hr")) return "HR Dashboard";
  if (p.includes("teams")) return "Teams";
  if (p.includes("landing")) return "Landing Pages";
  if (p.includes("facebook")) return "Facebook Connect";
  if (p.includes("workspace")) return "Workspace Access";
  if (p.includes("profile")) return "Profile & Settings";
  if (p.includes("assistant")) return "AI Assistant";
  return "Dashboard";
}

// Quick actions per module
const MODULE_QUICK_ACTIONS = {
  "CRM": [
    { label: "How to add a lead?", prompt: "How do I add a new lead to the CRM?" },
    { label: "Pipeline stages", prompt: "How do pipeline stages work in the CRM?" },
    { label: "Export contacts", prompt: "How do I export my contacts?" },
  ],
  "Inbox": [
    { label: "Reply to message", prompt: "How do I reply to a customer message in Inbox?" },
    { label: "Facebook messages", prompt: "How do I access Facebook Messenger messages?" },
    { label: "Mark as resolved", prompt: "How do I mark a conversation as resolved?" },
  ],
  "Tasks": [
    { label: "Add a task", prompt: "How do I add a new task?" },
    { label: "Assign to someone", prompt: "How do I assign a task to a team member?" },
    { label: "Set due date", prompt: "How do I set a due date for a task?" },
  ],
  "Deals": [
    { label: "Add a deal", prompt: "How do I create a new deal?" },
    { label: "Update deal stage", prompt: "How do I move a deal to the next stage?" },
    { label: "Deal pipeline", prompt: "How does the deals pipeline work?" },
  ],
  "Analytics": [
    { label: "View reports", prompt: "How do I access my analytics reports?" },
    { label: "Export data", prompt: "How do I export analytics data?" },
    { label: "KPI dashboard", prompt: "How do I use the KPI dashboard?" },
  ],
  "default": [
    { label: "Show me the CRM", prompt: "How do I get to the CRM module?" },
    { label: "Manage my tasks", prompt: "How do I manage my tasks?" },
    { label: "Check analytics", prompt: "Where can I see my analytics and reports?" },
  ],
};

// Greeting variants
const GREETINGS = [
  "Hi! I'm Exponify AI. How can I help you today?",
  "Kamusta! Ako ang inyong Exponify AI. Paano ko kayo matutulungan?",
  "Hello! I'm Exponify AI, here to help you navigate. What do you need?",
];

export default function ClientAssistant({ workspaceId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentModule = detectModule(location?.pathname);
  const greeting = GREETINGS[0];

  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages]       = useState([{ role: "assistant", text: greeting, id: "welcome" }]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [copied, setCopied]           = useState(null);
  const [unread, setUnread]           = useState(0);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const quickActions = MODULE_QUICK_ACTIONS[currentModule] || MODULE_QUICK_ACTIONS.default;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (isOpen) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); } }, [isOpen]);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const callAPI = useCallback(async (query) => {
    const history = messages
      .filter((m) => m.id !== "welcome")
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.text }));

    const r = await fetch(`${API_BASE_URL}/ai/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        history,
        moduleContext: currentModule,
        role: "client",
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "AI request failed");
    return data;
  }, [messages, currentModule, workspaceId]);

  const appendAssistant = (data) => {
    const msg = {
      role: "assistant",
      text: data.answer || "Hindi ko pa alam iyon. Subukan mong magtanong ulit.",
      route: data.route,
      routeLabel: data.routeLabel,
      suggestions: data.suggestions || [],
      id: `msg_${Date.now()}`,
    };
    setMessages((p) => [...p, msg]);
    if (!isOpen) setUnread((n) => n + 1);
  };

  const send = async (query) => {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", text: q, id: `user_${Date.now()}` }]);
    setLoading(true);
    try {
      const data = await callAPI(q);
      appendAssistant(data);
    } catch (err) {
      setMessages((p) => [...p, {
        role: "assistant",
        text: `May error na nangyari: ${err.message}. Pakisubukan muli.`,
        isError: true,
        id: `err_${Date.now()}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (route) => {
    if (!route) return;
    if (route.startsWith("/")) navigate(route);
    else window.location.href = route;
  };

  const clearChat = () => setMessages([{ role: "assistant", text: greeting, id: "welcome" }]);

  // Collapsed button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full border shadow-2xl transition-all duration-200 hover:scale-105 bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--brand-gold-border)]"
        style={{ background: "linear-gradient(135deg, var(--bg-card), var(--bg-secondary))" }}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
          <Bot className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </span>
        <span className="font-semibold text-sm">Exponify AI</span>
        <Sparkles className="w-4 h-4 text-[var(--brand-gold)] animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 overflow-hidden transition-all duration-300 flex flex-col rounded-3xl border shadow-2xl bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)]"
      style={isMinimized
        ? { bottom: 24, right: 24, width: 320, height: 64 }
        : { bottom: 24, right: 24, width: "min(24rem, calc(100vw - 2rem))", height: "min(560px, calc(100vh - 2rem))" }}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] flex-shrink-0"
        style={{ background: "linear-gradient(135deg, rgba(103,232,249,0.08), rgba(212,175,55,0.06))" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--text-primary)]">Exponify AI</span>
              <Sparkles className="w-3 h-3 text-[var(--brand-gold)]" />
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">{currentModule} • Always here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} title="Clear chat" className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick action pills */}
          <div className="px-3 py-2 border-b border-[var(--border-color)] overflow-x-auto flex-shrink-0">
            <div className="flex gap-2">
              {quickActions.map((qa) => (
                <button
                  key={qa.prompt}
                  onClick={() => send(qa.prompt)}
                  disabled={loading}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-border)] hover:text-[var(--brand-cyan)] hover:bg-[var(--brand-cyan-soft)] transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <Zap className="w-3 h-3" />
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--brand-cyan-border)]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="max-w-[85%] space-y-1.5">
                  <div className={`rounded-2xl px-3 py-2 text-sm border relative group ${
                    msg.role === "user"
                      ? "bg-[var(--brand-gold)] text-[#050816] border-[var(--brand-gold-border)] rounded-br-sm"
                      : msg.isError
                      ? "bg-red-500/10 text-red-400 border-red-500/20 rounded-bl-sm"
                      : "bg-[var(--hover-bg)] text-[var(--text-primary)] border-[var(--border-color)] rounded-bl-sm"
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed text-[13px]">{msg.text}</pre>
                    {msg.role === "assistant" && !msg.isError && (
                      <button
                        onClick={() => copyText(msg.text, msg.id)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[var(--hover-bg)]"
                      >
                        {copied === msg.id ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3 text-[var(--text-muted)]" />}
                      </button>
                    )}
                  </div>

                  {/* Navigate button */}
                  {msg.route && (
                    <button
                      onClick={() => handleNavigate(msg.route)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] hover:brightness-110 transition-all"
                    >
                      <ChevronRight className="w-3 h-3" />
                      Go to {msg.routeLabel || msg.route}
                    </button>
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s) => (
                        <button
                          key={s.route}
                          onClick={() => handleNavigate(s.route)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-colors"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <div className="w-7 h-7 rounded-xl bg-[var(--brand-cyan-soft)] flex items-center justify-center border border-[var(--brand-cyan-border)]">
                  <Loader2 className="w-3.5 h-3.5 text-[var(--brand-cyan)] animate-spin" />
                </div>
                <span className="text-xs">Nag-iisip ang AI...</span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-[var(--border-color)] flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Magtanong dito... (Ask anything)"
                disabled={loading}
                className="flex-1 px-3 py-2.5 text-sm rounded-2xl border bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)] focus:border-[var(--brand-gold-border)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-2xl bg-[var(--brand-gold)] text-[#050816] border border-[var(--brand-gold-border)] disabled:opacity-50 hover:brightness-110 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
              Powered by Exponify AI • Supports English & Filipino
            </p>
          </form>
        </>
      )}
    </div>
  );
}
