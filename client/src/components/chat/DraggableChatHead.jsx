import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Bot, X, Send, User, ChevronDown, RefreshCw, Copy, Check, Info, Trash2, ArrowRight, Activity, Calendar, Layout, Search, Sparkles, Loader2, PlayCircle, StopCircle, Mic, MicOff, Settings2, ShieldAlert, Cpu, Maximize2, Minimize2, Settings, FileText, ChevronRight, Plus, ToggleLeft } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWorkspaceId, getCurrentProfile } from '../../services/workspaceResolver';
import { getCurrentUser, getCurrentWorkspace } from '../../services/operations/client_modules';

import LiveChatTest, { EDGE_TTS_VOICES } from "./LiveChatTest";

const _RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = _RAW ? (_RAW.endsWith('/api') ? _RAW : `${_RAW}/api`) : import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

function DraggableChatHead({ voiceConfig: externalVoiceConfig, setVoiceConfig: externalSetVoiceConfig, moduleContext, userRole, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempVoice, setTempVoice] = useState(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [localVoiceConfig, setLocalVoiceConfig] = useState({
    enabled: true,
    voiceResponseEnabled: true,
    wakeWord: 'Hey Exponify',
    sensitivity: 50,
    language: 'auto'
  });
  
  const voiceConfig = externalVoiceConfig || localVoiceConfig;
  const setVoiceConfig = externalSetVoiceConfig || setLocalVoiceConfig;

  const [startPos, setStartPos] = useState({ right: 24, bottom: 24 });
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        let workspaceId = null;
        if (userRole === 'client') {
          try {
            const user = await getCurrentUser();
            const wsInfo = await getCurrentWorkspace(user.id);
            workspaceId = wsInfo?.workspaceId;
            if (workspaceId && typeof window !== 'undefined') {
              window.localStorage.setItem("exponify_active_client_workspace_id", workspaceId);
            }
          } catch {
            // fall back to default workspace resolver
          }
        }
        
        if (!workspaceId) {
          try {
            workspaceId = await getCurrentWorkspaceId();
          } catch {
            // continue without workspace
          }
        }
        
        if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '' || workspaceId === 'undefined') {
          return;
        }
        
        setCurrentWorkspaceId(workspaceId);

        const { data, error } = await supabase
          .from('ai_chatbot_settings')
          .select('*')
          .eq('workspace_id', workspaceId)
          .maybeSingle();
          
        if (error) {
          setSaveError('Failed to load chat head settings.');
          setTimeout(() => setSaveError(null), 4000);
        }

        if (!externalVoiceConfig) {
          setLocalVoiceConfig(prev => ({
            ...prev,
            enabled: data?.voice_enabled ?? prev.enabled,
            voiceResponseEnabled: data?.voice_response_enabled ?? prev.voiceResponseEnabled,
            wakeWord: data?.wake_word || prev.wakeWord,
            language: data?.voice_language || prev.language,
            sensitivity: data?.voice_sensitivity ?? prev.sensitivity,
            ttsSettings: data?.tts_settings || {
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

        if (data) {
          if (data.chat_head_position === 'bottom-left') {
            setStartPos({ left: 24, bottom: 24 });
          } else {
            setStartPos({ right: 24, bottom: 24 });
          }

          const globalEnabled = data.chat_head_enabled !== false;
          
          let roleEnabled = true;
          if (data.chat_head_config) {
            const config = data.chat_head_config;
            const resolvedRole = userRole || (await getCurrentProfile().then(p => p.role).catch(() => 'client'));
            const normalizedRole = String(resolvedRole || "").trim().toLowerCase();
            
            if (normalizedRole === 'admin') {
              roleEnabled = config.adminEnabled !== false;
            } else {
              roleEnabled = config.clientEnabled !== false;
            }
          }
          
          setIsEnabled(globalEnabled && roleEnabled);
        } else {
          setIsEnabled(true);
        }
      } catch {
        setSaveError('Failed to load chat head config.');
        setTimeout(() => setSaveError(null), 4000);
      }
    };

    loadConfig();

    window.addEventListener('ai-settings-updated', loadConfig);
    return () => {
      window.removeEventListener('ai-settings-updated', loadConfig);
    };
  }, [userRole]);

  if (!isEnabled) return null;

  return (
    <motion.div
      drag
      dragConstraints={{ left: -4000, right: 4000, top: -4000, bottom: 4000 }}
      dragElastic={0.1}
      dragMomentum={false}
      className="fixed z-[9999]"
      style={startPos}
    >
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-[var(--brand-cyan)] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-transform"
          >
            <Bot className="w-7 h-7 text-[#050816]" />
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`w-[360px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 h-[600px]`}
          >
            {/* Header / Drag Handle */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[var(--brand-cyan)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Exponify AI</span>
              </div>
              <div className="flex items-center gap-1">
                {saveError && (
                  <span className="text-[10px] text-red-400 mr-1 max-w-[120px] truncate" title={saveError}>
                    {saveError}
                  </span>
                )}
                <button 
                  onClick={() => {
                    setTempVoice(voiceConfig?.ttsSettings?.voice || 'fil-PH-BlessicaNeural');
                    setShowSettings(!showSettings);
                  }} 
                  className={`p-1 hover:bg-[var(--hover-bg)] rounded transition-colors ${showSettings ? 'text-[var(--brand-cyan)] bg-[var(--brand-cyan)]/10' : 'text-[var(--text-muted)]'}`}
                  title="Voice Settings"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[var(--hover-bg)] rounded text-[var(--text-muted)]">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setIsOpen(false); onClose && onClose(); }} className="p-1 hover:bg-[var(--hover-bg)] rounded text-[var(--text-muted)] hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden relative">
                {showSettings ? (
                  <div className="absolute inset-0 z-50 bg-[var(--bg-card)] flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-2 mb-6">
                        <Bot className="w-5 h-5 text-[var(--brand-cyan)]" />
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Voice Settings</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Choose AI Voice Profile</label>
                          <div className="relative">
                            <select 
                              value={tempVoice || ''}
                              onChange={(e) => setTempVoice(e.target.value)}
                              className="w-full pl-3 pr-8 py-2.5 text-xs font-medium rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-cyan)] transition-colors appearance-none" 
                            >
                              {EDGE_TTS_VOICES.map(v => (
                                <option className="bg-[var(--bg-card)] text-[var(--text-primary)]" key={v.id} value={v.id}>{v.name} ({v.language} - {v.gender})</option>
                              ))}
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-relaxed">
                            Select the voice you want the AI to use when reading responses aloud.
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                           <span className="text-xs text-[var(--text-primary)] font-medium">Read Responses Aloud</span>
                           <div 
                              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${voiceConfig?.voiceResponseEnabled ? 'bg-[var(--brand-cyan)]' : 'bg-[#334155]'}`} 
                              onClick={() => setVoiceConfig(p => ({ ...p, voiceResponseEnabled: !p.voiceResponseEnabled }))}
                           >
                              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${voiceConfig?.voiceResponseEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-end gap-3">
                      <button 
                        onClick={() => setShowSettings(false)}
                        className="px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          const newConfig = {
                            ...voiceConfig,
                            ttsSettings: {
                              ...(voiceConfig?.ttsSettings || {}),
                              voice: tempVoice
                            }
                          };
                          setVoiceConfig(newConfig);
                          setShowSettings(false);
                          
                          if (currentWorkspaceId) {
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
                              const res = await fetch(`${API_BASE_URL}/ai/settings`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...authHeader },
                                body: JSON.stringify({
                                  workspaceId: currentWorkspaceId,
                                  tts_settings: newConfig.ttsSettings
                                })
                              });
                              if (!res.ok) throw new Error('Failed to save TTS settings');
                              window.dispatchEvent(new Event('ai-settings-updated'));
                            } catch {
                              setSaveError('Failed to save TTS settings.');
                              setTimeout(() => setSaveError(null), 4000);
                            }
                          }
                        }}
                        className="px-4 py-2 text-xs font-medium bg-[var(--brand-cyan)] text-[#050816] rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        Apply Settings
                      </button>
                    </div>
                  </div>
                ) : null}
                <LiveChatTest voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} isChatHead={true} moduleContext={moduleContext} userRole={userRole} workspaceId={currentWorkspaceId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DraggableChatHead;
