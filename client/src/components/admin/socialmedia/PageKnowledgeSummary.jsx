import React from "react";
import { Edit3, CheckCircle2, XCircle, Bot, Sparkles, MessageSquare, Clock, Zap, Settings } from "lucide-react";

export default function PageKnowledgeSummary({ settings, onEdit }) {
  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
        <p className="text-sm text-[var(--text-secondary)] mb-4">No configuration found for this page.</p>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          <Edit3 className="w-4 h-4" />
          Configure Chatbot
        </button>
      </div>
    );
  }

  const parseJson = (val, fallback) => {
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return fallback; }
    }
    return Array.isArray(val) ? val : fallback;
  };

  const handoffKeywords = parseJson(settings.handoffKeywords, []);
  const starters = parseJson(settings.conversationStarters, []);

  const StatusIcon = ({ enabled }) => (
    enabled 
      ? <CheckCircle2 className="w-4 h-4 text-[var(--success)]" /> 
      : <XCircle className="w-4 h-4 text-[var(--text-muted)]" />
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl">
        <div>
          <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--brand-gold)]" />
            Chatbot Configuration Overview
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Summary of your current AI persona, behaviors, and handoff settings.
          </p>
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-black font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
        >
          <Edit3 className="w-4 h-4" />
          Edit Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Personality */}
        <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
            <Sparkles className="w-4 h-4 text-[var(--brand-gold)]" /> AI Personality
          </h4>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">AI Enabled</span>
            <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
              <StatusIcon enabled={settings.aiEnabled !== false} />
              {settings.aiEnabled !== false ? "Active" : "Disabled"}
            </span>
          </div>
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Routing</span>
            <p className="text-sm text-[var(--text-primary)] font-medium">
              Automatic (Fastest)
            </p>
          </div>
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Custom Instruction</span>
            <div className="text-sm text-[var(--text-primary)] bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] max-h-32 overflow-y-auto">
              {settings.aiInstruction || <span className="text-[var(--text-muted)] italic">None</span>}
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Knowledge Base</span>
            <div className="text-sm text-[var(--text-primary)] bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] max-h-32 overflow-y-auto whitespace-pre-wrap">
              {settings.knowledgeBase || <span className="text-[var(--text-muted)] italic">None</span>}
            </div>
          </div>
        </div>

        {/* Behavior & Handoff */}
        <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
            <Settings className="w-4 h-4 text-[var(--brand-gold)]" /> Behavior & Handoff
          </h4>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Welcome Message</span>
            <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
              <StatusIcon enabled={settings.welcomeEnabled} />
              {settings.welcomeEnabled ? "Active" : "Disabled"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Human Handoff</span>
            <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
              <StatusIcon enabled={settings.handoffEnabled} />
              {settings.handoffEnabled ? "Active" : "Disabled"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Business Hours</span>
            <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
              <StatusIcon enabled={settings.businessHoursEnabled} />
              {settings.businessHoursEnabled ? "Active" : "Disabled"}
            </span>
          </div>

          {settings.handoffEnabled && (
            <div className="space-y-1 pt-2">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Handoff Triggers</span>
              <div className="flex flex-wrap gap-2">
                {handoffKeywords.length > 0 ? handoffKeywords.map((kw, i) => (
                  <span key={i} className="px-2 py-1 text-xs font-semibold bg-[var(--danger-soft)] text-[var(--danger)] rounded-lg">
                    {kw}
                  </span>
                )) : <span className="text-sm text-[var(--text-muted)]">None</span>}
              </div>
            </div>
          )}

          {starters.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[var(--border-color)] mt-4">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Conversation Starters
              </span>
              <ul className="text-sm text-[var(--text-primary)] list-disc pl-4 space-y-1">
                {starters.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
