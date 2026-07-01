import { useEffect, useMemo, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import facebookIntegrationService from "../../../services/marketing/facebook_connect";
import { supabase } from "../../../config/supabaseClient";

export default function Client_FacebookInbox({ workspaceId: propWorkspaceId }) {
  const context = useOutletContext() || {};
  const workspaceId = propWorkspaceId || (
    typeof context?.workspace?.id === "string"
      ? context.workspace.id.trim()
      : ""
  );
  const [pages, setPages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [activeThreadId, setActiveThreadId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.threadId === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const filteredThreads = useMemo(() => {
    const query = typeof searchText === "string" ? searchText.toLowerCase().trim() : "";
    if (!query) return threads;
    return threads.filter((t) =>
      String(t.participantName || "Facebook User").toLowerCase().includes(query)
    );
  }, [threads, searchText]);

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const resolvePageName = (pageId) => {
    const page = pages.find((p) => String(p.pageId || "") === String(pageId));
    return page ? page.pageName : "Facebook Page";
  };

  const loadInbox = async (pageId = "", silent = false) => {
    if (!workspaceId) {
      setPages([]);
      setThreads([]);
      setSelectedPageId("");
      setActiveThreadId("");
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError("");

    try {
      const data = await facebookIntegrationService.getClientInboxByWorkspaceId(workspaceId, pageId);
      const nextPages = Array.isArray(data?.pages) ? data.pages : [];
      const nextThreads = Array.isArray(data?.threads) ? data.threads : [];
      const responsePageId = typeof data?.pageId === "string" ? data.pageId : "";
      const nextPageId = nextPages.some(
        (page) => String(page?.pageId || "") === responsePageId
      )
        ? responsePageId
        : "";

      const psids = nextThreads.map((t) => t.participantId).filter(Boolean);
      const profilePicMap = {};
      if (psids.length > 0) {
        try {
          const chunkSize = 50;
          for (let i = 0; i < psids.length; i += chunkSize) {
            const chunk = psids.slice(i, i + chunkSize);
            const { data: cachedConvs } = await supabase
              .from("facebook_conversations")
              .select("customer_psid, customer_profile_pic")
              .in("customer_psid", chunk);
            
            if (cachedConvs) {
              cachedConvs.forEach((c) => {
                if (c.customer_profile_pic) {
                  profilePicMap[c.customer_psid] = c.customer_profile_pic;
                }
              });
            }
          }
        } catch (dbErr) {
          console.error("Failed to fetch profile pics from cache:", dbErr);
        }
      }

      const threadsWithPics = nextThreads.map((t) => ({
        ...t,
        customerProfilePic: t.participantAvatar || profilePicMap[t.participantId] || null,
      }));

      setPages(nextPages);
      setThreads(threadsWithPics);
      setSelectedPageId(nextPageId);
      setActiveThreadId((current) => {
        if (current && nextThreads.some((thread) => thread.threadId === current)) {
          return current;
        }
        return nextThreads[0]?.threadId || "";
      });
    } catch (err) {
      setError(err?.message || "Failed to load Facebook inbox messages.");
      setPages([]);
      setThreads([]);
      setSelectedPageId("");
      setActiveThreadId("");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadInbox("");
  }, [workspaceId]);

  // Real-time Supabase Listeners to auto-reload on new messages/conversations
  useEffect(() => {
    if (!workspaceId || !selectedPageId) return;

    // Listener for regular chat bot conversations
    const channelNormal = supabase
      .channel(`inbox-normal-${selectedPageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facebook_conversations",
          filter: `page_id=eq.${selectedPageId}`,
        },
        (payload) => {
          loadInbox(selectedPageId, true);
        }
      )
      .subscribe();

    // Listener for human handoff conversations
    const channelHandoff = supabase
      .channel(`inbox-handoff-${selectedPageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_facebook_conversations",
          filter: `page_id=eq.${selectedPageId}`,
        },
        (payload) => {
          loadInbox(selectedPageId, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelNormal);
      supabase.removeChannel(channelHandoff);
    };
  }, [workspaceId, selectedPageId]);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages]);

  return (
    <div className="space-y-6">
      {!workspaceId && (
        <div className="facebook-connect-alert">
          Your workspace ID is not available yet. Contact your admin if this persists.
        </div>
      )}

      {error && (
        <div className="facebook-connect-alert">
          {error}
        </div>
      )}

      {pages.length === 0 && !loading && (
        <div className="facebook-connect-alert bg-gray-50 border-gray-200 text-gray-500 text-center py-8">
          No Facebook Pages are linked to your workspace yet.
        </div>
      )}

      {pages.length > 0 && (
        <div className="handoff-container">
          {/* Sidebar List */}
          <div className={`handoff-sidebar ${activeThread ? "handoff-sidebar-hidden" : ""}`}>
            <div className="handoff-search-wrapper" style={{ display: "flex", flexDirection: "column", gap: "10px", borderBottom: "1px solid var(--border-color)", padding: "16px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  className="handoff-search-input"
                  style={{ paddingLeft: "12px", flex: 1 }}
                  value={selectedPageId}
                  onChange={(event) => {
                    const nextPageId = event.target.value;
                    setSelectedPageId(nextPageId);
                    loadInbox(nextPageId);
                  }}
                  disabled={loading || pages.length === 0}
                >
                  {pages.length === 0 && <option value="">No pages</option>}
                  {pages.map((page) => (
                    <option key={page.pageId || page.pageName} value={page.pageId || ""}>
                      {page.pageName || "Facebook Page"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="facebook-connect-button facebook-connect-button-primary"
                  style={{ height: "38px", minWidth: "80px", padding: "0 12px", borderRadius: "12px", fontSize: "13px" }}
                  onClick={() => loadInbox(selectedPageId)}
                  disabled={loading}
                >
                  {loading ? "..." : "Refresh"}
                </button>
              </div>
              <input
                type="text"
                className="handoff-search-input"
                placeholder="Search people..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="handoff-conv-list">
              {loading && threads.length === 0 && (
                <div className="p-4 text-center text-xs text-muted">Loading conversations...</div>
              )}

              {!loading && filteredThreads.length === 0 && (
                <div className="p-6 text-center text-xs text-muted">No conversations found.</div>
              )}

              {filteredThreads.map((thread) => {
                const isActive = activeThreadId === thread.threadId;
                const initials = (thread.participantName || "F")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={thread.threadId}
                    className={`handoff-conv-item ${isActive ? "handoff-conv-item-active" : ""}`}
                    onClick={() => setActiveThreadId(thread.threadId)}
                  >
                    <div className="handoff-avatar">
                      {thread.customerProfilePic ? (
                        <img 
                          src={thread.customerProfilePic} 
                          alt={thread.participantName || "Facebook User"} 
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
                        <span className="handoff-customer-name">{thread.participantName || "Facebook User"}</span>
                        <span className="handoff-time">{formatTime(thread.updatedTime)}</span>
                      </div>
                      <p className="handoff-last-msg">{thread.snippet || "No preview"}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        <span className="handoff-page-label">
                          📄 {resolvePageName(selectedPageId)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`handoff-chat-area ${!activeThread ? "handoff-chat-area-hidden" : ""}`}>
            {activeThread ? (
              <>
                {/* Chat Header */}
                <div className="handoff-chat-header">
                  <div className="handoff-chat-title-info">
                    {/* Back button for mobile view */}
                    <button
                      type="button"
                      className="handoff-back-btn"
                      onClick={() => setActiveThreadId("")}
                    >
                      ←
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="handoff-avatar" style={{ width: "36px", height: "36px", fontSize: "13px" }}>
                        {activeThread.customerProfilePic ? (
                          <img 
                            src={activeThread.customerProfilePic} 
                            alt={activeThread.participantName || "Facebook User"} 
                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.parentNode.textContent = (activeThread.participantName || "F")
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase();
                            }}
                          />
                        ) : (
                          (activeThread.participantName || "F")
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="handoff-header-name">{activeThread.participantName || "Facebook User"}</h3>
                        <p className="handoff-header-meta">
                          📄 {resolvePageName(selectedPageId)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="handoff-messages-container" ref={chatContainerRef}>
                  {(activeThread.messages || []).map((message) => {
                    const isPage = message.isPageMessage;
                    let rowClass = "handoff-message-row";
                    let bubbleClass = "handoff-speech-bubble";

                    if (isPage) {
                      rowClass += " handoff-message-human";
                      bubbleClass += " handoff-bubble-human"; // Yellow / gold bubble
                    } else {
                      rowClass += " handoff-message-customer";
                      bubbleClass += " handoff-bubble-customer"; // Customer message bubble
                    }

                    return (
                      <div key={message.id || `${message.fromId}-${message.createdTime}`} className={rowClass}>
                        <div className={bubbleClass}>
                          {message.imageUrl && (() => {
                            const ext = String(message.imageUrl).split("?")[0].split(".").pop().toLowerCase();
                            const mType = ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext) ? "image"
                              : ["mp4","mov","avi","webm","mkv","m4v"].includes(ext) ? "video"
                              : ["mp3","wav","ogg","m4a","aac","flac"].includes(ext) ? "audio"
                              : "file";
                            if (mType === "video") {
                              return (
                                <div style={{ marginBottom: message.text ? "8px" : "0" }}>
                                  <video src={message.imageUrl} controls style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px" }} />
                                </div>
                              );
                            }
                            if (mType === "audio") {
                              return (
                                <div style={{ marginBottom: message.text ? "8px" : "0" }}>
                                  <audio src={message.imageUrl} controls style={{ width: "100%", maxWidth: "280px" }} />
                                </div>
                              );
                            }
                            if (mType === "image") {
                              return (
                                <div style={{ marginBottom: message.text ? "8px" : "0" }}>
                                  <img
                                    src={message.imageUrl}
                                    alt="Attachment"
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "240px",
                                      borderRadius: "8px",
                                      objectFit: "contain",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => setActiveLightboxImage(message.imageUrl)}
                                  />
                                </div>
                              );
                            }
                            const _url = message.imageUrl;
                            const _ext2 = String(_url).split("?")[0].split(".").pop().toLowerCase();
                            const _icon = ["pdf"].includes(_ext2) ? "📄" : ["doc","docx"].includes(_ext2) ? "📝" : ["xls","xlsx","csv"].includes(_ext2) ? "📊" : ["ppt","pptx"].includes(_ext2) ? "📑" : ["zip","rar","7z"].includes(_ext2) ? "🗜️" : ["txt","rtf"].includes(_ext2) ? "📃" : "📎";
                            const _segments = String(_url).split("?")[0].split("/");
                            const _rawName = decodeURIComponent(_segments[_segments.length - 1] || "File");
                            const _fileName = _rawName.replace(/^\d{13,}-[a-z0-9]+\./, "") || _rawName;
                            return (
                              <div style={{ marginBottom: message.text ? "8px" : "0" }}>
                                <a
                                  href={_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    background: isPage ? "rgba(5, 8, 22, 0.08)" : "rgba(255, 255, 255, 0.05)",
                                    border: isPage ? "1px solid rgba(5, 8, 22, 0.14)" : "1px solid rgba(255, 255, 255, 0.1)",
                                    textDecoration: "none",
                                    transition: "all 0.2s ease",
                                    maxWidth: "280px",
                                  }}
                                  onMouseEnter={(e) => { 
                                    e.currentTarget.style.background = isPage ? "rgba(5, 8, 22, 0.14)" : "rgba(255, 255, 255, 0.1)";
                                    e.currentTarget.style.borderColor = isPage ? "rgba(5, 8, 22, 0.24)" : "rgba(255, 255, 255, 0.2)";
                                  }}
                                  onMouseLeave={(e) => { 
                                    e.currentTarget.style.background = isPage ? "rgba(5, 8, 22, 0.08)" : "rgba(255, 255, 255, 0.05)";
                                    e.currentTarget.style.borderColor = isPage ? "rgba(5, 8, 22, 0.14)" : "rgba(255, 255, 255, 0.1)";
                                  }}
                                >
                                  <span style={{ fontSize: "28px", lineHeight: 1 }}>{_icon}</span>
                                  <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontSize: "12px", color: isPage ? "#050816" : "#f8fafc", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{_fileName}</div>
                                    <div style={{ fontSize: "10px", color: isPage ? "rgba(5, 8, 22, 0.65)" : "#94a3b8", marginTop: "2px", fontWeight: 600 }}>{_ext2.toUpperCase()} file • Click to download</div>
                                  </div>
                                </a>
                              </div>
                            );
                          })()}
                          {message.text}
                        </div>
                        <div className="handoff-msg-info">
                          <span className="handoff-sender-label">
                            {isPage ? message.fromName || "Page" : "Customer"}
                          </span>
                          <span>•</span>
                          <span>{formatTime(message.createdTime)}</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {(!Array.isArray(activeThread.messages) || activeThread.messages.length === 0) && (
                    <div className="text-center text-xs text-muted py-6">No messages in this chat.</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              <div className="handoff-chat-placeholder">
                <div className="handoff-placeholder-icon">📬</div>
                <h2>Facebook Page Inbox</h2>
                <p className="max-w-md text-muted mt-2">
                  Select a conversation from the left list to view its message history.
                </p>
              </div>
            )}
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
