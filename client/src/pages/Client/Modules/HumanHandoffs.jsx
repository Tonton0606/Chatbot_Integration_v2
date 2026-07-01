import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../../../config/supabaseClient";
import handoffService from "../../../services/handoffService";
import "../../../styles/client/facebook-handoff.css";

export default function HumanHandoffs({ workspaceId, pageId = "", pages = [] }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [replyText, setReplyText] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [enablingChatbot, setEnablingChatbot] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [error, setError] = useState("");
  const [agentName, setAgentName] = useState("Agent");
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [mediaUrlToSend, setMediaUrlToSend] = useState("");
  const [mediaTypeToSend, setMediaTypeToSend] = useState("");
  const [mediaFileNameToSend, setMediaFileNameToSend] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const selectedConversationRef = useRef(selectedConversation);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Helper: resolve friendly page name from page_id
  const resolvePageName = useCallback((pageId) => {
    if (!pageId) return "Unknown Page";
    const match = pages.find(
      (p) =>
        String(p.pageId || p.page_id || p.id || "").trim() === String(pageId).trim()
    );
    return match
      ? (match.pageName || match.page_name || match.fb_name || pageId)
      : pageId;
  }, [pages]);

  // 1. Resolve Current Agent Name
  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Agent";
          setAgentName(name);
        }
      } catch (err) {
        console.error("Failed to load user for agent name:", err);
      }
    }
    fetchUser();
  }, []);

  // 2. Fetch Conversations
  const fetchConversations = useCallback(async (silent = false) => {
    if (!workspaceId) return;
    if (!silent) setLoadingConversations(true);
    setError("");

    try {
      const result = await handoffService.getConversations({
        workspaceId,
        pageId,
        filter: activeFilterTab,
      });
      const list = result.conversations || [];
      setConversations(list);

      // Refresh currently selected conversation in case status changed
      const current = selectedConversationRef.current;
      if (current) {
        const updated = list.find((c) => c.id === current.id);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load handoff conversations:", err);
      setError(err?.message || "Failed to load conversations.");
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [workspaceId, activeFilterTab]);

  // Load conversations on mount, when workspaceId or filter tab changes
  useEffect(() => {
    fetchConversations();
  }, [workspaceId, activeFilterTab]);

  // 3. Fetch Messages for Selected Conversation
  const fetchMessages = useCallback(async (conversationId, silent = false) => {
    if (!workspaceId || !conversationId) return;
    if (!silent) setLoadingMessages(true);

    try {
      const result = await handoffService.getMessages({ workspaceId, conversationId });
      setMessages(result.messages || []);
    } catch (err) {
      console.error("Failed to load handoff messages:", err);
      setError(err?.message || "Failed to load message history.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [workspaceId]);

  // Fetch messages whenever selected conversation changes
  useEffect(() => {
    if (selectedConversation?.id) {
      fetchMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id, fetchMessages]);

  // 4. Scroll to Bottom Utility
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages.length]);

  useEffect(() => {
    if (sendingReply) {
      scrollToBottom("smooth");
    }
  }, [sendingReply]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    if (selectedConversation?.id) {
      setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
    }
  }, [selectedConversation?.id]);

  // 5. Supabase Real-Time Subscriptions & Polling Fallbacks
  // Subscribe to updates in conversations and poll every 4 seconds
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel("handoff-conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_facebook_conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          fetchConversations(true);
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchConversations(true);
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [workspaceId, fetchConversations]);

  // Subscribe to new messages for selected conversation and poll every 2 seconds
  useEffect(() => {
    if (!workspaceId || !selectedConversation?.id) return;

    const channel = supabase
      .channel(`handoff-messages-realtime-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_facebook_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchMessages(selectedConversation.id, true);
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [workspaceId, selectedConversation?.id, fetchMessages]);

  // Helper: detect media type from URL or filename
  const detectMediaType = useCallback((url) => {
    if (!url) return "file";
    const ext = String(url).split("?")[0].split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (["mp4", "mov", "avi", "webm", "mkv", "m4v"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return "audio";
    return "file";
  }, []);

  // Helper: get icon for a file URL based on its extension
  const getFileIcon = useCallback((url) => {
    if (!url) return "📎";
    const ext = String(url).split("?")[0].split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "📄";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📑";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "🗜️";
    if (["txt", "rtf"].includes(ext)) return "📃";
    return "📎";
  }, []);

  // Helper: extract readable filename from URL
  const getFileNameFromUrl = useCallback((url) => {
    if (!url) return "File";
    try {
      const path = String(url).split("?")[0];
      const segments = path.split("/");
      const raw = decodeURIComponent(segments[segments.length - 1] || "File");
      // Remove timestamp prefix like "1718500000000-abc123."
      const cleaned = raw.replace(/^\d{13,}-[a-z0-9]+\./, "");
      return cleaned || raw;
    } catch {
      return "File";
    }
  }, []);

  // 5.5 Handle Media Upload
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    setUploadingMedia(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `chat-attachments/${workspaceId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error: uploadErr } = await supabase.storage
        .from("landing-assets-v2")
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from("landing-assets-v2")
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl) {
        throw new Error("Failed to get public URL from storage.");
      }

      const detectedType = detectMediaType(publicData.publicUrl);
      setMediaUrlToSend(publicData.publicUrl);
      setMediaTypeToSend(detectedType);
      setMediaFileNameToSend(file.name);
    } catch (err) {
      console.error("Failed to upload media:", err);
      setError(err?.message || "Failed to upload media. Please try again.");
    } finally {
      setUploadingMedia(false);
      // Reset input element
      e.target.value = "";
    }
  };

  // 6. Handle Send Reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if ((!text && !mediaUrlToSend) || !selectedConversation) return;

    // Command interceptor: if typed 'enable chatbot'
    if (text.toLowerCase() === "enable chatbot") {
      setReplyText("");
      handleEnableChatbot();
      return;
    }

    setSendingReply(true);
    setError("");

    try {
      await handoffService.sendReply({
        workspaceId,
        conversationId: selectedConversation.id,
        messageText: text,
        mediaUrl: mediaUrlToSend || null,
        mediaType: mediaTypeToSend || null,
        senderName: agentName,
      });

      setReplyText("");
      setMediaUrlToSend("");
      setMediaTypeToSend("");
      setMediaFileNameToSend("");
      // Refresh messages and conversations list
      await fetchMessages(selectedConversation.id, true);
      await fetchConversations(true);
    } catch (err) {
      console.error("Failed to send reply:", err);
      setError(err?.message || "Failed to send message. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };

  // 7. Handle Enable Chatbot
  const handleEnableChatbot = async (bypassConfirm = false) => {
    if (!selectedConversation) return;

    if (bypassConfirm !== true) {
      setShowConfirmModal(true);
      return;
    }

    setEnablingChatbot(true);
    setError("");

    try {
      await handoffService.enableChatbot({
        workspaceId,
        conversationId: selectedConversation.id,
      });

      // Reload conversations and current conversation state
      await fetchConversations(true);
      if (selectedConversation?.id) {
        await fetchMessages(selectedConversation.id, true);
      }
    } catch (err) {
      console.error("Failed to enable chatbot:", err);
      setError(err?.message || "Failed to resume chatbot.");
    } finally {
      setEnablingChatbot(false);
      setShowConfirmModal(false);
    }
  };

  // 8. Filter Conversations by search query (tab filter is now server-side)
  const filteredConversations = useMemo(() => {
    let list = conversations;

    const term = searchText.toLowerCase().trim();
    if (!term) return list;

    return list.filter((c) => {
      const name = (c.customer_name || "").toLowerCase();
      const lastMsg = (c.last_message || "").toLowerCase();
      return name.includes(term) || lastMsg.includes(term);
    });
  }, [conversations, searchText]);

  // Format timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Else show short date
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="handoff-container">
      {/* Sidebar List */}
      <div className={`handoff-sidebar ${selectedConversation ? "handoff-sidebar-hidden" : ""}`}>
        <div className="handoff-search-wrapper">
          <input
            type="text"
            className="handoff-search-input"
            placeholder="Search people..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: "flex",
          gap: "4px",
          padding: "0 16px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}>
          {[
            { key: "all", label: "All" },
            { key: "handoffs", label: "Handoffs" },
            { key: "executed", label: "Executed" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilterTab(tab.key)}
              style={{
                flex: 1,
                padding: "7px 0",
                fontSize: "11.5px",
                fontWeight: activeFilterTab === tab.key ? "600" : "500",
                color: activeFilterTab === tab.key ? "#f6e05e" : "#a0aec0",
                background: activeFilterTab === tab.key ? "rgba(246, 224, 94, 0.08)" : "transparent",
                border: activeFilterTab === tab.key ? "1px solid rgba(246, 224, 94, 0.25)" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.3px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="handoff-conv-list">
          {loadingConversations && (
            <div className="p-4 text-center text-xs text-muted">Loading conversations...</div>
          )}

          {!loadingConversations && filteredConversations.length === 0 && (
            <div className="p-6 text-center text-xs text-muted">
              {activeFilterTab === "handoffs"
                ? "No pending handoffs. All conversations are being handled by the chatbot."
                : activeFilterTab === "executed"
                ? "No executed conversations yet. Conversations will appear here after the chatbot is re-enabled."
                : "No conversations found."}
            </div>
          )}

          {filteredConversations.map((c) => {
            const isActive = selectedConversation?.id === c.id;
            const initials = (c.customer_name || "F")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={c.id}
                className={`handoff-conv-item ${isActive ? "handoff-conv-item-active" : ""}`}
                onClick={() => setSelectedConversation(c)}
              >
                <div className="handoff-avatar">
                  {c.customer_profile_pic ? (
                    <img 
                      src={c.customer_profile_pic} 
                      alt={c.customer_name || "Facebook User"} 
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentNode.textContent = initials;
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="handoff-conv-details">
                  <div className="handoff-conv-header">
                    <span className="handoff-customer-name">{c.customer_name || "Facebook User"}</span>
                    <span className="handoff-time">{formatTime(c.updated_at)}</span>
                  </div>
                  <p className="handoff-last-msg">{c.last_message || "No messages yet."}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                    <span className="handoff-page-label">
                      📄 {resolvePageName(c.page_id)}
                    </span>
                    {c.needs_human && (
                      <span className="handoff-badge-needs-reply inline-flex items-center gap-1">
                        <span className="handoff-glow-dot"></span>
                        Needs Reply
                      </span>
                    )}
                    {c.bot_paused && <span className="handoff-badge-paused">Bot Paused</span>}
                    {!c.bot_paused && !c.needs_human && c.status !== "human_handoff" && (
                      <span style={{
                        fontSize: "9px",
                        padding: "2px 7px",
                        borderRadius: "6px",
                        background: "rgba(72, 187, 120, 0.12)",
                        color: "#68d391",
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                      }}>Resolved</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`handoff-chat-area ${!selectedConversation ? "handoff-chat-area-hidden" : ""}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="handoff-chat-header">
              <div className="handoff-chat-title-info">
                {/* Back button for mobile view */}
                <button
                  type="button"
                  className="handoff-back-btn"
                  onClick={() => setSelectedConversation(null)}
                >
                  ←
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="handoff-avatar" style={{ width: "36px", height: "36px", fontSize: "13px" }}>
                    {selectedConversation.customer_profile_pic ? (
                      <img 
                        src={selectedConversation.customer_profile_pic} 
                        alt={selectedConversation.customer_name || "Facebook User"} 
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentNode.textContent = (selectedConversation.customer_name || "F")
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                        }}
                      />
                    ) : (
                      (selectedConversation.customer_name || "F")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="handoff-header-name">{selectedConversation.customer_name || "Facebook User"}</h3>
                    <p className="handoff-header-meta">
                      {resolvePageName(selectedConversation.page_id)} • Status:{" "}
                      {selectedConversation.bot_paused ? "AI Bot Paused" : "AI Bot Active"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="handoff-header-actions">
                {selectedConversation.bot_paused && (
                  <button
                    type="button"
                    className="facebook-connect-button facebook-connect-button-primary"
                    onClick={handleEnableChatbot}
                    disabled={enablingChatbot}
                  >
                    {enablingChatbot ? "Enabling AI..." : "Enable Chatbot"}
                  </button>
                )}
              </div>
            </div>

            {/* Error banner if any */}
            {error && <div className="facebook-connect-alert m-4">{error}</div>}

            {/* Messages Area */}
            <div className="handoff-messages-container" ref={chatContainerRef}>
              {loadingMessages && (
                <div className="text-center text-xs text-muted py-6">Loading messages...</div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="text-center text-xs text-muted py-6">No messages in this chat.</div>
              )}

              {messages.map((msg) => {
                const isHuman = msg.sender_type === "human";
                const isBot = msg.sender_type === "bot";
                const isCustomer = msg.sender_type === "customer";

                let rowClass = "handoff-message-row";
                let bubbleClass = "handoff-speech-bubble";

                if (isHuman) {
                  rowClass += " handoff-message-human";
                  bubbleClass += " handoff-bubble-human";
                } else if (isBot) {
                  rowClass += " handoff-message-bot";
                  bubbleClass += " handoff-bubble-bot";
                } else {
                  rowClass += " handoff-message-customer";
                  bubbleClass += " handoff-bubble-customer";
                }

                return (
                  <div key={msg.id} className={rowClass}>
                    <div className={bubbleClass}>
                      {msg.image_url && (() => {
                        const mType = detectMediaType(msg.image_url);
                        if (mType === "video") {
                          return (
                            <div style={{ marginBottom: msg.message_text ? "8px" : "0" }}>
                              <video
                                src={msg.image_url}
                                controls
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "240px",
                                  borderRadius: "8px",
                                }}
                              />
                            </div>
                          );
                        }
                        if (mType === "audio") {
                          return (
                            <div style={{ marginBottom: msg.message_text ? "8px" : "0" }}>
                              <audio
                                src={msg.image_url}
                                controls
                                style={{ width: "100%", maxWidth: "280px" }}
                              />
                            </div>
                          );
                        }
                        if (mType === "image") {
                          return (
                            <div style={{ marginBottom: msg.message_text ? "8px" : "0" }}>
                              <img
                                src={msg.image_url}
                                alt="Attachment"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "240px",
                                  borderRadius: "8px",
                                  objectFit: "contain",
                                  cursor: "pointer",
                                }}
                                onClick={() => setActiveLightboxImage(msg.image_url)}
                              />
                            </div>
                          );
                        }
                        // file fallback — premium download card
                        const fileName = getFileNameFromUrl(msg.image_url);
                        const fileIcon = getFileIcon(msg.image_url);
                        const fileExt = String(msg.image_url).split("?")[0].split(".").pop().toUpperCase();
                        return (
                          <div style={{ marginBottom: msg.message_text ? "8px" : "0" }}>
                            <a
                              href={msg.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                background: isHuman ? "rgba(5, 8, 22, 0.08)" : "rgba(255, 255, 255, 0.05)",
                                border: isHuman ? "1px solid rgba(5, 8, 22, 0.14)" : "1px solid rgba(255, 255, 255, 0.1)",
                                textDecoration: "none",
                                transition: "all 0.2s ease",
                                maxWidth: "280px",
                              }}
                              onMouseEnter={(e) => { 
                                e.currentTarget.style.background = isHuman ? "rgba(5, 8, 22, 0.14)" : "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.borderColor = isHuman ? "rgba(5, 8, 22, 0.24)" : "rgba(255, 255, 255, 0.2)";
                              }}
                              onMouseLeave={(e) => { 
                                e.currentTarget.style.background = isHuman ? "rgba(5, 8, 22, 0.08)" : "rgba(255, 255, 255, 0.05)";
                                e.currentTarget.style.borderColor = isHuman ? "rgba(5, 8, 22, 0.14)" : "rgba(255, 255, 255, 0.1)";
                              }}
                            >
                              <span style={{ fontSize: "28px", lineHeight: 1 }}>{fileIcon}</span>
                              <div style={{ flex: 1, overflow: "hidden" }}>
                                <div style={{ fontSize: "12px", color: isHuman ? "#050816" : "#f8fafc", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</div>
                                <div style={{ fontSize: "10px", color: isHuman ? "rgba(5, 8, 22, 0.65)" : "#94a3b8", marginTop: "2px", fontWeight: 600 }}>{fileExt} file • Click to download</div>
                              </div>
                            </a>
                          </div>
                        );
                      })()}
                      {msg.message_text}
                    </div>
                    <div className="handoff-msg-info">
                      <span className="handoff-sender-label">
                        {isHuman ? msg.sender_name || "Agent" : isBot ? "Chatbot" : "Customer"}
                      </span>
                      <span>•</span>
                      <span>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
              {sendingReply && (
                <div className="handoff-message-row handoff-message-human" style={{ opacity: 0.8, animation: "handoffPulse 1.5s infinite" }}>
                  <div className="handoff-speech-bubble handoff-bubble-human" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {mediaUrlToSend && (() => {
                      const mType = mediaTypeToSend;
                      if (mType === "video") {
                        return (
                          <div style={{ position: "relative" }}>
                            <video src={mediaUrlToSend} style={{ maxWidth: "100%", maxHeight: "150px", borderRadius: "8px", filter: "brightness(0.6)" }} muted />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span className="handoff-sending-spinner"></span>
                            </div>
                          </div>
                        );
                      }
                      if (mType === "audio") {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(5, 8, 22, 0.08)", borderRadius: "6px", border: "1px solid rgba(5, 8, 22, 0.14)" }}>
                            <span className="handoff-sending-spinner-small"></span>
                            <span style={{ fontSize: "11px", color: "rgba(5, 8, 22, 0.75)" }}>Sending Audio...</span>
                          </div>
                        );
                      }
                      if (mType === "image") {
                        return (
                          <div style={{ position: "relative" }}>
                            <img src={mediaUrlToSend} alt="Sending" style={{ maxWidth: "100%", maxHeight: "150px", borderRadius: "8px", filter: "brightness(0.6)" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span className="handoff-sending-spinner"></span>
                            </div>
                          </div>
                        );
                      }
                      // file
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", background: "rgba(5, 8, 22, 0.08)", border: "1px solid rgba(5, 8, 22, 0.14)", minWidth: "180px", maxWidth: "260px" }}>
                          <span className="handoff-sending-spinner-small"></span>
                          <div style={{ flex: 1, overflow: "hidden" }}>
                            <div style={{ fontSize: "12px", color: "#050816", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mediaFileNameToSend || "File"}</div>
                            <div style={{ fontSize: "10px", color: "rgba(5, 8, 22, 0.65)", marginTop: "2px" }}>Sending file...</div>
                          </div>
                        </div>
                      );
                    })()}
                    {replyText.trim() && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{replyText}</span>
                        {!mediaUrlToSend && <span className="handoff-sending-spinner-small"></span>}
                      </div>
                    )}
                  </div>
                  <div className="handoff-msg-info" style={{ justifyContent: "flex-end" }}>
                    <span className="handoff-sender-label">{agentName}</span>
                    <span>•</span>
                    <span style={{ fontStyle: "italic" }}>Sending...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
            <div className="handoff-input-area">
              {(mediaUrlToSend || uploadingMedia) && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  animation: "fadeIn 0.2s ease"
                }}>
                  {uploadingMedia ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#a0aec0" }}>
                      <span className="handoff-glow-dot" style={{ backgroundColor: "#ecc94b" }}></span>
                      Uploading media...
                    </div>
                  ) : (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      {mediaTypeToSend === "video" ? (
                        <video
                          src={mediaUrlToSend}
                          style={{ width: "80px", height: "60px", borderRadius: "6px", objectFit: "cover", border: "1px solid rgba(255, 255, 255, 0.2)" }}
                          muted
                        />
                      ) : mediaTypeToSend === "audio" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.2)" }}>
                          <span style={{ fontSize: "20px" }}>🎵</span>
                          <span style={{ fontSize: "11px", color: "#e2e8f0" }}>Audio file</span>
                        </div>
                      ) : mediaTypeToSend === "image" ? (
                        <img
                          src={mediaUrlToSend}
                          alt="Preview"
                          style={{ width: "60px", height: "60px", borderRadius: "6px", objectFit: "cover", border: "1px solid rgba(255, 255, 255, 0.2)" }}
                        />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.15)", maxWidth: "220px" }}>
                          <span style={{ fontSize: "24px" }}>{getFileIcon(mediaUrlToSend)}</span>
                          <div style={{ flex: 1, overflow: "hidden" }}>
                            <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mediaFileNameToSend || "File"}</div>
                            <div style={{ fontSize: "9px", color: "#718096", marginTop: "1px" }}>{String(mediaUrlToSend).split("?")[0].split(".").pop().toUpperCase()} file</div>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        style={{
                          position: "absolute",
                          top: "-6px",
                          right: "-6px",
                          background: "#e53e3e",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: "18px",
                          height: "18px",
                          fontSize: "11px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                        }}
                        onClick={() => { setMediaUrlToSend(""); setMediaTypeToSend(""); setMediaFileNameToSend(""); }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
              <form onSubmit={handleSendReply} className="handoff-input-row">
                <input
                  type="file"
                  id="handoff-media-upload"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar,.7z"
                  style={{ display: "none" }}
                  onChange={handleMediaUpload}
                  disabled={uploadingMedia || sendingReply}
                />
                <label
                  htmlFor="handoff-media-upload"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.07)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#e2e8f0",
                    cursor: "pointer",
                    fontSize: "20px",
                    transition: "all 0.2s ease",
                    alignSelf: "center",
                    marginRight: "8px"
                  }}
                  title="Upload Media (Image, Video, Audio, File)"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.borderColor = "var(--primary-gold)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  📎
                </label>
                <textarea
                  className="handoff-textarea"
                  placeholder="Type a message to reply... (type 'enable chatbot' to resume AI)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  disabled={sendingReply}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={sendingReply || uploadingMedia || enablingChatbot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 16px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#e2e8f0",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: (sendingReply || uploadingMedia || enablingChatbot) ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    opacity: (sendingReply || uploadingMedia || enablingChatbot) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!sendingReply && !uploadingMedia && !enablingChatbot) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.borderColor = "var(--primary-gold)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!sendingReply && !uploadingMedia && !enablingChatbot) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  title="Re-enable Chatbot AI"
                >
                  <span style={{ fontSize: "16px" }}>🤖</span>
                  <span className="hidden sm:inline">Enable AI</span>
                </button>
                <button
                  type="submit"
                  className="facebook-connect-button facebook-connect-button-primary px-6"
                  disabled={sendingReply || uploadingMedia || (!replyText.trim() && !mediaUrlToSend)}
                >
                  {sendingReply ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="handoff-chat-placeholder">
            <div className="handoff-placeholder-icon">🤖</div>
            <h2>Human Handoff Control</h2>
            <p className="max-w-md text-muted mt-2">
              Select a customer conversation from the list to view history, reply directly, or re-enable the AI chatbot.
            </p>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="handoff-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="handoff-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="handoff-modal-icon-wrapper">🤖</div>
            <h3 className="handoff-modal-title">Enable Chatbot?</h3>
            <p className="handoff-modal-text">
              Are you sure you want to re-enable the AI chatbot for this customer? The chatbot will take over automated replies.
            </p>
            <div className="handoff-modal-actions">
              <button
                type="button"
                className="handoff-modal-btn handoff-modal-btn-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={enablingChatbot}
              >
                Cancel
              </button>
              <button
                type="button"
                className="handoff-modal-btn handoff-modal-btn-confirm"
                onClick={() => handleEnableChatbot(true)}
                disabled={enablingChatbot}
              >
                {enablingChatbot ? "Enabling..." : "Enable Chatbot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeLightboxImage && (
        <div 
          className="handoff-modal-overlay" 
          style={{ zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          onClick={() => setActiveLightboxImage(null)}
        >
          <div 
            style={{ position: "relative", maxWidth: "90%", maxHeight: "90%", display: "flex", justifyContent: "center", alignItems: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeLightboxImage} 
              alt="Enlarged preview" 
              style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)", objectFit: "contain" }} 
            />
            <button 
              type="button" 
              style={{ 
                position: "absolute", 
                top: "-40px", 
                right: "0", 
                background: "rgba(255, 255, 255, 0.2)", 
                border: "none", 
                borderRadius: "50%", 
                width: "32px", 
                height: "32px", 
                color: "#fff", 
                fontSize: "18px", 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                transition: "background 0.2s"
              }}
              onClick={() => setActiveLightboxImage(null)}
              onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.4)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
