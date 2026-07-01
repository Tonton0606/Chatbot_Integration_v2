/**
 * Exponify AI — Client Workspace AI Assistant
 * Powered by Groq via /api/ai/chat/ask
 *
 * Features:
 * - Universal Exponify AI persona (bilingual: EN + Tagalog)
 * - Proactive suggestions after each response
 * - Navigate-to routing for workspace modules
 * - Thumbs feedback loop
 * - Intent detection + confidence
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, X, Send, Sparkles, Loader2, ChevronRight,
  ThumbsUp, ThumbsDown, RefreshCw, Map, Minimize2, Maximize2,
} from "lucide-react";
import { cn } from "../../../lib/adminUtils";

const RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API  = RAW.endsWith("/api") ? RAW : `${RAW}/api`;

const SESSION_ID = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const SUGGESTED = [
  "How do I view my invoices?",
  "How do I update my profile?",
  "Paano makakita ng aking mga tasks?",
  "How do I contact support?",
];

const WELCOMES = {
  invoices:  "Hi! I'm Exponify AI 👋 I can help you view invoices, check payment status, or download receipts. What do you need?",
  tasks:     "Hi! I'm Exponify AI 👋 Need help with your tasks? I can show you how to create, update, or prioritize them.",
  projects:  "Hi! I'm Exponify AI 👋 Ask me about your projects, milestones, or how to track progress.",
  contacts:  "Hi! I'm Exponify AI 👋 I can help you manage your contacts, add new ones, or find a specific person.",
  dashboard: "Hi! I'm Exponify AI 👋 Your workspace assistant! Ask me anything or use the suggestions below.",
  default:   "Hi! I'm Exponify AI 👋 I'm here to help you get the most out of your workspace. Ask me anything!",
};

async function callApi(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}
    </div>
  );
}

function Message({ msg, onNavigate, onFeedback }) {
  const [fb, setFb] = useState(null);

  function handleFb(rating) {
    setFb(rating);
    onFeedback({ rating, query: msg.query, response: msg.text });
  }

  return (
    <div className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
      {msg.role === "assistant" && (
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={12} className="text-primary" />
        </div>
      )}
      <div className={cn("max-w-[84%] space-y-1.5", msg.role === "user" && "items-end flex flex-col")}>
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm leading-relaxed",
          msg.role === "user"
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-white/[0.06] text-white/90 border border-white/10 rounded-tl-sm"
        )}>
          {msg.emoji && msg.role === "assistant" && <span className="mr-1">{msg.emoji}</span>}
          {msg.text}
        </div>
        {msg.route && msg.role === "assistant" && (
          <button onClick={() => onNavigate(msg.route)}
            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary font-medium group">
            <Map size={10} />
            <span>{msg.routeLabel || "Go there"}</span>
            <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
        {msg.role === "assistant" && !msg.isWelcome && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleFb("thumbs_up")} className={cn("p-0.5 rounded transition-colors", fb === "thumbs_up" ? "text-green-400" : "text-white/20 hover:text-white/40")}><ThumbsUp size={10} /></button>
            <button onClick={() => handleFb("thumbs_down")} className={cn("p-0.5 rounded transition-colors", fb === "thumbs_down" ? "text-red-400" : "text-white/20 hover:text-white/40")}><ThumbsDown size={10} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AIAssistant({ context = "default", contextData = {}, className, workspaceId }) {
  const navigate      = useNavigate();
  const [open, setOpen]         = useState(false);
  const [minimized, setMin]     = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: WELCOMES[context] || WELCOMES.default, isWelcome: true }
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoad]  = useState(false);
  const [suggestions, setSug] = useState(SUGGESTED);
  const [unread, setUnread] = useState(0);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (open && !minimized) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open, minimized]);

  const addMsg = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
    if (!open) setUnread(n => n + 1);
  }, [open]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setSug([]);

    setMessages(prev => [...prev, { role: "user", text: q }]);
    historyRef.current = [...historyRef.current.slice(-7), { role: "user", content: q }];
    setLoad(true);

    try {
      const res = await callApi("/ai/chat/ask", {
        query:         q,
        history:       historyRef.current.slice(0, -1),
        moduleContext: context,
        role:          "client",
        sessionId:     SESSION_ID,
      });

      const answer = res.answer || "I couldn't get a response. Please try again!";
      historyRef.current.push({ role: "assistant", content: answer });

      addMsg({
        role:        "assistant",
        text:        answer,
        route:       res.route,
        routeLabel:  res.routeLabel,
        emoji:       res.emoji,
        query:       q,
      });

      if (res.suggestions?.length) setSug(res.suggestions);
    } catch {
      addMsg({ role: "assistant", text: "Oops! I'm having trouble connecting. Please try again in a moment! 😅" });
    } finally {
      setLoad(false);
    }
  }

  async function sendFeedback({ rating, query, response }) {
    await callApi("/ai/feedback", { sessionId: SESSION_ID, query, response, rating, role: "client" }).catch(() => {});
  }

  function handleNavigate(route) {
    if (route?.startsWith("/")) navigate(route);
    setOpen(false);
  }

  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  function clearChat() {
    setMessages([{ role: "assistant", text: WELCOMES[context] || WELCOMES.default, isWelcome: true }]);
    historyRef.current = [];
    setSug(SUGGESTED);
  }

  // Trigger button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all text-sm font-medium",
          className
        )}
      >
        <Bot size={14} />
        <span>Help</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9990] w-[340px] flex flex-col rounded-2xl shadow-2xl border border-white/10 bg-[#0d1117] overflow-hidden max-h-[580px]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600/80 to-primary/80 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <Bot size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">NOVA</p>
          <p className="text-[10px] text-white/60 flex items-center gap-1"><Sparkles size={8} /> Your workspace assistant</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-1.5 text-white/50 hover:text-white transition-colors"><RefreshCw size={12} /></button>
          <button onClick={() => setMin(m => !m)} className="p-1.5 text-white/50 hover:text-white transition-colors">
            {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 text-white/50 hover:text-white transition-colors"><X size={12} /></button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[380px]">
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} onNavigate={handleNavigate} onFeedback={sendFeedback} />
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={12} className="text-primary" />
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/10">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 3).map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-primary/25 text-primary/70 hover:border-primary hover:text-primary hover:bg-primary/10 transition-all truncate max-w-[200px]">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask NOVA anything…"
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-primary/50 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AIAssistant;
