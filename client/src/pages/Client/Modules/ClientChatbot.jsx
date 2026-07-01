import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import {
  Bot,
  MessageSquare,
  Zap,
  BookOpen,
  BarChart2,
  Settings,
  Sparkles,
  Brain
} from 'lucide-react';
import { Card, CardContent } from '../../../components/admin/ui';

import LiveChatTest, { AutoReplyRules, KnowledgeBaseEditor, ChatbotAnalytics, AISettings } from "../../../components/chat/LiveChatTest";

const _RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);
const API_BASE_URL = _RAW
  ? _RAW.endsWith('/api')
    ? _RAW
    : `${_RAW}/api`
  : import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : '/api';

const TABS = [
  { id: 'chat', label: 'Live Test', icon: MessageSquare },
  { id: 'rules', label: 'Auto-Reply Rules', icon: Zap },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'AI Settings', icon: Settings },
];

export default function ClientChatbot() {
  const [activeTab, setActiveTab] = useState('chat');
  const [liveStats, setLiveStats] = useState(null);
  const workspaceId =
    localStorage.getItem('exponify_active_client_workspace_id') || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';

  const [voiceConfig, setVoiceConfig] = useState({
    enabled: true,
    voiceResponseEnabled: true,
    wakeWord: 'Hey Exponify',
    sensitivity: 50,
    language: 'auto'
  });

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`${API_BASE_URL}/ai/chatbot-analytics?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data || json?.totalMessages !== undefined) setLiveStats(json.data || json);
      })
      .catch(() => {});
  }, [workspaceId]);

  const stats = [
    {
      icon: Bot,
      label: 'AI Responses',
      value: liveStats ? liveStats.aiResolved.toLocaleString() : '—',
      color: 'var(--brand-cyan)',
    },
    {
      icon: MessageSquare,
      label: 'Total Messages',
      value: liveStats ? liveStats.totalMessages.toLocaleString() : '—',
      color: 'var(--success)',
    },
    { icon: Zap, label: 'Active Rules', value: 'Live', color: 'var(--brand-gold)' },
    {
      icon: Brain,
      label: 'Resolution Rate',
      value: liveStats ? `${liveStats.resolutionRate}%` : '—',
      color: '#9b59b6',
    },
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--brand-cyan)]" /> AI Chatbot Configuration
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Configure, test, and monitor your AI assistant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-xs text-[var(--success)] font-medium">
            <Sparkles className="w-3 h-3" /> AI Active
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-5 h-5 flex-shrink-0" style={{ color: s.color }} />
              <div>
                <p className="text-xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-color)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--brand-gold)] text-[var(--brand-gold)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'chat' && <LiveChatTest voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} userRole="client" workspaceId={workspaceId} />}
        {activeTab === 'rules' && <AutoReplyRules />}
        {activeTab === 'kb' && <KnowledgeBaseEditor />}
        {activeTab === 'analytics' && <ChatbotAnalytics workspaceId={workspaceId} />}
        {activeTab === 'settings' && <AISettings voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} />}
      </div>
    </div>
  );
}
