import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabaseClient';
import {
  Plus,
  Bot,
  MessageSquare,
  Zap,
  Send,
  X,
  Edit2,
  Trash2,
  Save,
  ToggleLeft,
  ToggleRight,
  Search,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Settings,
  BarChart2,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Database,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Info,
  Mic,
  AudioWaveform,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../../components/admin/ui';

const _RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);
// In dev with no env var set, fall back to the known local Express port so
// relative '/api' doesn't silently hit the Vite dev server instead.
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

// ─── Live Chat Test ─────────────────────────────────────────────────────────────
import LiveChatTest, { AutoReplyRules, KnowledgeBaseEditor, ChatbotAnalytics, AISettings } from "../../components/chat/LiveChatTest";
import DraggableChatHead from "../../components/chat/DraggableChatHead";

export default function AdminChatbot() {
  const [activeTab, setActiveTab] = useState('chat');
  const [liveStats, setLiveStats] = useState(null);
  const [previewChatHead, setPreviewChatHead] = useState(false);
  const workspaceId =
    localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';

  // Hoisted Voice Config State
  const [voiceConfig, setVoiceConfig] = useState({
    enabled: true,
    voiceResponseEnabled: true,
    wakeWord: 'Hey Exponify',
    sensitivity: 50,
    language: 'auto'
  });

  useEffect(() => {
    (async () => {
      const url = workspaceId && workspaceId !== 'undefined' 
        ? `${API_BASE_URL}/ai/chatbot-analytics?workspaceId=${workspaceId}`
        : `${API_BASE_URL}/ai/chatbot-analytics`;
        
      try {
        let authHeader = {};
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = { Authorization: `Bearer ${session.access_token}` };
        }
        
        const res = await fetch(url, { headers: { ...authHeader } });
        if (res.ok) {
          const json = await res.json();
          if (json?.data || json?.totalMessages !== undefined) {
            setLiveStats(json.data || json);
          }
        }
      } catch (e) {
        // silently fail
      }
    })();
  }, [workspaceId]);

  const stats = [
    {
      icon: MessageSquare,
      label: 'Total Messages',
      value: liveStats ? liveStats.totalMessages.toLocaleString() : '—',
      color: 'var(--brand-cyan)',
    },
    {
      icon: Bot,
      label: 'AI Resolved',
      value: liveStats ? liveStats.aiResolved.toLocaleString() : '—',
      color: 'var(--success)',
    },
    {
      icon: Zap,
      label: 'Escalated',
      value: liveStats ? liveStats.escalated?.toLocaleString() || '0' : '—',
      color: 'var(--brand-gold)',
    },
    {
      icon: Brain,
      label: 'Resolution Rate',
      value: liveStats ? `${liveStats.resolutionRate}%` : '—',
      color: '#9b59b6',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--brand-cyan)]" /> AI Chatbot Management
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Configure, test, and monitor the Exponify AI assistant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPreviewChatHead(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-cyan)]/10 text-[var(--brand-cyan)] hover:bg-[var(--brand-cyan)]/20 transition-colors border border-[var(--brand-cyan)]/20"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Preview Chat Head
          </button>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-xs text-[var(--success)] font-medium">
            <Sparkles className="w-3 h-3" /> AI Active
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-2">
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                {s.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Live data</p>
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
      {activeTab === 'chat' && <LiveChatTest voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} workspaceId={workspaceId} />}
      {activeTab === 'rules' && <AutoReplyRules />}
      {activeTab === 'kb' && <KnowledgeBaseEditor />}
      {activeTab === 'analytics' && <ChatbotAnalytics workspaceId={workspaceId} />}
      {activeTab === 'settings' && <AISettings voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} />}

      {/* Floating Chat Head Preview */}
      {previewChatHead && (
        <DraggableChatHead 
          voiceConfig={voiceConfig} 
          setVoiceConfig={setVoiceConfig} 
          onClose={() => setPreviewChatHead(false)} 
        />
      )}
    </div>
  );
}
