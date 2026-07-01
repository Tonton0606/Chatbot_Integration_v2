import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare, Instagram, Music2, ShoppingBag, Store,
  Search, RefreshCw, UserCircle, Bot, Send, Settings,
  TrendingUp, Users, Clock, AlertCircle,
} from "lucide-react";
import { omniChannelService } from "../../../services/omnichannel";

const CHANNEL_ICONS = {
  instagram: Instagram,
  tiktok: Music2,
  shopee: ShoppingBag,
  lazada: Store,
  facebook: MessageSquare,
};

const CHANNEL_COLORS = {
  instagram: "#E1306C",
  tiktok: "#000000",
  shopee: "#EE4D2D",
  lazada: "#0F146D",
  facebook: "#1877F2",
};

const STATUS_BADGES = {
  active: { label: "Active", color: "bg-green-500/10 text-green-500" },
  human_handoff: { label: "Human Handoff", color: "bg-orange-500/10 text-orange-500" },
  resolved: { label: "Resolved", color: "bg-blue-500/10 text-blue-500" },
  closed: { label: "Closed", color: "bg-gray-500/10 text-gray-500" },
};

export default function OmniChannelInbox({ workspaceId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [convData, channelData, analyticsData] = await Promise.all([
        omniChannelService.getConversations({
          channel: filterChannel,
          status: filterStatus,
          search: searchQuery,
          limit: 50,
        }),
        omniChannelService.getChannels(),
        omniChannelService.getAnalytics(),
      ]);

      setConversations(convData.conversations || []);
      setTotal(convData.total || 0);
      setChannels(channelData.channels || []);
      setAnalytics(analyticsData);
    } catch {
      // silent — UI shows empty state on failure
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterStatus, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pollRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const convData = await omniChannelService.getConversations({
          channel: filterChannel,
          status: filterStatus,
          search: searchQuery,
          limit: 50,
        });
        setConversations(convData.conversations || []);
        setTotal(convData.total || 0);

        if (selectedConv) {
          const detail = await omniChannelService.getConversation(selectedConv.id);
          setMessages(detail.messages || []);
        }
      } catch {
        // Silent fail on poll — don't disrupt the UI
      }
    }, 15000);

    return () => clearInterval(pollRef.current);
  }, [filterChannel, filterStatus, searchQuery, selectedConv]);

  const loadConversation = async (conv) => {
    setSelectedConv(conv);
    try {
      const data = await omniChannelService.getConversation(conv.id);
      setMessages(data.messages || []);
    } catch {
      // silent — poll retries automatically
    }
  };

  const handleHandoff = async () => {
    if (!selectedConv) return;
    try {
      await omniChannelService.enableHandoff(selectedConv.id);
      setSelectedConv({ ...selectedConv, status: "human_handoff", bot_paused: true });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id ? { ...c, status: "human_handoff", bot_paused: true } : c
        )
      );
    } catch {
      // silent — UI reflects state on next poll
    }
  };

  const handleEnableBot = async () => {
    if (!selectedConv) return;
    try {
      await omniChannelService.enableChatbot(selectedConv.id);
      setSelectedConv({ ...selectedConv, status: "active", bot_paused: false });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id ? { ...c, status: "active", bot_paused: false } : c
        )
      );
    } catch {
      // silent — UI reflects state on next poll
    }
  };

  const handleResolve = async () => {
    if (!selectedConv) return;
    try {
      await omniChannelService.resolveConversation(selectedConv.id);
      setSelectedConv({ ...selectedConv, status: "resolved" });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id ? { ...c, status: "resolved" } : c
        )
      );
    } catch {
      // silent — UI reflects state on next poll
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] p-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-[var(--text-primary)]" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Omni-Channel Inbox
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {total} conversations across {channels.filter((c) => c.is_connected).length} channels
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            title="Channel Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Analytics Bar */}
      {analytics && Object.keys(analytics.channels || {}).length > 0 ? (
        <div className="grid grid-cols-5 gap-2 border-b border-[var(--border-color)] p-3">
          {Object.entries(analytics.channels || {}).map(([ch, stats]) => {
            const Icon = CHANNEL_ICONS[ch] || MessageSquare;
            return (
              <div key={ch} className="rounded-lg bg-[var(--bg-hover)] p-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: CHANNEL_COLORS[ch] }} />
                  <span className="text-xs font-medium capitalize text-[var(--text-primary)]">
                    {ch}
                  </span>
                </div>
                <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {stats.total}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">
                  {stats.active} active · {stats.human_handoff} handoff
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-b border-[var(--border-color)] p-3 text-center text-xs text-[var(--text-secondary)]">
          No analytics data yet — connect a channel to start receiving conversations
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] p-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] py-1.5 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All Channels</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="shopee">Shopee</option>
          <option value="lazada">Lazada</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="human_handoff">Handoff</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Main Content: Conversation List + Message View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-72 overflow-y-auto border-r border-[var(--border-color)]">
          {loading && conversations.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-[var(--text-secondary)]">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-sm text-[var(--text-secondary)]">
              <MessageSquare className="mb-2 h-8 w-8 opacity-30" />
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => {
              const Icon = CHANNEL_ICONS[conv.channel] || MessageSquare;
              const isSelected = selectedConv?.id === conv.id;
              const badge = STATUS_BADGES[conv.status] || STATUS_BADGES.active;

              return (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`flex w-full items-start gap-2 border-b border-[var(--border-color)] p-3 text-left transition-colors hover:bg-[var(--bg-hover)] ${
                    isSelected ? "bg-[var(--bg-hover)]" : ""
                  }`}
                >
                  <Icon
                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                    style={{ color: CHANNEL_COLORS[conv.channel] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {conv.customer_name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      {conv.last_message || "No messages"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                      {conv.bot_paused && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-500">
                          <UserCircle className="h-3 w-3" /> Human
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Message View */}
        <div className="flex-1 overflow-y-auto">
          {!selectedConv ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)]">
              <MessageSquare className="mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Conversation Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-color)] p-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = CHANNEL_ICONS[selectedConv.channel] || MessageSquare;
                    return <Icon className="h-5 w-5" style={{ color: CHANNEL_COLORS[selectedConv.channel] }} />;
                  })()}
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {selectedConv.customer_name || "Unknown"}
                    </div>
                    <div className="text-xs capitalize text-[var(--text-secondary)]">
                      {selectedConv.channel} · {selectedConv.customer_id}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedConv.bot_paused ? (
                    <button
                      onClick={handleEnableBot}
                      className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20"
                    >
                      Enable Bot
                    </button>
                  ) : (
                    <button
                      onClick={handleHandoff}
                      className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-500/20"
                    >
                      Hand to Human
                    </button>
                  )}
                  <button
                    onClick={handleResolve}
                    className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-500/20"
                  >
                    Resolve
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesEndRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
                    No messages in this conversation
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === "customer" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                          msg.sender_type === "customer"
                            ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            : msg.sender_type === "bot"
                              ? "bg-blue-500/10 text-[var(--text-primary)]"
                              : "bg-green-500/10 text-[var(--text-primary)]"
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                          {msg.sender_type === "bot" && <Bot className="h-3 w-3" />}
                          {msg.sender_type === "agent" && <UserCircle className="h-3 w-3" />}
                          {msg.sender_name || msg.sender_type}
                          <span>· {formatTime(msg.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        {msg.image_url && (
                          <img
                            src={msg.image_url}
                            alt="attachment"
                            className="mt-2 max-h-40 rounded-lg"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Agent Reply Input */}
              <AgentReplyBar
                conversationId={selectedConv.id}
                onSent={(newMsg) => {
                  setMessages((prev) => [...prev, newMsg]);
                  setTimeout(() => {
                    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: "smooth" });
                  }, 100);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <ChannelSettings
          channels={channels}
          onClose={() => setShowSettings(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}

// ── Channel Settings Modal ────────────────────────────────────────────────────

function ChannelSettings({ channels, onClose, onSave }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (config) => {
    setSaving(true);
    try {
      await omniChannelService.saveChannel(config);
      await onSave();
      setEditing(null);
    } catch {
      // silent — UI reflects state on next refresh
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (id) => {
    try {
      await omniChannelService.disconnectChannel(id);
      await onSave();
    } catch {
      // silent — UI reflects state on next refresh
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Channel Settings
          </h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {["instagram", "tiktok", "shopee", "lazada"].map((ch) => {
            const Icon = CHANNEL_ICONS[ch] || MessageSquare;
            const config = channels.find((c) => c.channel === ch);

            return (
              <div
                key={ch}
                className="flex items-center justify-between rounded-lg border border-[var(--border-color)] p-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6" style={{ color: CHANNEL_COLORS[ch] }} />
                  <div>
                    <div className="text-sm font-medium capitalize text-[var(--text-primary)]">
                      {ch}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {config?.is_connected
                        ? `Connected as ${config.page_name || config.page_id}`
                        : "Not connected"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {config?.is_connected ? (
                    <>
                      <button
                        onClick={() => setEditing(config)}
                        className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-500/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDisconnect(config.id)}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing({ channel: ch, pageId: "", pageName: "" })}
                      className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {editing && (
          <ChannelEditForm
            config={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

function ChannelEditForm({ config, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    channel: config.channel,
    pageId: config.page_id || config.pageId || "",
    pageName: config.page_name || config.pageName || "",
    accessToken: config.access_token || "",
    businessType: config.business_type || "",
    productServices: config.product_services || "",
    productServicePriceRanges: config.product_service_price_ranges || "",
    websiteLink: config.website_link || "",
    knowledge: config.knowledge || "",
    aiInstruction: config.ai_instruction || "",
    chatbotEnabled: config.chatbot_enabled !== false,
    commentAutoreplyEnabled: config.comment_autoreply_enabled !== false,
  });

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-[var(--border-color)] p-4">
      <h4 className="text-sm font-medium capitalize text-[var(--text-primary)]">
        Configure {form.channel}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Page/Account ID"
          value={form.pageId}
          onChange={(e) => set("pageId", e.target.value)}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        />
        <input
          placeholder="Display Name"
          value={form.pageName}
          onChange={(e) => set("pageName", e.target.value)}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </div>

      <input
        placeholder="Access Token"
        value={form.accessToken}
        onChange={(e) => set("accessToken", e.target.value)}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <input
        placeholder="Business Type (e.g., Restaurant, Salon, Online Store)"
        value={form.businessType}
        onChange={(e) => set("businessType", e.target.value)}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <textarea
        placeholder="Products / Services (one per line)"
        value={form.productServices}
        onChange={(e) => set("productServices", e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <input
        placeholder="Price Ranges (e.g., ₱100-₱500, ₱500-₱1000)"
        value={form.productServicePriceRanges}
        onChange={(e) => set("productServicePriceRanges", e.target.value)}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <input
        placeholder="Website Link (https://...)"
        value={form.websiteLink}
        onChange={(e) => set("websiteLink", e.target.value)}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <textarea
        placeholder="Business Knowledge (FAQs, policies, etc.)"
        value={form.knowledge}
        onChange={(e) => set("knowledge", e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <textarea
        placeholder="AI Instructions (tone, behavior, special rules)"
        value={form.aiInstruction}
        onChange={(e) => set("aiInstruction", e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={form.chatbotEnabled}
            onChange={(e) => set("chatbotEnabled", e.target.checked)}
          />
          Chatbot Enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={form.commentAutoreplyEnabled}
            onChange={(e) => set("commentAutoreplyEnabled", e.target.checked)}
          />
          Comment Auto-Reply
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.pageId}
          className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Agent Reply Bar ────────────────────────────────────────────────────────────

function AgentReplyBar({ conversationId, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await omniChannelService.sendReply(conversationId, text.trim());
      onSent({
        id: Date.now(),
        sender_type: "agent",
        sender_name: "You",
        message_text: text.trim(),
        created_at: new Date().toISOString(),
      });
      setText("");
    } catch (err) {
      setError("Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[var(--border-color)] p-3">
      {error && (
        <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-500">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a reply... (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ minHeight: "38px", maxHeight: "120px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          title="Send reply"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
