/**
 * AI Assistant Widget — Universal Admin AI companion
 * Supports: conversation history, quick actions, module data injection, navigate-to routing
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, X, Send, Sparkles, Brain, TrendingUp, Target, Zap,
  MessageSquare, ChevronDown, ChevronUp, Loader2, ChevronRight,
  RefreshCw, Copy, Check,
} from "lucide-react";
import { cn } from "../../lib/adminUtils";
import { useNavigate } from "react-router-dom";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE === "/api" || /\/api$/i.test(RAW_API_BASE)
  ? RAW_API_BASE : `${RAW_API_BASE}/api`;

const MAX_HISTORY = 10;

const QUICK_ACTIONS = {
  crm: [
    { icon: Target, label: "Score Leads", action: "score_leads", prompt: "Score my current leads and tell me which ones to prioritize." },
    { icon: TrendingUp, label: "Predict Deals", action: "predict_deals", prompt: "Which deals in my pipeline are most likely to close this month?" },
    { icon: MessageSquare, label: "Draft Email", action: "draft_email", prompt: "Draft a professional follow-up email for a warm lead." },
  ],
  marketing: [
    { icon: Sparkles, label: "Campaign Ideas", action: "create_campaign", prompt: "Suggest a 3-email campaign sequence for lead nurturing." },
    { icon: Target, label: "Best Send Time", action: "optimize_time", prompt: "What is the best time to send marketing emails for B2B clients?" },
    { icon: TrendingUp, label: "Predict Performance", action: "predict_performance", prompt: "How can I improve my email campaign open rates?" },
  ],
  inventory: [
    { icon: TrendingUp, label: "Forecast Demand", action: "forecast_demand", prompt: "How do I forecast demand for my top products next month?" },
    { icon: Target, label: "Optimize Stock", action: "optimize_stock", prompt: "What are best practices for setting reorder points?" },
    { icon: Zap, label: "Find Dead Stock", action: "find_dead_stock", prompt: "How do I identify and liquidate dead stock in my inventory?" },
  ],
  erp: [
    { icon: Zap, label: "Automation Ideas", action: "automation", prompt: "What are the best workflow automations I can set up in the ERP module?" },
    { icon: Brain, label: "Process Docs", action: "process_docs", prompt: "How do I generate ERP process documentation for my team?" },
    { icon: Target, label: "Optimize Workflow", action: "workflow_optimize", prompt: "How can I reduce bottlenecks in our procurement workflow?" },
  ],
  analytics: [
    { icon: Brain, label: "Get Insights", action: "insights", prompt: "What are the most important KPIs I should be tracking for business growth?" },
    { icon: TrendingUp, label: "Revenue Forecast", action: "forecast", prompt: "How do I build a reliable 3-month revenue forecast?" },
    { icon: Target, label: "Anomaly Detection", action: "anomalies", prompt: "What metrics should I monitor to detect performance anomalies early?" },
  ],
  inbox: [
    { icon: MessageSquare, label: "Draft Response", action: "draft_response", prompt: "Draft a professional empathetic response to a customer complaint." },
    { icon: Target, label: "Classify Tickets", action: "classify", prompt: "How should I categorize and prioritize support tickets?" },
    { icon: Zap, label: "Smart Routing", action: "routing", prompt: "What is a good system for routing support tickets to the right team members?" },
  ],
  projects: [
    { icon: Target, label: "Estimate Timeline", action: "estimate", prompt: "What factors should I consider when estimating a project timeline?" },
    { icon: Brain, label: "Risk Analysis", action: "risks", prompt: "What are the most common project risks and how do I mitigate them?" },
    { icon: Zap, label: "Task Breakdown", action: "tasks", prompt: "How do I break down a large project into manageable tasks?" },
  ],
  hr: [
    { icon: Brain, label: "Onboarding Checklist", action: "insights", prompt: "Create a comprehensive onboarding checklist for a new team member." },
    { icon: Target, label: "Performance Tips", action: "optimize_stock", prompt: "What are best practices for conducting employee performance reviews?" },
    { icon: TrendingUp, label: "Retention Ideas", action: "forecast", prompt: "What are effective strategies to improve employee retention?" },
  ],
  finance: [
    { icon: TrendingUp, label: "Budget Planning", action: "forecast", prompt: "What are best practices for annual budget planning for a growing business?" },
    { icon: Brain, label: "Cost Reduction", action: "insights", prompt: "What areas should I analyze to find cost reduction opportunities?" },
    { icon: Target, label: "Cash Flow Tips", action: "optimize_stock", prompt: "How do I improve cash flow management for my business?" },
  ],
  admin_kb: [
    { icon: Brain, label: "Enable Modules", action: "enable_modules", prompt: "How do I enable client modules in Workspace Administration?" },
    { icon: MessageSquare, label: "Reset Access", action: "reset_access", prompt: "How do I reset admin access for a user?" },
    { icon: Target, label: "Workspace Setup", action: "workspace_settings", prompt: "What are all the settings I can configure in Workspace Administration?" },
  ],
  default: [
    { icon: Brain, label: "Admin Guide", action: "insights", prompt: "What are the most important admin tasks I should set up first in Exponify?" },
    { icon: Sparkles, label: "Feature Tour", action: "report", prompt: "Give me a quick overview of all the major modules available in the admin panel." },
    { icon: TrendingUp, label: "Best Practices", action: "insights", prompt: "What are best practices for setting up a new client workspace?" },
  ],
};

function getWelcomeMessage(ctx) {
  const map = {
    crm: "CRM AI ready. I can score leads, predict deal outcomes, draft outreach emails, and help you close more deals.",
    marketing: "Marketing AI ready. I can plan campaigns, optimize send times, and suggest content strategies.",
    inventory: "Inventory AI active. I can forecast demand, optimize stock levels, and identify dead stock.",
    erp: "ERP AI ready. I can suggest automations, document processes, and optimize workflows.",
    analytics: "Analytics AI online. I can generate insights, forecast revenue, and guide you through your data.",
    inbox: "Support AI ready. I can draft responses, classify tickets, and suggest routing rules.",
    projects: "Projects AI active. I can estimate timelines, analyze risks, and break down tasks.",
    hr: "HR AI ready. I can help with onboarding, performance reviews, and retention strategies.",
    finance: "Finance AI ready. I can assist with budget planning, cash flow, and cost analysis.",
    admin_kb: "Admin AI ready. I know every module and setting in the Exponify admin panel. Ask me anything.",
    default: "Exponify AI ready. I can help you navigate any module, answer questions, and assist with any task across the platform.",
  };
  return map[ctx] || map.default;
}

export function AIAssistant({ context = "default", contextData = {}, className }) {
  let navigate;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- intentional guard for rendering outside a Router context
  try { navigate = useNavigate(); } catch { navigate = null; }

  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages]       = useState([{ role: "assistant", text: getWelcomeMessage(context), id: "welcome" }]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [copied, setCopied]           = useState(null);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const quickActions = QUICK_ACTIONS[context] || QUICK_ACTIONS.default;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen, isMinimized]);
  useEffect(() => { setMessages([{ role: "assistant", text: getWelcomeMessage(context), id: "welcome" }]); }, [context]);

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
        moduleContext: context,
        contextData: Object.keys(contextData).length ? contextData : undefined,
        sessionId: `admin-page-${context}`,
        role: "admin",
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "AI request failed");
    return data;
  }, [messages, context, contextData]);

  const appendAssistant = (data) => {
    setMessages((p) => [
      ...p,
      {
        role: "assistant",
        text: data.answer || "No response.",
        route: data.route,
        routeLabel: data.routeLabel,
        snippets: data.snippets || [],
        id: `msg_${Date.now()}`,
      },
    ]);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", text: q, id: `user_${Date.now()}` }]);
    setLoading(true);
    try {
      const data = await callAPI(q);
      appendAssistant(data);
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", text: `Error: ${err.message}`, isError: true, id: `err_${Date.now()}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    const qa = quickActions.find((a) => a.action === action);
    if (!qa || loading) return;
    setMessages((p) => [...p, { role: "user", text: qa.prompt, id: `qa_${Date.now()}` }]);
    setLoading(true);
    try {
      const data = await callAPI(qa.prompt);
      appendAssistant(data);
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", text: `Error: ${err.message}`, isError: true, id: `qaerr_${Date.now()}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([{ role: "assistant", text: getWelcomeMessage(context), id: "welcome" }]);

  const handleNavigate = (route) => {
    if (!route) return;
    if (navigate && route.startsWith("/")) navigate(route);
    else window.location.href = route;
  };

  // Collapsed button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full border shadow-2xl transition-all duration-200 hover:scale-105",
          "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--brand-gold-border)]",
          "before:absolute before:inset-0 before:rounded-full before:bg-[var(--ai-gradient)] before:opacity-80 before:-z-10",
          className
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
          <Bot className="w-5 h-5" />
        </span>
        <span className="font-semibold">Exponify AI</span>
        <Sparkles className="w-4 h-4 text-[var(--brand-gold)] animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 overflow-hidden transition-all duration-300 flex flex-col",
        "rounded-3xl border shadow-2xl",
        "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)]",
        isMinimized
          ? "bottom-6 right-6 w-80 h-16"
          : "bottom-6 right-6 w-[min(26rem,calc(100vw-2rem))] h-[min(580px,calc(100vh-2rem))]",
        className
      )}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--ai-gradient)] flex-shrink-0">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.16),transparent_34%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-primary)]">Exponify AI</span>
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
            </div>
            <p className="text-[11px] capitalize text-[var(--text-muted)]">{context} intelligence layer</p>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          <button onClick={clearChat} title="Clear chat" className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]">
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick actions */}
          <div className="px-3 py-2 border-b border-[var(--border-color)] overflow-x-auto flex-shrink-0">
            <div className="flex gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.action}
                  type="button"
                  onClick={() => handleQuickAction(action.action)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all disabled:opacity-50 bg-[var(--hover-bg)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--brand-cyan)] hover:border-[var(--brand-cyan-border)] hover:bg-[var(--brand-cyan-soft)]"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-2xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className="max-w-[85%] space-y-1.5">
                  <div className={cn(
                    "max-w-full rounded-2xl px-3 py-2 text-sm border relative group",
                    msg.role === "user"
                      ? "bg-[var(--brand-gold)] text-[#050816] border-[var(--brand-gold-border)] rounded-br-md"
                      : msg.isError
                      ? "bg-red-500/10 text-red-400 border-red-500/20 rounded-bl-md"
                      : "bg-[var(--hover-bg)] text-[var(--text-primary)] border-[var(--border-color)] rounded-bl-md"
                  )}>
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</pre>
                    {msg.role === "assistant" && !msg.isError && (
                      <button
                        onClick={() => copyText(msg.text, msg.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[var(--hover-bg)]"
                      >
                        {copied === msg.id ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3 text-[var(--text-muted)]" />}
                      </button>
                    )}
                  </div>
                  {msg.route && (
                    <button
                      onClick={() => handleNavigate(msg.route)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] hover:brightness-110 transition-all"
                    >
                      <ChevronRight className="w-3 h-3" />
                      Go to {msg.routeLabel || msg.route}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <div className="w-8 h-8 rounded-2xl bg-[var(--brand-cyan-soft)] border border-[var(--brand-cyan-border)] flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-[var(--brand-cyan)] animate-spin" />
                </div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-[var(--border-color)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Exponify AI anything..."
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
          </form>
        </>
      )}
    </div>
  );
}

export default AIAssistant;
