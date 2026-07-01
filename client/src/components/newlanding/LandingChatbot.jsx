/**
 * LandingChatbot — Public-facing Exponify AI assistant for the landing page
 * Powered by Groq via /api/ai/landing-chat/ask
 */
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Sparkles, ChevronRight, Loader2 } from "lucide-react";

const API = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "") + "/api";

const SUGGESTED = [
  "What does Exponify do?",
  "How much does it cost?",
  "Can I book a demo?",
  "What modules are included?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export default function LandingChatbot({ businessName = "Exponify" }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: `👋 Hi! I'm the Exponify AI assistant. Ask me anything about the platform, pricing, or book a demo!`, cta: null }
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch(`${API}/ai/landing-chat/ask`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: q, history, businessName }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Request failed");
      const answer = json.answer || json.data?.answer || "Sorry, I couldn't get a response. Please try again!";
      const aiMsg  = { role: "assistant", content: answer, cta: json.cta, ctaLink: json.ctaLink, leadInterest: json.leadInterest };

      setMessages(prev => [...prev, aiMsg]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again in a moment!" }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Chat window */}
      {open && (
        <div className="w-[360px] max-h-[560px] flex flex-col rounded-2xl shadow-2xl border border-white/10 overflow-hidden bg-[#0d1117] animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/90 to-primary border-b border-white/10">
            <div className="p-1.5 bg-white/20 rounded-full">
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Exponify AI</p>
              <p className="text-xs text-white/70 flex items-center gap-1"><Sparkles size={9} /> Online · Powered by Groq</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-white/70 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[380px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                    <Bot size={12} className="text-primary" />
                  </div>
                )}
                <div className={`max-w-[82%] space-y-2`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-white/8 text-white/90 border border-white/10 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.cta && msg.role === "assistant" && (
                    <a href={msg.ctaLink || "#booking"}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors group">
                      <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      {msg.cta}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Bot size={12} className="text-primary" />
                </div>
                <div className="px-3 py-2 rounded-2xl bg-white/8 border border-white/10 rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (shown when only welcome message) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary/80 hover:border-primary hover:text-primary hover:bg-primary/10 transition-all">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open AI chat"
      >
        {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
