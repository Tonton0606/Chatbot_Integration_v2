import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Bot, X, Send, User, ChevronDown, RefreshCw, Copy, Check, Info, Trash2, ArrowRight, Activity, Calendar, Layout, Search, Sparkles, Loader2, PlayCircle, StopCircle, Mic, MicOff, Settings2, ShieldAlert, Cpu, Maximize2, Minimize2, Settings, FileText, ChevronRight, Brain, Clock, Database, BookOpen, ShieldCheck, ThumbsUp, ThumbsDown, Plus, Save, AlertCircle, MessageSquare, ToggleRight, ToggleLeft, Edit2, Zap, BarChart2, CheckCircle, AudioWaveform } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../admin/ui';
import { transcribeBlobLocally } from '../../utils/localWhisper';

const _RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = _RAW ? (_RAW.endsWith('/api') ? _RAW : `${_RAW}/api`) : import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

function LiveChatTest({ voiceConfig, setVoiceConfig, isChatHead = false, moduleContext, userRole: propUserRole, workspaceId: propWorkspaceId }) {
  const initialRole = propUserRole || 'admin';
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm Exponify AI. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('');
  const endRef = useRef(null);
  
  // Voice Recognition States
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  
  const showMicError = (msg) => {
    setMicError(msg);
    setTimeout(() => setMicError(null), 4000);
  };

  const recognitionRef = useRef(null);
  const voiceConfigRef = useRef(voiceConfig);
  // Server-side STT fallback (Groq Whisper) for browsers whose Web Speech
  // backend is unreachable (e.g. Linux Chromium → onerror "network").
  const mediaRecorderRef = useRef(null);
  const serverSTTRef = useRef(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    voiceConfigRef.current = voiceConfig;
    if (recognitionRef.current && voiceConfig?.language && voiceConfig.language !== 'auto') {
      recognitionRef.current.lang = voiceConfig.language;
    }
  }, [voiceConfig]);

  // Record mic audio and transcribe it locally with Whisper (no API key, no
  // cloud). Auto-engages when Web Speech fails — works on every browser/OS.
  const startLocalSTT = async () => {
    if (isTranscribing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showMicError('Voice capture is not supported in this browser.');
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        try {
          setIsTranscribing(true);
          showMicError('Transcribing on device…');
          let transcript = await transcribeBlobLocally(blob);
          const wakeWord = voiceConfigRef.current?.wakeWord;
          if (wakeWord && transcript) {
            const words = wakeWord.split(/\s+/).filter((w) => w.trim().length > 0);
            const patterns = [wakeWord, ...words].sort((a, b) => b.length - a.length);
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            transcript = transcript.replace(new RegExp(`^(${patterns.map(esc).join('|')})[,\\s]*`, 'i'), '').trim();
          }
          if (transcript) { setInput(transcript); send(transcript); }
          else showMicError('No speech detected. Please try again.');
        } catch {
          showMicError('On-device transcription failed. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsListening(true);
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 8000);
    } catch {
      showMicError('Microphone access denied or unavailable.');
      setIsListening(false);
    }
  };
  localSTTRef.current = startLocalSTT;

  // Configuration States
  const [settings, setSettings] = useState({ model: 'llama-3.3-70b-versatile', language: 'auto' });
  const [userRole, setUserRole] = useState(initialRole);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  // For the right panel stats
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.responseTime) || {};

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '';
        if (name) {
          const firstName = name.split(' ')[0];
          setUserName(firstName);
          setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs.length === 1 && newMsgs[0].role === 'assistant') {
              newMsgs[0].text = `Hi ${firstName}! I'm Exponify AI. How can I help you today?`;
            }
            return newMsgs;
          });
        }
      }
    });

    // Fetch user avatar and name
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single().then(({ data }) => {
          if (data?.avatar_url) setUserAvatar(data.avatar_url);
          if (data?.full_name) setUserName(data.full_name);
        });
      }
    });
  }, [userRole]);

  useEffect(() => {
    // Fetch workspaces for client role dropdown
    supabase.from('workspaces').select('id, name').then(({ data }) => {
      if (data && data.length > 0) {
        setWorkspaces(data);
        setSelectedWorkspace(data[0].id);

        // Fetch current settings using the resolved workspace ID
        const wsId = propWorkspaceId || localStorage.getItem('exponify_active_client_workspace_id') || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || data[0].id;
        if (wsId) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
            const wsHeader = wsId ? { 'x-workspace-id': wsId } : {};
            fetch(`${API_BASE_URL}/ai/settings`, {
              headers: { ...authHeader, ...wsHeader }
            })
              .then(res => res.ok ? res.json() : null)
              .then(json => {
                const resData = json?.data || json;
                if (resData?.model) {
                  setSettings({ model: resData.model, language: resData.language || 'auto' });
                  if (setVoiceConfig) {
                    setVoiceConfig(p => ({
                      ...p,
                      enabled: resData.voice_enabled ?? p.enabled,
                      voiceResponseEnabled: resData.voice_response_enabled ?? p.voiceResponseEnabled,
                      wakeWord: resData.wake_word || p.wakeWord,
                      language: resData.voice_language || p.language,
                      sensitivity: resData.voice_sensitivity ?? p.sensitivity
                    }));
                  }
                }
              }).catch(() => {});
          });
        }
      }
    });
  }, []);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const updateSetting = async (key, val) => {
    setSettings(p => ({ ...p, [key]: val }));
    const wsId = propWorkspaceId || localStorage.getItem('exponify_active_client_workspace_id') || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || selectedWorkspace;
    if (!wsId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const wsHeader = wsId ? { 'x-workspace-id': wsId } : {};
      await fetch(`${API_BASE_URL}/ai/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader, ...wsHeader },
        body: JSON.stringify({ [key]: val })
      });
      window.dispatchEvent(new Event('ai-settings-updated'));
    } catch (e) {
      showMicError('Failed to sync setting. Please try again.');
    }
  };

  const handleFeedback = (idx, type) => {
    setFeedbacks(prev => ({ ...prev, [idx]: type }));
    if (type === 'not-helpful') {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) send(lastUserMsg.text);
    }
  };

  const saveKnowledgeEntry = (idx) => {
    setFeedbacks(prev => ({ ...prev, [`kb-${idx}`]: true }));
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      const lang = voiceConfigRef.current?.language && voiceConfigRef.current.language !== 'auto'
        ? voiceConfigRef.current.language : 'en-US';
      recognitionRef.current.lang = lang;

      recognitionRef.current.onresult = (event) => {
        let transcript = event.results[0][0].transcript.trim();
        const wakeWord = voiceConfigRef.current?.wakeWord;
        
        if (wakeWord) {
          // Allow the full wake word, or any single word of it (e.g. "Hey Exponify", "Hey", "Exponify")
          const words = wakeWord.split(/\s+/).filter(w => w.trim().length > 0);
          const patterns = [wakeWord, ...words].sort((a, b) => b.length - a.length);
          const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const patternString = patterns.map(escapeRegExp).join('|');
          
          const regex = new RegExp(`^(${patternString})[,\\s]*`, 'i');
          transcript = transcript.replace(regex, '').trim();
        }

        setInput(transcript);
        if (transcript) send(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        if (event.error === 'not-allowed') {
           showMicError('Microphone access denied. Please allow permissions in your browser.');
        } else if (event.error === 'no-speech') {
           showMicError('No speech detected. Please try again.');
        } else if (event.error === 'network' || event.error === 'service-not-allowed') {
           // Browser speech backend unreachable (e.g. Linux Chromium) — fall back
           // to server-side transcription (Groq Whisper), which works everywhere.
           if (serverSTTRef.current) { serverSTTRef.current(); return; }
           showMicError('Voice recognition unavailable in this browser.');
        } else if (event.error === 'audio-capture') {
           showMicError('No microphone found. Connect a microphone and try again.');
        } else {
           showMicError(`Microphone error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!voiceConfig?.enabled) {
      showMicError('Voice command is currently disabled in settings.');
      return;
    }
    if (!recognitionRef.current) {
      showMicError('Voice recognition is not supported in this browser.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setMicError(null);
        const lang = voiceConfigRef.current?.language && voiceConfigRef.current.language !== 'auto'
          ? voiceConfigRef.current.language : 'en-US';
        recognitionRef.current.lang = lang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        showMicError('Failed to start microphone. Please try again.');
      }
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        role: 'assistant',
        text: `Hi${userName ? ` ${userName}` : ''}! I'm Exponify AI. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setFeedbacks({});
  };

  const send = async (query) => {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages((p) => [
      ...p, 
      { 
        role: 'user', 
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setLoading(true);
    const start = performance.now();
    try {
      let authHeader = {};
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authHeader = { Authorization: `Bearer ${session.access_token}` };
      } catch {}

      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      
      let finalQuery = q;
      const currentWorkspace = propWorkspaceId || localStorage.getItem('exponify_active_client_workspace_id') || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';
      const wsHeader = currentWorkspace ? { 'x-workspace-id': currentWorkspace } : {};
      const chatRole = userRole === 'client' ? 'client' : 'admin';
      const endpoint = `${API_BASE_URL}/ai/chat/ask`;
      const bodyData = { query: finalQuery, history, moduleContext: moduleContext || (chatRole + '-chat'), model: settings.model, role: chatRole };

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader, ...wsHeader },
        body: JSON.stringify(bodyData),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Request failed');
      
      const timeMs = performance.now() - start;
      const responseTime = (timeMs / 1000).toFixed(2) + 's';
      const tokensUsed = Math.floor((q.length + (data.answer?.length || 0)) / 4) + ' / 700';
      const source = data.snippets?.length > 0 ? 'Knowledge Base' : 'Generated';
      const conf = data.snippets?.length > 0 ? 96 : 85;

      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          text: data.answer || 'No response.',
          route: data.route,
          routeLabel: data.routeLabel,
          snippets: data.snippets || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          responseTime,
          tokensUsed,
          source,
          confidence: `${conf}%`
        },
      ]);
      
      // Phase 5: Text-to-Speech Response
      const currentVoiceConfig = voiceConfigRef.current || voiceConfig;
      if (currentVoiceConfig?.voiceResponseEnabled) {
        const plainText = (data.answer || 'No response.').replace(/[#*`_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
        
        try {
          const ttsBody = {
            text: plainText,
            voice: currentVoiceConfig?.ttsSettings?.voice || "fil-PH-BlessicaNeural",
            rate: currentVoiceConfig?.ttsSettings?.rate || "+0%",
            pitch: currentVoiceConfig?.ttsSettings?.pitch || "+0Hz",
            volume: currentVoiceConfig?.ttsSettings?.volume || "+0%"
          };
          const ttsRes = await fetch(`${API_BASE_URL}/ai/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader, ...wsHeader },
            body: JSON.stringify(ttsBody)
          });
          if (!ttsRes.ok) throw new Error("TTS request failed");
          
          const audioBlob = await ttsRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          const revoke = () => URL.revokeObjectURL(audioUrl);
          audio.onended = revoke;
          audio.onerror = revoke;
          audio.play().catch(revoke);
        } catch (e) {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(plainText);
            
            if (voiceConfigRef.current?.language && voiceConfigRef.current.language !== 'auto') {
              utterance.lang = voiceConfigRef.current.language;
            } else {
              utterance.lang = 'en-US';
            }
            
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
        }
      }
    } catch (e) {
      setMessages((p) => [
        ...p, 
        { 
          role: 'assistant', 
          text: `Error: ${e.message}`, 
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Record mic audio and transcribe it server-side via Groq Whisper. Used as an
  // automatic fallback when the browser's Web Speech API can't reach its cloud
  // backend (the "network" error). Works on every browser/OS.
  const startServerSTT = async () => {
    if (isTranscribing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showMicError('Voice capture is not supported in this browser.');
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        try {
          setIsTranscribing(true);
          const { data: { session } } = await supabase.auth.getSession();
          const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
          const form = new FormData();
          form.append('audio', blob, 'voice.webm');
          const lang = voiceConfigRef.current?.language;
          if (lang && lang !== 'auto') form.append('language', lang);
          const res = await fetch(`${API_BASE_URL}/ai/transcribe`, { method: 'POST', headers: authHeader, body: form });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.success) throw new Error(json.error || 'Transcription failed');
          const transcript = (json.text || '').trim();
          if (transcript) { setInput(transcript); send(transcript); }
          else showMicError('No speech detected. Please try again.');
        } catch {
          showMicError('Voice transcription failed. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsListening(true);
      // Voice commands are short — auto-stop after 8s.
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 8000);
    } catch {
      showMicError('Microphone access denied or unavailable.');
      setIsListening(false);
    }
  };
  serverSTTRef.current = startServerSTT;

  const SUGGESTED = [
    'How do I enable modules for a client workspace?',
    'Where are audit logs?',
    'How do I connect a Facebook page?',
    'How do I run payroll?',
  ];

  return (
    <div className={isChatHead ? 'h-full flex flex-col' : 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'}>
      {/* Left Column: Chat */}
      <div className={`${isChatHead ? 'h-full flex-1 border-0 rounded-none' : 'lg:col-span-2 border border-[var(--border-color)] rounded-2xl h-[600px]'} flex flex-col overflow-hidden bg-[var(--bg-secondary)] relative`}>
        {/* Header */}
        {/* Header */}
        {!isChatHead && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base text-[var(--text-primary)]">Live Test Environment</h2>
                <Info className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Test how the AI assistant responds in real scenarios.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--text-primary)]">Online</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
          {messages.map((msg, idx) => (
            <div key={idx} className="flex gap-3">
              {msg.role === 'user' ? (
                userAvatar ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-[var(--brand-gold-border)] overflow-hidden ${userAvatar.includes('dicebear') ? 'bg-[var(--bg-secondary)]' : ''} mt-1`}>
                    <img src={userAvatar} className={`w-full h-full ${userAvatar.includes('dicebear') ? 'object-contain p-0.5' : 'object-cover'}`} alt="You" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-gold)] text-[#050816] flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                    You
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] flex items-center justify-center shrink-0 border border-[var(--brand-cyan-border)] mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {msg.role === 'user' ? (userName || 'You') : 'Exponify AI'}
                  </span>
                  {msg.timestamp && (
                    <span className="text-[10px] text-[var(--text-muted)]">{msg.timestamp}</span>
                  )}
                </div>
                
                <div className={`rounded-xl px-4 py-3 text-sm border relative group w-fit max-w-[90%] ${
                  msg.isError
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-[#111827] text-gray-200 border-[#1f2937]'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</pre>
                  
                  {msg.route && (
                    <div className="mt-3">
                      <a href={msg.route} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] hover:bg-[var(--brand-cyan-soft)] transition-colors">
                        Go to {msg.routeLabel || msg.route} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  )}

                  {msg.role === 'assistant' && !msg.isError && (
                    <button
                      onClick={() => copyText(msg.text, idx)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[#1f2937] text-gray-400"
                    >
                      {copied === idx ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {msg.role === 'assistant' && !msg.isError && msg.responseTime && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[var(--border-color)] pt-3 text-[11px] text-[var(--text-muted)]">
                    {!isChatHead && userRole !== 'client' && (
                      <div className="flex items-center gap-3">
                        <span>Source Used: <Badge variant="secondary" className="bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] ml-1 border-none px-1.5 py-0">{msg.source}</Badge></span>
                        <span>Confidence: <span className="text-[var(--success)] font-medium ml-1">{msg.confidence}</span></span>
                        <span>Response Time: <span className="text-[var(--brand-cyan)] font-medium ml-1">{msg.responseTime}</span></span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleFeedback(idx, 'helpful')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                          feedbacks[idx] === 'helpful' ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]' : 'border-[var(--border-color)] hover:border-[var(--success)]/50 hover:text-[var(--success)]'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" /> Helpful
                      </button>
                      <button 
                        onClick={() => handleFeedback(idx, 'not-helpful')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                          feedbacks[idx] === 'not-helpful' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'border-[var(--border-color)] hover:border-red-500/50 hover:text-red-400'
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" /> Not Helpful
                      </button>
                      {!isChatHead && userRole !== 'client' && (
                        <button 
                          onClick={() => saveKnowledgeEntry(idx)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                            feedbacks[`kb-${idx}`] ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30 text-[var(--brand-gold)]' : 'border-[var(--border-color)] hover:border-[var(--brand-gold)]/50 hover:text-[var(--brand-gold)]'
                          }`}
                        >
                          {feedbacks[`kb-${idx}`] ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />} 
                          {feedbacks[`kb-${idx}`] ? 'Saved to Knowledge Base' : 'Save as Knowledge Entry'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] flex items-center justify-center shrink-0 border border-[var(--brand-cyan-border)] mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center gap-2 text-[var(--text-muted)] text-sm h-10">
                <Loader2 className="w-4 h-4 text-[var(--brand-cyan)] animate-spin" /> AI is thinking...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="flex-shrink-0 px-3.5 py-1.5 text-xs rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-border)] hover:text-[var(--brand-cyan)] transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] shrink-0 relative">
          
          {/* Error Toast */}
          {micError && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-2 shadow-lg z-10 transition-all duration-300">
              <AlertCircle className="w-3.5 h-3.5" />
              {micError}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-3 relative"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={isListening ? "Listening..." : "Ask Exponify AI anything..."}
              disabled={loading || isListening}
              rows="2"
              className={`flex-1 px-4 py-3 ${voiceConfig?.enabled ? 'pr-24' : 'pr-14'} text-sm rounded-xl border bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-cyan-soft)] focus:border-[var(--brand-cyan-border)] disabled:opacity-50 resize-none no-scrollbar ${isListening ? 'ring-1 ring-[var(--brand-cyan)] border-[var(--brand-cyan)] animate-pulse' : ''}`}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              {voiceConfig?.enabled && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                    isListening 
                      ? 'bg-[var(--brand-cyan)] text-[#050816] border-[var(--brand-cyan)]' 
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--brand-cyan)] hover:border-[var(--brand-cyan)]'
                  }`}
                  title={isListening ? "Stop listening" : "Start voice command"}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || loading || isListening}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--brand-gold)] text-[#050816] border border-[var(--brand-gold-border)] disabled:opacity-50 hover:brightness-110 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
          <div className="mt-2 text-[10px] text-center text-[var(--text-muted)]">
            Responses are generated using the current AI model and knowledge base.
          </div>
        </div>
      </div>

      {/* Right Column: Config & Insights */}
      {!isChatHead && (
        <div className="flex flex-col gap-5">
          {/* Test Configuration */}
        <Card>
          <CardHeader className="p-4 pb-3 border-b border-[var(--border-color)]">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--brand-gold)]" /> Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-muted)] block">AI Model</label>
              <select 
                value={settings.model}
                onChange={e => updateSetting('model', e.target.value)}
                style={{ colorScheme: 'dark' }} 
                className="w-full px-3 py-2 text-xs rounded border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
              >
                <option value="llama-3.3-70b-versatile" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.3 70B Versatile (Best Quality)</option>
                <option value="llama-3.1-8b-instant" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.1 8B Instant (Fastest)</option>
                <option value="llama-3.1-70b-versatile" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.1 70B Versatile (Balanced)</option>
                <option value="qwen/qwen3-next-80b-a3b-instruct:free" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Qwen3 Next 80B (System Routing)</option>
                <option value="meta-llama/llama-3.2-3b-instruct:free" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.2 3B Instruct (Fallback Routing)</option>
                <option value="meta/llama-3.2-1b-instruct" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>NVIDIA Llama 3.2 1B (Backup)</option>
                <option value="meta/llama-3.1-8b-instruct" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>NVIDIA Llama 3.1 8B (Backup)</option>
                <option value="meta/llama-3.1-70b-instruct" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>NVIDIA Llama 3.1 70B (Backup)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-muted)] block">Response Language</label>
              <select 
                value={settings.language}
                onChange={e => updateSetting('language', e.target.value)}
                style={{ colorScheme: 'dark' }} 
                className="w-full px-3 py-2 text-xs rounded border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
              >
                <option value="auto" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Auto-detect (Recommended)</option>
                <option value="en" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>English only</option>
                <option value="tl" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Tagalog only</option>
                <option value="mixed" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Taglish (English + Tagalog)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-muted)] block">User Role</label>
              <select 
                value={userRole}
                onChange={e => {
                  setUserRole(e.target.value);
                  setMessages([{
                    role: 'assistant',
                    text: e.target.value === 'admin' ? "Hi! I'm the Exponify Admin AI. Ask me anything about the admin panel." : "Hi! I'm your Client AI Chatbot. How can I assist you today?",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  }]);
                }}
                style={{ colorScheme: 'dark' }} 
                className="w-full px-3 py-2 text-xs rounded border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
              >
                <option value="admin" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Admin</option>
                <option value="client" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Client</option>
              </select>
            </div>
            
            {userRole === 'client' && workspaces.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-[var(--border-color)]">
                <label className="text-[11px] font-medium text-[var(--text-muted)] block text-[var(--brand-gold)]">Simulate Workspace</label>
                <select 
                  value={selectedWorkspace}
                  onChange={e => setSelectedWorkspace(e.target.value)}
                  style={{ colorScheme: 'dark' }} 
                  className="w-full px-3 py-2 text-xs rounded border bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20 focus:outline-none"
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button onClick={resetConversation} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)] mt-2">
              <RefreshCw className="w-3.5 h-3.5" /> Reset Conversation
            </button>
          </CardContent>
        </Card>

        {/* Response Insights */}
        <Card className="flex-1 min-h-0">
          <CardHeader className="p-4 pb-3 border-b border-[var(--border-color)]">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-[var(--brand-gold)]" /> Response Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-4 auto-rows-max">
            <div className="space-y-1 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[var(--brand-cyan)]/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Response Time</span>
                <Clock className="w-3.5 h-3.5 text-[var(--brand-cyan)]" />
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{lastAssistantMsg.responseTime || '—'}</p>
            </div>
            
            <div className="space-y-1 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[var(--brand-gold)]/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Tokens Used</span>
                <Database className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{lastAssistantMsg.tokensUsed || '—'}</p>
            </div>

            <div className="space-y-1 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#9b59b6]/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Response Type</span>
                <BookOpen className="w-3.5 h-3.5 text-[#9b59b6]" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{lastAssistantMsg.source || '—'}</p>
            </div>

            <div className="space-y-1 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[var(--success)]/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Confidence Score</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
              </div>
              <p className="text-lg font-bold text-[var(--success)]">{lastAssistantMsg.confidence || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}

// ─── Auto-Reply Rules (Manychat-style keyword triggers) ───────────────────────
export function AutoReplyRules({ workspaceId: propWorkspaceId, pageId: propPageId }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRule, setEditRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    trigger: '',
    matchType: 'contains',
    response: '',
    quickReplies: '',
    active: true,
    priority: 0,
  });

  const apiBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const baseUrl = apiBase ? (apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`) : import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

  const fetchRules = useCallback(async () => {
    if (!propWorkspaceId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const pageQuery = propPageId ? `/${propPageId}` : '';
      const res = await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${propWorkspaceId}${pageQuery}`, { headers });
      const json = await res.json();
      if (json.rules) setRules(json.rules);
    } catch {
      // silently fail — rules will be empty
    } finally {
      setLoading(false);
    }
  }, [propWorkspaceId, propPageId, baseUrl]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const save = async () => {
    if (!form.trigger.trim() || !form.response.trim()) return;
    const quickRepliesArr = form.quickReplies
      .split(',').map(s => s.trim()).filter(Boolean)
      .map(title => ({ title, payload: title.toLowerCase().replace(/\s+/g, '_') }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        Authorization: `Bearer ${session?.access_token || ''}`,
        'Content-Type': 'application/json',
      };

      if (editRule) {
        await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${editRule.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({
            triggerKeyword: form.trigger,
            triggerMatchType: form.matchType,
            responseText: form.response,
            quickReplies: quickRepliesArr,
            isActive: form.active,
            priority: form.priority,
          }),
        });
      } else {
        await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules`, {
          method: 'POST', headers,
          body: JSON.stringify({
            workspaceId: propWorkspaceId,
            pageId: propPageId || null,
            triggerKeyword: form.trigger,
            triggerMatchType: form.matchType,
            responseText: form.response,
            quickReplies: quickRepliesArr,
            isActive: form.active,
            priority: form.priority,
          }),
        });
      }
      await fetchRules();
    } catch {
      // error handling
    }
    setEditRule(null);
    setForm({ trigger: '', matchType: 'contains', response: '', quickReplies: '', active: true, priority: 0 });
    setShowForm(false);
  };

  const startEdit = (rule) => {
    setEditRule(rule);
    const qr = Array.isArray(rule.quick_replies)
      ? rule.quick_replies.map(r => r.title || r).join(', ')
      : '';
    setForm({
      trigger: rule.trigger_keyword || rule.trigger || '',
      matchType: rule.trigger_match_type || 'contains',
      response: rule.response_text || rule.response || '',
      quickReplies: qr,
      active: rule.is_active ?? rule.active ?? true,
      priority: rule.priority || 0,
    });
    setShowForm(true);
  };

  const deleteRule = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      setRules((p) => p.filter((r) => r.id !== id));
    } catch {
      // error
    }
  };

  const toggleRule = async (rule) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${rule.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.is_active }),
      });
      setRules((p) => p.map((r) => r.id === rule.id ? { ...r, is_active: !rule.is_active } : r));
    } catch {
      // error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Rules trigger keyword-matched auto-replies before the AI responds. Higher priority = checked first.
        </p>
        <Button
          icon={Plus}
          onClick={() => {
            setEditRule(null);
            setForm({ trigger: '', matchType: 'contains', response: '', quickReplies: '', active: true, priority: 0 });
            setShowForm(true);
          }}
        >
          Add Rule
        </Button>
      </div>

      {showForm && (
        <Card className="border-[var(--brand-cyan-border)]">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">
              {editRule ? 'Edit Rule' : 'New Auto-Reply Rule'}
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Trigger keyword / phrase
              </label>
              <input
                value={form.trigger}
                onChange={(e) => setForm((p) => ({ ...p, trigger: e.target.value }))}
                placeholder="e.g. pricing, how to connect, reset password"
                className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Match type</label>
                <select
                  value={form.matchType}
                  onChange={(e) => setForm((p) => ({ ...p, matchType: e.target.value }))}
                  style={{ colorScheme: 'dark' }}
                  className="px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
                >
                  <option value="contains" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Contains</option>
                  <option value="exact" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Exact match</option>
                  <option value="starts_with" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Starts with</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Priority</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value, 10) || 0 }))}
                  className="w-20 px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Auto-reply response
              </label>
              <textarea
                value={form.response}
                onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))}
                placeholder="Enter the response to send when this keyword is matched..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)] resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Quick replies (comma-separated, optional)
              </label>
              <input
                value={form.quickReplies}
                onChange={(e) => setForm((p) => ({ ...p, quickReplies: e.target.value }))}
                placeholder="e.g. View Pricing, Book Demo, Talk to Agent"
                className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-gold)] text-[#050816] flex items-center gap-1.5 hover:brightness-110"
                >
                  <Save className="w-3.5 h-3.5" /> Save Rule
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p>Loading rules...</p>
          </div>
        ) : rules.map((rule) => (
          <Card key={rule.id} className={`transition-opacity ${rule.is_active ? '' : 'opacity-60'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${rule.is_active ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
                      "{rule.trigger_keyword}"
                    </span>
                    <Badge className="text-xs">{rule.trigger_match_type}</Badge>
                    {rule.priority > 0 && (
                      <Badge className="text-xs">P{rule.priority}</Badge>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {rule.match_count || 0} matches
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {rule.response_text}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleRule(rule)}
                    className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]"
                  >
                    {rule.is_active ? (
                      <ToggleRight className="w-4 h-4 text-[var(--success)]" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(rule)}
                    className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && rules.length === 0 && (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No auto-reply rules yet. Add your first rule above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_KB = [
  {
    id: 'enable-modules',
    title: 'Enable client modules',
    keywords: 'enable, modules, client, workspace, toggle, access',
    excerpt:
      'Go to Admin > Workspace Administration, select the client workspace, then enable the required modules in the module access panel.',
    active: true,
  },
  {
    id: 'reset-admin-access',
    title: 'Reset admin access',
    keywords: 'reset, admin, access, restore, unlock, account',
    excerpt:
      'Open Admin > Account Control, search for the user, click Edit, then set role to Admin and status to Active.',
    active: true,
  },
  {
    id: 'audit-logs',
    title: 'View audit logs',
    keywords: 'audit, logs, activity, history, track, changes',
    excerpt:
      'Audit logs are in Admin > Audit Logs. Use filters to view actions by date, user, and module. Export to CSV for compliance.',
    active: true,
  },
  {
    id: 'facebook-connect',
    title: 'Connect Facebook page',
    keywords: 'facebook, FB, page, connect, messenger, social, meta',
    excerpt:
      'Connect Facebook pages in Admin > Facebook Connect. Authorize via Facebook login, select pages, and enable messenger auto-reply.',
    active: true,
  },
  {
    id: 'payroll-run',
    title: 'Run payroll',
    keywords: 'payroll, salary, pay, run payroll, compute, wages',
    excerpt:
      'Go to Admin > Payroll, select the pay period, review deductions and contributions, then click Run Payroll. Export pay slips from there.',
    active: true,
  },
];

// ─── Knowledge Base Editor ──────────────────────────────────────────────────────
export function KnowledgeBaseEditor() {
  const [entries, setEntries] = useState(DEFAULT_KB);
  const [editEntry, setEditEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', keywords: '', excerpt: '', active: true });
  const [search, setSearch] = useState('');

  const filtered = entries.filter(
    (e) =>
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.keywords.toLowerCase().includes(search.toLowerCase())
  );

  const save = () => {
    if (!form.title.trim() || !form.excerpt.trim()) return;
    const entry = { ...form, id: editEntry?.id || `kb_${Date.now()}` };
    if (editEntry) {
      setEntries((p) => p.map((e) => (e.id === editEntry.id ? entry : e)));
      setEditEntry(null);
    } else {
      setEntries((p) => [...p, entry]);
    }
    setForm({ title: '', keywords: '', excerpt: '', active: true });
    setShowForm(false);
  };

  const startEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      title: entry.title,
      keywords: entry.keywords,
      excerpt: entry.excerpt,
      active: entry.active,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
          />
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            setEditEntry(null);
            setForm({ title: '', keywords: '', excerpt: '', active: true });
            setShowForm(true);
          }}
        >
          Add Entry
        </Button>
      </div>

      {showForm && (
        <Card className="border-[var(--brand-cyan-border)]">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">
              {editEntry ? 'Edit KB Entry' : 'New Knowledge Base Entry'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Entry title"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Keywords (comma-separated)
                </label>
                <input
                  value={form.keywords}
                  onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))}
                  placeholder="keyword1, keyword2, phrase"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Answer / Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                placeholder="Enter the answer that will be shown when this entry matches..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)] resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-gold)] text-[#050816] flex items-center gap-1.5 hover:brightness-110"
                >
                  <Save className="w-3.5 h-3.5" /> Save Entry
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((entry) => (
          <Card key={entry.id} className={entry.active ? '' : 'opacity-60'}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-[var(--brand-cyan)] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{entry.title}</span>
                    {!entry.active && <Badge className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">
                    Keywords: {entry.keywords}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {entry.excerpt}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEntries((p) => p.filter((e) => e.id !== entry.id))}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics ──────────────────────────────────────────────────────────────────
export function ChatbotAnalytics({ workspaceId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let targetWorkspace = workspaceId;
      try {
        if (!targetWorkspace) {
          const { data } = await supabase.from('workspaces').select('id').limit(1);
          if (data && data.length > 0) {
            targetWorkspace = data[0].id;
          }
        }

        if (!targetWorkspace) {
          setStats({ totalMessages: 0, aiResolved: 0, escalated: 0, resolutionRate: 0, topQueries: [] });
          setLoading(false);
          return;
        }

        let authHeader = {};
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = { Authorization: `Bearer ${session.access_token}` };
        }

        // Query real conversation data from Supabase via AI health + analytics endpoint
        const res = await fetch(`${API_BASE_URL}/ai/chatbot-analytics?workspaceId=${targetWorkspace}`, {
          headers: { ...authHeader }
        });
        if (res.ok) {
          const json = await res.json();
          setStats(json.data || json);
        } else {
          // Graceful fallback: show zeros instead of fake numbers
          setStats({
            totalMessages: 0,
            aiResolved: 0,
            escalated: 0,
            resolutionRate: 0,
            topQueries: [],
          });
        }
      } catch {
        setStats({
          totalMessages: 0,
          aiResolved: 0,
          escalated: 0,
          resolutionRate: 0,
          topQueries: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  const statCards = stats
    ? [
        {
          label: 'Total Messages',
          value: stats.totalMessages?.toLocaleString() || '0',
          color: 'var(--brand-cyan)',
        },
        {
          label: 'AI Resolved',
          value: stats.aiResolved?.toLocaleString() || '0',
          color: 'var(--success)',
        },
        {
          label: 'Escalated',
          value: stats.escalated?.toLocaleString() || '0',
          color: 'var(--brand-gold)',
        },
        {
          label: 'Resolution Rate',
          value: stats.resolutionRate ? `${stats.resolutionRate}%` : '—',
          color: '#9b59b6',
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-10 text-[var(--text-muted)]">
          <RefreshCw className="animate-spin mx-auto mb-2 w-5 h-5" />
          Loading real analytics…
        </div>
      ) : (
        <>
          {stats?.totalMessages === 0 && (
            <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              No chatbot data yet — analytics will populate as users interact with the chatbot.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Live data</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(stats?.topQueries || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Queries (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border-color)]">
                  {(stats.topQueries || []).map((q, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs font-mono text-[var(--text-muted)] w-5">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm text-[var(--text-primary)]">{q.query}</p>
                      <div className="flex items-center gap-2">
                        {q.resolved ? (
                          <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
                        )}
                        <span className="text-xs text-[var(--text-muted)]">{q.count}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(stats?.topQueries || []).length === 0 && !loading && stats?.totalMessages === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-[var(--text-muted)] text-sm">
                Top queries will appear here as users chat with the AI assistant.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Edge TTS Voice List ─────────────────────────────────────────────────────────
export const EDGE_TTS_VOICES = [
  { id: "fil-PH-BlessicaNeural", name: "Blessica", locale: "fil-PH", language: "Filipino / Tagalog", category: "filipino", gender: "Female", recommended: true },
  { id: "fil-PH-AngeloNeural", name: "Angelo", locale: "fil-PH", language: "Filipino / Tagalog", category: "filipino", gender: "Male", recommended: true },
  { id: "en-US-JennyNeural", name: "Jenny", locale: "en-US", language: "English", category: "english", gender: "Female", recommended: true },
  { id: "en-US-GuyNeural", name: "Guy", locale: "en-US", language: "English", category: "english", gender: "Male", recommended: true },
  { id: "en-US-EmmaNeural", name: "Emma", locale: "en-US", language: "English", category: "english", gender: "Female", recommended: true },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma Multilingual", locale: "en-US", language: "Multilingual", category: "multilingual", gender: "Female", recommended: true },
  { id: "en-US-AvaMultilingualNeural", name: "Ava Multilingual", locale: "en-US", language: "Multilingual", category: "multilingual", gender: "Female", recommended: true },
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew Multilingual", locale: "en-US", language: "Multilingual", category: "multilingual", gender: "Male", recommended: true }
];

// ─── AI Settings ────────────────────────────────────────────────────────────────
export function AISettings({ voiceConfig, setVoiceConfig }) {
  const [activeInnerTab, setActiveInnerTab] = useState('general');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [settings, setSettings] = useState({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 700,
    language: 'auto',
    fallbackEnabled: true,
    routingEnabled: true,
    historyDepth: 6,
    chatHeadEnabled: true,
    chatHeadConfig: {
      welcomeMessage: "Hi, I'm Exponify AI. How can I help you?",
      position: 'bottom-right',
      theme: 'auto',
    }
  });
  const [healthStatus, setHealthStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Real Voice Command State for Preview
  const [isListeningTest, setIsListeningTest] = useState(false);
  const recognitionRef = useRef(null);
  const voiceConfigRef = useRef(voiceConfig);
  const [previewTranscript, setPreviewTranscript] = useState('');
  const [previewResponse, setPreviewResponse] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '');

  useEffect(() => {
    if (!workspaceId) {
      supabase.from('workspaces').select('id').limit(1).then(({ data }) => {
        if (data && data.length > 0) {
          setWorkspaceId(data[0].id);
        }
      });
    }
  }, [workspaceId]);

  useEffect(() => {
    voiceConfigRef.current = voiceConfig;
  }, [voiceConfig]);

  const getAuthHeader = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };
    } catch {}
    return {};
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = async (event) => {
        let transcript = event.results[0][0].transcript;
        
        // Remove wake word if spoken
        const currentVoiceConfig = voiceConfigRef.current;
        if (currentVoiceConfig?.wakeWord) {
          const wakeWord = currentVoiceConfig.wakeWord.toLowerCase();
          const words = wakeWord.split(' ');
          const patterns = [wakeWord, ...words].sort((a, b) => b.length - a.length);
          const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const patternString = patterns.map(escapeRegExp).join('|');
          const regex = new RegExp(`^(${patternString})[,\\s]*`, 'i');
          transcript = transcript.replace(regex, '').trim();
        }

        setPreviewTranscript(transcript);
        setIsListeningTest(false);
        if (!transcript) return;

        setPreviewLoading(true);
        setPreviewResponse('');

        try {
          const authHeader = await getAuthHeader();
          const wsHeader = workspaceId ? { 'x-workspace-id': workspaceId } : {};
          const res = await fetch(`${API_BASE_URL}/ai/chat/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader, ...wsHeader },
            body: JSON.stringify({ query: transcript, role: 'admin' })
          });
          
          if (res.ok) {
            const data = await res.json();
            const textResponse = data.answer || "I processed your request but got an empty response.";
            setPreviewResponse(textResponse);

            if (currentVoiceConfig?.voiceResponseEnabled !== false) {
              const plainText = textResponse.replace(/[#*`_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
              
              // Edge TTS Playback Flow with Browser Fallback
              try {
                const ttsBody = {
                  text: plainText,
                  voice: currentVoiceConfig?.ttsSettings?.voice || "fil-PH-BlessicaNeural",
                  rate: currentVoiceConfig?.ttsSettings?.rate || "+0%",
                  pitch: currentVoiceConfig?.ttsSettings?.pitch || "+0Hz",
                  volume: currentVoiceConfig?.ttsSettings?.volume || "+0%"
                };
                
                const ttsRes = await fetch(`${API_BASE_URL}/ai/tts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeader, ...wsHeader },
                  body: JSON.stringify(ttsBody)
                });
                
                if (!ttsRes.ok) throw new Error("TTS request failed");
                
                const audioBlob = await ttsRes.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                const revoke = () => URL.revokeObjectURL(audioUrl);
                audio.onended = revoke;
                audio.onerror = revoke;
                try {
                  await audio.play();
                } catch {
                  revoke();
                }
              } catch (ttsErr) {
                const utterance = new SpeechSynthesisUtterance(plainText);
                utterance.pitch = 1.05;
                utterance.rate = 1.05;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
              }
            }
          } else {
            setPreviewResponse("Sorry, there was an error processing your request.");
          }
        } catch (err) {
          setPreviewResponse("Could not reach the server.");
        } finally {
          setPreviewLoading(false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setIsListeningTest(false);
        setPreviewLoading(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone access denied. Please allow permissions in your browser.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please try again.');
        } else if (event.error === 'network' || event.error === 'service-not-allowed') {
          setVoiceError('Voice recognition unavailable: this browser cannot reach its speech service. Use Google Chrome on a connected device (not supported in many Linux/Chromium builds).');
        } else if (event.error === 'audio-capture') {
          setVoiceError('No microphone found. Connect a microphone and try again.');
        } else {
          setVoiceError(`Voice error: ${event.error}`);
        }
        setTimeout(() => setVoiceError(null), 6000);
      };

      recognitionRef.current.onend = () => {
        setIsListeningTest(false);
      };
    }
  }, []);

  const loadSettings = async () => {
    if (!workspaceId) return;
    try {
      const authHeader = await getAuthHeader();
      const wsHeader = workspaceId ? { 'x-workspace-id': workspaceId } : {};
      const res = await fetch(`${API_BASE_URL}/ai/settings`, {
        headers: { ...authHeader, ...wsHeader },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data.model) {
          setSettings({
            model: data.model,
            temperature: data.temperature !== undefined ? Number(data.temperature) : 0.3,
            maxTokens: data.max_tokens || 700,
            language: data.language || 'auto',
            fallbackEnabled: data.fallback_enabled ?? true,
            routingEnabled: data.routing_enabled ?? true,
            historyDepth: data.history_depth || 6,
            chatHeadEnabled: data.chat_head_enabled ?? true,
            chatHeadConfig: data.chat_head_config || {
              welcomeMessage: "Hi, I'm Exponify AI. How can I help you?",
              position: 'bottom-right',
              theme: 'auto'
            },
          });
          setVoiceConfig(p => ({
            ...p,
            enabled: data.voice_enabled ?? p.enabled,
            voiceResponseEnabled: data.voice_response_enabled ?? p.voiceResponseEnabled,
            wakeWord: data.wake_word || p.wakeWord,
            language: data.voice_language || p.language,
            sensitivity: data.voice_sensitivity ?? p.sensitivity,
            ttsSettings: data.tts_settings || {
              engine: "edge",
              fallback: "browser",
              category: "auto",
              gender: "All",
              voice: "fil-PH-BlessicaNeural",
              rate: "+0%",
              pitch: "+0Hz",
              volume: "+0%"
            }
          }));
        }
      }
    } catch (err) {
      showToast('Error loading settings', 'error');
    }
  };

  const saveSettings = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const authHeader = await getAuthHeader();
      const wsHeader = workspaceId ? { 'x-workspace-id': workspaceId } : {};
      const res = await fetch(`${API_BASE_URL}/ai/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeader,
          ...wsHeader
        },
        body: JSON.stringify({
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          language: settings.language,
          fallback_enabled: settings.fallbackEnabled,
          routing_enabled: settings.routingEnabled,
          history_depth: settings.historyDepth,
          chat_head_enabled: settings.chatHeadEnabled,
          chat_head_config: settings.chatHeadConfig,
          voice_enabled: voiceConfig.enabled,
          voice_response_enabled: voiceConfig.voiceResponseEnabled,
          wake_word: voiceConfig.wakeWord,
          voice_language: voiceConfig.language,
          voice_sensitivity: voiceConfig.sensitivity,
          tts_settings: voiceConfig.ttsSettings
        })
      });
      if (!res.ok) throw new Error('Failed to save settings');
      showToast('Settings saved successfully!');
      window.dispatchEvent(new Event('ai-settings-updated'));
    } catch (err) {
      showToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const checkHealth = async () => {
    setTesting(true);
    try {
      const authHeader = await getAuthHeader();
      const wsHeader = workspaceId ? { 'x-workspace-id': workspaceId } : {};
      const r = await fetch(`${API_BASE_URL}/ai/health`, {
        headers: { ...authHeader, ...wsHeader }
      });
      const data = await r.json();
      setHealthStatus(data);
    } catch (e) {
      setHealthStatus({ status: 'unhealthy', error: e.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkHealth();
    loadSettings();
  }, [workspaceId]);

  const set = (key, val) => setSettings((p) => ({ ...p, [key]: val }));
  const setChatHeadConfig = (key, val) => setSettings((p) => ({ ...p, chatHeadConfig: { ...p.chatHeadConfig, [key]: val } }));
  const setTTSConfig = (key, val) => setVoiceConfig((p) => {
    const newTTS = { ...(p.ttsSettings || {}), [key]: val };
    
    const cat = newTTS.category || 'auto';
    const gen = newTTS.gender || 'All';

    // Auto-select the first valid voice matching the new filters
    if (key === 'category' || key === 'gender') {
      const firstMatch = EDGE_TTS_VOICES.find(v => 
        (cat === 'auto' ? true : v.category === cat) &&
        (gen === 'All' ? true : v.gender === gen)
      );
      if (firstMatch) {
        newTTS.voice = firstMatch.id;
      }
    }
    
    return { ...p, ttsSettings: newTTS };
  });

  const handlePreviewVoice = async () => {
    if (!voiceConfig?.ttsSettings?.voice) return;
    
    const previewTexts = {
      filipino: "Kamusta! Ako ang iyong AI assistant.",
      english: "Hello! I am your AI assistant.",
      multilingual: "Hello! Kamusta! I am your AI assistant.",
      auto: "Hello! Kamusta! I am your AI assistant."
    };
    
    const cat = voiceConfig.ttsSettings.category || "auto";
    const textToSay = previewTexts[cat] || previewTexts.auto;
    
    setPreviewResponse("Previewing Voice...");
    try {
      const authHeader = await getAuthHeader();
      const wsHeader = workspaceId ? { 'x-workspace-id': workspaceId } : {};
      const ttsRes = await fetch(`${API_BASE_URL}/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader, ...wsHeader },
        body: JSON.stringify({
          text: textToSay,
          voice: voiceConfig.ttsSettings.voice,
          rate: voiceConfig.ttsSettings.rate || "+0%",
          pitch: voiceConfig.ttsSettings.pitch || "+0Hz",
          volume: voiceConfig.ttsSettings.volume || "+0%"
        })
      });
      if (!ttsRes.ok) throw new Error("TTS request failed");
      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      const revoke = () => URL.revokeObjectURL(audioUrl);
      audio.onended = revoke;
      audio.onerror = revoke;
      try {
        await audio.play();
      } catch {
        revoke();
      }
      setPreviewResponse("");
    } catch (err) {
      const utterance = new SpeechSynthesisUtterance(textToSay);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setPreviewResponse("");
    }
  };

  const currentCategory = voiceConfig?.ttsSettings?.category || 'auto';
  const currentGender = voiceConfig?.ttsSettings?.gender || 'All';
  const filteredVoices = EDGE_TTS_VOICES.filter(v => {
    const catMatch = currentCategory === 'auto' ? true : v.category === currentCategory;
    const genMatch = currentGender === 'All' ? true : v.gender === currentGender;
    return catMatch && genMatch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header section matching screenshot */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--brand-gold)]" /> AI Settings
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Configure how the AI assistant behaves and interacts with your workspace.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-6">
        {/* Sidebar */}
        <div className="w-full md:w-56 space-y-1 flex-shrink-0">
          <button 
             onClick={() => setActiveInnerTab('general')}
             className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
               activeInnerTab === 'general' 
                 ? 'border-l-[3px] border-[var(--brand-gold)] text-[var(--brand-gold)]' 
                 : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l-[3px] border-transparent'
             }`}
          >
            <Settings className="w-4 h-4" /> General
          </button>
          <button 
             onClick={() => setActiveInnerTab('voice')}
             className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
               activeInnerTab === 'voice' 
                 ? 'border-l-[3px] border-[var(--brand-gold)] text-[var(--brand-gold)]' 
                 : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l-[3px] border-transparent'
             }`}
          >
            <Mic className="w-4 h-4" /> Voice Command
          </button>
          <button 
             onClick={() => setActiveInnerTab('chathead')}
             className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
               activeInnerTab === 'chathead' 
                 ? 'border-l-[3px] border-[var(--brand-gold)] text-[var(--brand-gold)]' 
                 : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l-[3px] border-transparent'
             }`}
          >
            <MessageSquare className="w-4 h-4" /> Chat Head
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeInnerTab === 'general' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[var(--brand-cyan)]" /> AI Service Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {testing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-cyan)]" />
                      ) : (healthStatus?.data?.status === 'operational' || healthStatus?.status === 'operational') ? (
                        <CheckCircle className="w-4 h-4 text-[var(--brand-cyan)]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {testing
                            ? 'Checking...'
                            : (healthStatus?.data?.status === 'operational' || healthStatus?.status === 'operational')
                              ? 'All Systems Operational'
                              : 'Service Issue Detected'}
                        </p>
                        {(healthStatus?.data?.latencyMs || healthStatus?.latencyMs || healthStatus?.latency) && (
                          <p className="text-xs text-[var(--text-muted)]">
                            Latency: {healthStatus?.data?.latencyMs || healthStatus?.latencyMs || healthStatus?.latency} ms
                          </p>
                        )}
                        {(healthStatus?.error || healthStatus?.data?.error) && (
                          <p className="text-xs text-red-400">{healthStatus?.error || healthStatus?.data?.error}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={checkHealth}
                      disabled={testing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                  {!(healthStatus?.data?.status || healthStatus?.status) && !testing && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                      Configure GROQ_API_KEY or ADMIN_CHATBOT_KEY in server environment variables to enable
                      live AI responses.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Model Configuration</CardTitle>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-gold)] text-[#050816] hover:brightness-110 disabled:opacity-50 transition-all font-medium"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--text-muted)]">AI Model</label>
                      <select
                        value={settings.model}
                        onChange={(e) => set('model', e.target.value)}
                        style={{ colorScheme: 'dark' }}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-gold)] transition-colors"
                      >
                        <option value="llama-3.3-70b-versatile" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>
                          Llama 3.3 70B Versatile (Best Quality)
                        </option>
                        <option value="llama-3.1-8b-instant" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.1 8B Instant (Fastest)</option>
                        <option value="llama-3.1-70b-versatile" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.1 70B Versatile (Balanced)</option>
                        <option value="qwen/qwen3-next-80b-a3b-instruct:free" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Qwen3 Next 80B (System Routing)</option>
                        <option value="meta-llama/llama-3.2-3b-instruct:free" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Llama 3.2 3B Instruct (Fallback Routing)</option>
                        <option value="meta/llama-3.2-1b-instruct" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>NVIDIA Llama 3.2 1B (Backup)</option>
                        <option value="meta/llama-3.1-8b-instruct" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>NVIDIA Llama 3.1 8B (Backup)</option>
                        <option value="meta/llama-3.1-70b-instruct" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>NVIDIA Llama 3.1 70B (Backup)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--text-muted)]">
                        Response Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => set('language', e.target.value)}
                        style={{ colorScheme: 'dark' }}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-gold)] transition-colors"
                      >
                        <option value="auto" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Auto-detect (Recommended)</option>
                        <option value="en" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>English only</option>
                        <option value="tl" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Tagalog only</option>
                        <option value="mixed" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Taglish (English + Tagalog)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--text-muted)]">
                        Temperature ({settings.temperature})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.temperature}
                        onChange={(e) => set('temperature', parseFloat(e.target.value))}
                        className="w-full accent-[var(--brand-gold)]"
                      />
                      <div className="flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--text-muted)]">
                        Max Response Tokens ({settings.maxTokens})
                      </label>
                      <input
                        type="range"
                        min="200"
                        max="1500"
                        step="100"
                        value={settings.maxTokens}
                        onChange={(e) => set('maxTokens', parseInt(e.target.value))}
                        className="w-full accent-[var(--brand-gold)]"
                      />
                      <div className="flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Concise</span>
                        <span>Detailed</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 mt-2 border-t border-[var(--border-color)]">
                    {[
                      {
                        key: 'fallbackEnabled',
                        label: 'Fallback to KB when AI unavailable',
                        desc: 'Use static knowledge base entries if AI service is down',
                      },
                      {
                        key: 'routingEnabled',
                        label: 'Include navigation routes in responses',
                        desc: 'AI includes deep links to relevant admin pages in answers',
                      },
                      {
                        key: 'chatHeadEnabled',
                        label: 'Enable Chat Head Globally',
                        desc: 'Allow workspaces to use the floating Chat Head interface',
                      },
                    ].map((opt) => (
                      <label key={opt.key} className="flex items-start gap-3 cursor-pointer group">
                        <div className={`mt-0.5 relative flex items-center justify-center w-4 h-4 rounded border ${settings[opt.key] ? 'bg-[var(--brand-cyan)] border-[var(--brand-cyan)]' : 'border-[var(--border-color)] group-hover:border-[var(--brand-cyan)]'} transition-colors`}>
                           {settings[opt.key] && <Check className="w-3 h-3 text-[#050816]" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={settings[opt.key]}
                          onChange={(e) => set(opt.key, e.target.checked)}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-cyan)] transition-colors">{opt.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeInnerTab === 'voice' && (
            <Card className="border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)]/50 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border-color)] pb-4">
                 <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-[var(--text-primary)]" />
                    <div>
                       <CardTitle className="text-sm font-medium text-[var(--text-primary)]">Voice Command</CardTitle>
                       <p className="text-xs text-[var(--text-muted)] mt-0.5">Enable and configure voice command for hands-free interaction.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-4 border-r border-[var(--border-color)]">
                       <div 
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${voiceConfig?.enabled ? 'bg-[var(--brand-cyan)]' : 'bg-[#334155] hover:bg-[#475569]'}`} 
                          onClick={() => setVoiceConfig(p => ({ ...p, enabled: !p.enabled }))}
                       >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${voiceConfig?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                       </div>
                       <span className="text-xs font-semibold text-[var(--text-primary)] w-12">{voiceConfig?.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-gold)] text-[#050816] hover:brightness-110 disabled:opacity-50 transition-all font-medium"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
                    
                    {/* Left Column Settings */}
                    <div className="p-6 space-y-8 border-b lg:border-b-0 lg:border-r border-[var(--border-color)]">
                       
                       {/* Enable Voice Command */}
                       <div className="flex items-center justify-between">
                          <div>
                             <h4 className="text-sm font-medium text-[var(--text-primary)]">Enable Voice Command</h4>
                             <p className="text-xs text-[var(--text-muted)] mt-1">Allow users to interact with the AI assistant using voice.</p>
                          </div>
                          <div 
                             className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${voiceConfig?.enabled ? 'bg-[var(--brand-cyan)]' : 'bg-[#334155] hover:bg-[#475569]'}`} 
                             onClick={() => setVoiceConfig(p => ({ ...p, enabled: !p.enabled }))}
                          >
                             <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${voiceConfig?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                       </div>
                       
                       {/* Language */}
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                             <h4 className="text-sm font-medium text-[var(--text-primary)]">Language</h4>
                             <p className="text-xs text-[var(--text-muted)] mt-1">Select the primary language for voice recognition.</p>
                          </div>
                          <div className="relative min-w-[160px]">
                             <select 
                               value={voiceConfig?.language}
                               onChange={(e) => setVoiceConfig(p => ({ ...p, language: e.target.value }))}
                               className="w-full pl-3 pr-8 py-2 text-xs font-medium rounded-lg border bg-transparent text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors appearance-none" 
                               disabled={!voiceConfig?.enabled}
                             >
                                <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="auto">🌐 Auto-detect</option>
                                <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="en-US">English (US)</option>
                                <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="tl-PH">Tagalog</option>
                             </select>
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                               <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] rotate-90" />
                             </div>
                          </div>
                       </div>

                       {/* Wake Word */}
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                             <h4 className="text-sm font-medium text-[var(--text-primary)]">Wake Word</h4>
                             <p className="text-xs text-[var(--text-muted)] mt-1">Say this word or phrase to activate voice listening.</p>
                          </div>
                          <input 
                            type="text" 
                            value={voiceConfig?.wakeWord} 
                            onChange={(e) => setVoiceConfig(p => ({ ...p, wakeWord: e.target.value }))} 
                            disabled={!voiceConfig?.enabled}
                            className="w-full sm:w-48 px-3 py-2 text-xs font-medium rounded-lg border bg-transparent text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors disabled:opacity-50 text-center sm:text-left" 
                          />
                       </div>

                       {/* Listening Sensitivity */}
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 pr-6">
                             <h4 className="text-sm font-medium text-[var(--text-primary)]">Listening Sensitivity</h4>
                             <p className="text-xs text-[var(--text-muted)] mt-1">Adjust how easily the AI listens for voice commands.</p>
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-48 opacity-100 transition-opacity" style={{ opacity: voiceConfig?.enabled ? 1 : 0.5 }}>
                             <input 
                               type="range" 
                               min="0" max="100" 
                               value={voiceConfig?.sensitivity} 
                               onChange={(e) => setVoiceConfig(p => ({ ...p, sensitivity: e.target.value }))} 
                               disabled={!voiceConfig?.enabled}
                               className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none accent-[var(--brand-cyan)] outline-none" 
                             />
                             <span className="text-xs font-bold text-[var(--text-primary)] w-12 text-right tracking-wide">
                               {voiceConfig?.sensitivity > 66 ? 'High' : voiceConfig?.sensitivity > 33 ? 'Medium' : 'Low'}
                             </span>
                          </div>
                       </div>

                       {/* Voice Response */}
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 pr-6">
                             <h4 className="text-sm font-medium text-[var(--text-primary)]">Voice Response</h4>
                             <p className="text-xs text-[var(--text-muted)] mt-1">Allow the AI assistant to read its responses aloud.</p>
                          </div>
                          <div 
                             className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${voiceConfig?.voiceResponseEnabled ? 'bg-[var(--brand-cyan)]' : 'bg-[#334155] hover:bg-[#475569]'}`} 
                             onClick={() => setVoiceConfig(p => ({ ...p, voiceResponseEnabled: !p.voiceResponseEnabled }))}
                             style={{ opacity: voiceConfig?.enabled ? 1 : 0.5, pointerEvents: voiceConfig?.enabled ? 'auto' : 'none' }}
                          >
                             <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${voiceConfig?.voiceResponseEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                       </div>

                       {/* Info Alert */}
                       <div className="mt-8 p-3.5 rounded-lg bg-[var(--brand-cyan)]/10 border border-[var(--brand-cyan)]/20 flex items-start gap-3 text-xs">
                          <Info className="w-4 h-4 text-[var(--brand-cyan)] flex-shrink-0 mt-0.5" />
                          <p className="leading-relaxed text-[var(--text-secondary)]">Voice commands are processed securely and are not stored after processing. This feature works best in a quiet environment.</p>
                       </div>

                       {voiceConfig?.voiceResponseEnabled && (
                         <div className="pt-6 mt-6 border-t border-[var(--border-color)] space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                              <h4 className="text-sm font-medium text-[var(--brand-cyan)]">Text-to-Speech Settings</h4>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Language Category</label>
                                <div className="relative">
                                  <select 
                                    value={voiceConfig?.ttsSettings?.category || 'auto'}
                                    onChange={(e) => setTTSConfig('category', e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 text-xs font-medium rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors appearance-none" 
                                  >
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="auto">Auto-detect</option>
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="filipino">Filipino / Tagalog</option>
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="english">English</option>
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="multilingual">Multilingual</option>
                                  </select>
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>
                              <div className="w-full sm:w-32 space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Gender</label>
                                <div className="relative">
                                  <select 
                                    value={voiceConfig?.ttsSettings?.gender || 'All'}
                                    onChange={(e) => setTTSConfig('gender', e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 text-xs font-medium rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors appearance-none" 
                                  >
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="All">All</option>
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="Female">Female</option>
                                     <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="Male">Male</option>
                                  </select>
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            {/* Voice Selector */}
                            <div className="space-y-1.5">
                               <label className="text-xs font-medium text-[var(--text-muted)]">Voice Profile</label>
                               <div className="relative">
                                 <select 
                                   value={voiceConfig?.ttsSettings?.voice || ''}
                                   onChange={(e) => setTTSConfig('voice', e.target.value)}
                                   className="w-full pl-3 pr-8 py-2 text-xs font-medium rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors appearance-none" 
                                 >
                                    {filteredVoices.length === 0 ? (
                                      <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" value="" disabled>No voice available for this filter.</option>
                                    ) : (
                                      filteredVoices.map(v => (
                                        <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" key={v.id} value={v.id}>{v.name} ({v.language})</option>
                                      ))
                                    )}
                                 </select>
                                 <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                               </div>
                            </div>

                            {/* Sliders */}
                            <div className="grid grid-cols-1 gap-4 pt-2">
                              {/* Rate */}
                              <div className="space-y-1.5 flex items-center justify-between gap-4">
                                <label className="text-xs font-medium text-[var(--text-muted)] w-16">Speed</label>
                                <input 
                                  type="range" min="-50" max="50" step="5"
                                  value={parseInt((voiceConfig?.ttsSettings?.rate || "0").replace('%', ''))}
                                  onChange={(e) => setTTSConfig('rate', `${e.target.value > 0 ? '+' : ''}${e.target.value}%`)}
                                  className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none accent-[var(--brand-cyan)] outline-none" 
                                />
                                <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{voiceConfig?.ttsSettings?.rate || "+0%"}</span>
                              </div>
                              {/* Pitch */}
                              <div className="space-y-1.5 flex items-center justify-between gap-4">
                                <label className="text-xs font-medium text-[var(--text-muted)] w-16">Pitch</label>
                                <input 
                                  type="range" min="-50" max="50" step="5"
                                  value={parseInt((voiceConfig?.ttsSettings?.pitch || "0").replace('Hz', ''))}
                                  onChange={(e) => setTTSConfig('pitch', `${e.target.value > 0 ? '+' : ''}${e.target.value}Hz`)}
                                  className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none accent-[var(--brand-cyan)] outline-none" 
                                />
                                <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{voiceConfig?.ttsSettings?.pitch || "+0Hz"}</span>
                              </div>
                              {/* Volume */}
                              <div className="space-y-1.5 flex items-center justify-between gap-4">
                                <label className="text-xs font-medium text-[var(--text-muted)] w-16">Volume</label>
                                <input 
                                  type="range" min="-50" max="50" step="5"
                                  value={parseInt((voiceConfig?.ttsSettings?.volume || "0").replace('%', ''))}
                                  onChange={(e) => setTTSConfig('volume', `${e.target.value > 0 ? '+' : ''}${e.target.value}%`)}
                                  className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none accent-[var(--brand-cyan)] outline-none" 
                                />
                                <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{voiceConfig?.ttsSettings?.volume || "+0%"}</span>
                              </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end">
                              <button 
                                onClick={handlePreviewVoice}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-[var(--brand-cyan)] text-[var(--brand-cyan)] hover:bg-[var(--brand-cyan)]/10 transition-colors"
                              >
                                <Mic className="w-3.5 h-3.5" /> Preview Voice
                              </button>
                            </div>
                         </div>
                       )}
                    </div>

                    {/* Right Column Voice Preview */}
                    <div className={`p-6 flex flex-col items-center text-center transition-opacity ${!voiceConfig?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                       <div className="w-full flex items-center justify-start gap-2 mb-8">
                          <AudioWaveform className="w-4 h-4 text-[var(--brand-cyan)]" />
                          <span className="text-xs font-semibold text-[var(--text-primary)]">Voice Preview</span>
                       </div>

                       {/* Status Badge */}
                       <div className="mb-4 w-full flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">Engine Status</span>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-xs font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" /> Edge TTS Active
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] mt-2">
                            Edge TTS is used for high-quality responses. Uses browser fallback if unavailable.
                          </p>
                       </div>
                       
                       <div className="relative w-36 h-36 flex items-center justify-center mb-6 mt-4">
                          {/* Fine, sleek pulsing rings */}
                          <div className={`absolute inset-0 rounded-full border border-[var(--brand-cyan)] opacity-20 ${isListeningTest ? 'animate-ping' : ''}`} style={{ borderWidth: '1px' }} />
                          <div className={`absolute inset-4 rounded-full border border-[var(--brand-cyan)] opacity-30 ${isListeningTest ? 'animate-pulse' : ''}`} style={{ borderWidth: '1px' }} />
                          <div className={`absolute inset-8 rounded-full border border-[var(--brand-cyan)] opacity-40`} style={{ borderWidth: '1px' }} />
                          
                          {/* Inner mic button */}
                          <button 
                            onClick={() => {
                              if (!recognitionRef.current) return;
                              if (isListeningTest) {
                                recognitionRef.current.stop();
                                setIsListeningTest(false);
                              } else {
                                setPreviewTranscript('');
                                setPreviewResponse('');
                                const lang = voiceConfigRef.current?.language && voiceConfigRef.current.language !== 'auto'
                                  ? voiceConfigRef.current.language : 'en-US';
                                recognitionRef.current.lang = lang;
                                recognitionRef.current.start();
                                setIsListeningTest(true);
                              }
                            }} 
                            className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                              isListeningTest 
                                ? 'bg-[var(--brand-cyan)] text-[#050816] scale-110 shadow-[0_0_15px_var(--brand-cyan)]' 
                                : 'bg-transparent border border-[var(--brand-cyan)] text-[var(--brand-cyan)] hover:bg-[var(--brand-cyan)]/10'
                            }`}
                          >
                             <Mic className="w-6 h-6" />
                          </button>
                       </div>

                       <div className="mt-auto pt-2 h-24 overflow-y-auto w-full text-center scrollbar-none flex flex-col justify-end">
                          {isListeningTest ? (
                            <p className="text-sm font-semibold text-[var(--brand-cyan)] animate-pulse">Listening...</p>
                          ) : previewLoading ? (
                            <p className="text-sm text-[var(--text-muted)] animate-pulse">Processing Voice...</p>
                          ) : previewTranscript || previewResponse ? (
                            <div className="flex flex-col gap-2">
                              {previewTranscript && <p className="text-xs text-[var(--text-primary)] font-medium bg-[var(--bg-secondary)] py-1 px-2 rounded self-center max-w-[90%]">"{previewTranscript}"</p>}
                              {previewResponse && <p className="text-xs text-[var(--brand-cyan)]">{previewResponse}</p>}
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                 Click the microphone to test<br />or say the wake word
                              </p>
                              <p className="text-sm text-[var(--brand-cyan)] font-semibold mt-1">"{voiceConfig?.wakeWord}"</p>
                            </>
                          )}
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}

          {activeInnerTab === 'chathead' && (
            <Card className="border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)]/50 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border-color)] pb-4">
                 <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-[var(--text-primary)]" />
                    <div>
                       <CardTitle className="text-sm font-medium text-[var(--text-primary)]">Chat Head Default Configuration</CardTitle>
                       <p className="text-xs text-[var(--text-muted)] mt-0.5">Set the default appearance and behavior for client workspaces.</p>
                    </div>
                 </div>
                 <button
                   onClick={saveSettings}
                   disabled={saving}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-gold)] text-[#050816] hover:brightness-110 disabled:opacity-50 transition-all font-medium"
                 >
                   {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                   {saving ? 'Saving...' : 'Save Changes'}
                 </button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">

                {/* Welcome Message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)] block">Default Welcome Message</label>
                  <p className="text-xs text-[var(--text-muted)] mb-2">The initial message displayed when the Chat Head is opened.</p>
                  <input
                    type="text"
                    value={settings.chatHeadConfig?.welcomeMessage || ''}
                    onChange={(e) => setChatHeadConfig('welcomeMessage', e.target.value)}
                    placeholder="Hi, I'm Exponify AI. How can I help you?"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-cyan-soft)] focus:border-[var(--brand-cyan-border)]"
                  />
                </div>

                {/* Appearance Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-color)]">
                  {/* Position */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] block">Default Position</label>
                      <p className="text-xs text-[var(--text-muted)]">Where the bubble anchors on the screen.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setChatHeadConfig('position', 'bottom-left')}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${settings.chatHeadConfig?.position === 'bottom-left' ? 'border-[var(--brand-cyan)] bg-[var(--brand-cyan)]/10 text-[var(--brand-cyan)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-soft)]'}`}
                      >
                        <div className="w-3 h-3 rounded-full bg-current" /> Bottom Left
                      </button>
                      <button
                        onClick={() => setChatHeadConfig('position', 'bottom-right')}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${settings.chatHeadConfig?.position === 'bottom-right' ? 'border-[var(--brand-cyan)] bg-[var(--brand-cyan)]/10 text-[var(--brand-cyan)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-soft)]'}`}
                      >
                        <div className="w-3 h-3 rounded-full bg-current ml-auto" /> Bottom Right
                      </button>
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] block">Appearance Theme</label>
                      <p className="text-xs text-[var(--text-muted)]">Automatically adapt to user system preference.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setChatHeadConfig('theme', 'auto')}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${settings.chatHeadConfig?.theme === 'auto' ? 'border-[var(--brand-cyan)] bg-[var(--brand-cyan)]/10 text-[var(--brand-cyan)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-soft)]'}`}
                      >
                        <span className="flex items-center gap-2">
                          <ToggleLeft className="w-4 h-4" /> Adaptable (Auto)
                        </span>
                        {settings.chatHeadConfig?.theme === 'auto' && <CheckCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl z-[9999] text-sm font-medium ${
              toast.type === 'error' 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 backdrop-blur-md' 
                : 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)] backdrop-blur-md'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Flow Sequences (Botcake-style multi-step drips) ──────────────────────────
export function FlowSequences({ workspaceId: propWorkspaceId, pageId: propPageId }) {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSeq, setEditSeq] = useState(null);
  const [form, setForm] = useState({
    name: '',
    triggerStage: '',
    steps: [{ delayMinutes: 30, messageText: '', quickReplies: '' }],
    isActive: true,
  });

  const apiBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const baseUrl = apiBase ? (apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`) : import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

  const fetchSequences = useCallback(async () => {
    if (!propWorkspaceId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${propWorkspaceId}`, { headers });
      const json = await res.json();
      if (json.sequences) setSequences(json.sequences);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [propWorkspaceId, baseUrl]);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const save = async () => {
    if (!form.name.trim()) return;
    const stepsData = form.steps
      .filter(s => s.messageText.trim())
      .map(s => ({
        delayMinutes: parseInt(s.delayMinutes, 10) || 30,
        messageText: s.messageText.trim(),
        quickReplies: s.quickReplies
          ? s.quickReplies.split(',').map(t => ({ title: t.trim(), payload: t.trim().toLowerCase().replace(/\s+/g, '_') })).filter(q => q.title)
          : [],
      }));

    if (!stepsData.length) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        Authorization: `Bearer ${session?.access_token || ''}`,
        'Content-Type': 'application/json',
      };

      if (editSeq) {
        await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${editSeq.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({
            name: form.name,
            triggerStage: form.triggerStage || null,
            steps: stepsData,
            isActive: form.isActive,
          }),
        });
      } else {
        await fetch(`${baseUrl}/integrations/facebook/flow-sequences`, {
          method: 'POST', headers,
          body: JSON.stringify({
            workspaceId: propWorkspaceId,
            pageId: propPageId || null,
            name: form.name,
            triggerStage: form.triggerStage || null,
            steps: stepsData,
            isActive: form.isActive,
          }),
        });
      }
      await fetchSequences();
    } catch {
      // error
    }
    setEditSeq(null);
    setForm({ name: '', triggerStage: '', steps: [{ delayMinutes: 30, messageText: '', quickReplies: '' }], isActive: true });
    setShowForm(false);
  };

  const startEdit = (seq) => {
    setEditSeq(seq);
    let steps = [];
    try {
      steps = Array.isArray(seq.steps) ? seq.steps : JSON.parse(seq.steps || '[]');
    } catch { steps = []; }
    setForm({
      name: seq.name || '',
      triggerStage: seq.trigger_stage || '',
      steps: steps.length ? steps.map(s => ({
        delayMinutes: s.delayMinutes || 30,
        messageText: s.messageText || '',
        quickReplies: Array.isArray(s.quickReplies) ? s.quickReplies.map(q => q.title || q).join(', ') : '',
      })) : [{ delayMinutes: 30, messageText: '', quickReplies: '' }],
      isActive: seq.is_active ?? true,
    });
    setShowForm(true);
  };

  const deleteSeq = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      setSequences((p) => p.filter((s) => s.id !== id));
    } catch {
      // error
    }
  };

  const toggleSeq = async (seq) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${seq.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !seq.is_active }),
      });
      setSequences((p) => p.map((s) => s.id === seq.id ? { ...s, is_active: !seq.is_active } : s));
    } catch {
      // error
    }
  };

  const addStep = () => {
    setForm((p) => ({ ...p, steps: [...p.steps, { delayMinutes: 30, messageText: '', quickReplies: '' }] }));
  };

  const removeStep = (idx) => {
    setForm((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));
  };

  const updateStep = (idx, field, value) => {
    setForm((p) => ({
      ...p,
      steps: p.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Multi-step drip sequences sent to customers who don't reply. Botcake-style automated follow-ups.
        </p>
        <Button
          icon={Plus}
          onClick={() => {
            setEditSeq(null);
            setForm({ name: '', triggerStage: '', steps: [{ delayMinutes: 30, messageText: '', quickReplies: '' }], isActive: true });
            setShowForm(true);
          }}
        >
          Add Sequence
        </Button>
      </div>

      {showForm && (
        <Card className="border-[var(--brand-cyan-border)]">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">
              {editSeq ? 'Edit Sequence' : 'New Flow Sequence'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Sequence name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Abandoned cart follow-up"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Trigger stage (optional)</label>
                <input
                  value={form.triggerStage}
                  onChange={(e) => setForm((p) => ({ ...p, triggerStage: e.target.value }))}
                  placeholder="e.g. understanding_inquiry"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Steps</label>
              {form.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[var(--text-muted)]">After</label>
                      <input
                        type="number"
                        value={step.delayMinutes}
                        onChange={(e) => updateStep(idx, 'delayMinutes', e.target.value)}
                        className="w-20 px-2 py-1 text-sm rounded border bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
                      />
                      <span className="text-xs text-[var(--text-muted)]">min</span>
                    </div>
                    <textarea
                      value={step.messageText}
                      onChange={(e) => updateStep(idx, 'messageText', e.target.value)}
                      placeholder="Message to send..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)] resize-none"
                    />
                    <input
                      value={step.quickReplies}
                      onChange={(e) => updateStep(idx, 'quickReplies', e.target.value)}
                      placeholder="Quick replies (comma-separated, optional)"
                      className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
                    />
                  </div>
                  {form.steps.length > 1 && (
                    <button
                      onClick={() => removeStep(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addStep}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)] w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-gold)] text-[#050816] flex items-center gap-1.5 hover:brightness-110"
                >
                  <Save className="w-3.5 h-3.5" /> Save Sequence
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p>Loading sequences...</p>
          </div>
        ) : sequences.map((seq) => {
          let stepCount = 0;
          try { stepCount = (Array.isArray(seq.steps) ? seq.steps : JSON.parse(seq.steps || '[]')).length; } catch {}
          return (
            <Card key={seq.id} className={`transition-opacity ${seq.is_active ? '' : 'opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${seq.is_active ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{seq.name}</span>
                      <Badge className="text-xs">{stepCount} steps</Badge>
                      {seq.trigger_stage && <Badge className="text-xs">{seq.trigger_stage}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleSeq(seq)} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                      {seq.is_active ? <ToggleRight className="w-4 h-4 text-[var(--success)]" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(seq)} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSeq(seq.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!loading && sequences.length === 0 && (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No flow sequences yet. Create your first sequence above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Head Component ──────────────────────────────────────────────────────

export default LiveChatTest;
