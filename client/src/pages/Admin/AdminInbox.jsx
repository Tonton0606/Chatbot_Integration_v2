import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles, Target, Zap, Bot, Send, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";

import {
  InboxHeader,
  InboxKPICards,
  InboxTabs,
  InboxSearchBar,
  ConversationItem,
  ConversationThread,
  InboxLoadingState,
  InboxErrorState,
} from "../../components/admin/layout/Admin_Inbox_Components.jsx";

import {
  getInboxData,
  sendMessage,
  markAsRead,
} from "../../services/customer_success/inbox";

export default function AdminInbox() {
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI State
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponses, setAiResponses] = useState({});

  // AI Functions
  async function generateAIInsights() {
    setAiLoading(true);
    try {
      const insights = await aiModules.generateBusinessInsights({
        conversations,
        module: 'inbox'
      }, 'current_month');
      setAiInsights(insights);
    } catch (err) {
      console.error("AI insights error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function generateAIResponse(conversation) {
    setAiLoading(true);
    try {
      const response = await aiModules.generateSupportResponse(conversation);
      setAiResponses(prev => ({ ...prev, [conversation.id]: response }));
    } catch (err) {
      console.error("AI response error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function categorizeTickets() {
    setAiLoading(true);
    try {
      await aiModules.categorizeSupportTickets(conversations);
    } catch (err) {
      console.error("Categorization error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
    try {
      setLoading(true);
      setError("");

      const data = await getInboxData();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Inbox load error:", err);
      setError(err.message || "Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectConversation(conversation) {
    setSelectedConversation(conversation);

    if (conversation.unread) {
      await markAsRead(conversation.id);

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation.id ? { ...item, unread: false } : item
        )
      );
    }
  }

  async function handleReply(conversationId, text) {
    if (!text.trim()) return;

    const message = {
      id: Date.now(),
      from: "Me",
      fromInitials: "ME",
      internal: false,
      date: new Date().toISOString(),
      time: "Now",
      body: text,
    };

    await sendMessage(conversationId, message);

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, messages: [...conversation.messages, message] }
          : conversation
      )
    );

    setSelectedConversation((prev) =>
      prev?.id === conversationId
        ? { ...prev, messages: [...prev.messages, message] }
        : prev
    );
  }

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conversation) => {
        if (activeTab === "unread") return conversation.unread;
        if (activeTab === "archived") return conversation.category === "Archived";
        if (activeTab === "internal") return conversation.category === "Internal";
        if (activeTab === "starred") return conversation.starred;
        return conversation.category === "Inbox" || conversation.category === "Internal";
      })
      .filter((conversation) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;

        return (
          conversation.subject.toLowerCase().includes(keyword) ||
          conversation.from.toLowerCase().includes(keyword) ||
          conversation.preview.toLowerCase().includes(keyword) ||
          conversation.linkedTo?.name?.toLowerCase().includes(keyword)
        );
      });
  }, [conversations, activeTab, search]);

  const unreadCount = conversations.filter((item) => item.unread).length;
  const archivedCount = conversations.filter((item) => item.category === "Archived").length;
  const newMessages = conversations.filter(
    (item) => item.unread && item.category === "Inbox"
  ).length;

  return (
    <div className="space-y-6">
      <InboxHeader onRefresh={loadInbox} />

      {/* AI Inbox Intelligence */}
      <Card className="border-[#c9a84c]/30 bg-gradient-to-r from-[#c9a84c]/10 to-[#ea580c]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#c9a84c]" />
            AI Inbox Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Sparkles}
              loading={aiLoading}
              onClick={generateAIInsights}
            >
              Generate Insights
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Bot}
              onClick={() => generateAIResponse(conversations[0])}
              disabled={!conversations.length}
            >
              AI Response
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Target}
              loading={aiLoading}
              onClick={categorizeTickets}
            >
              Categorize Tickets
            </Button>
          </div>
          {aiInsights && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{aiInsights.executiveSummary}</p>
              <div className="flex flex-wrap gap-2">
                {aiInsights.keyFindings?.slice(0, 3).map((finding, i) => (
                  <Badge key={i} variant="info" className="text-xs">{finding}</Badge>
                ))}
              </div>
            </div>
          )}
          {Object.keys(aiResponses).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">AI Generated Responses:</p>
              <div className="space-y-2">
                {Object.entries(aiResponses).slice(0, 3).map(([convId, response]) => (
                  <div key={convId} className="p-2 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 rounded text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{conversations.find(c => c.id === convId)?.subject?.slice(0, 30)}...</span>
                      <Badge variant="success">AI Ready</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{response.response?.slice(0, 60)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && <InboxLoadingState />}

      {!loading && error && <InboxErrorState message={error} onRetry={loadInbox} />}

      {!loading && !error && (
        <>
          <InboxKPICards
            unreadCount={unreadCount}
            archivedCount={archivedCount}
            newMessages={newMessages}
            totalConversations={conversations.length}
          />

          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[var(--border-color)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <InboxTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setSelectedConversation(null);
                }}
                unreadCount={unreadCount}
              />

              <InboxSearchBar search={search} onSearchChange={setSearch} />
            </div>

            {selectedConversation ? (
              <div className="grid min-h-[540px] lg:grid-cols-[320px_1fr]">
                <div className="border-r border-[var(--border-color)]">
                  {filteredConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      selected={selectedConversation}
                      onClick={() => handleSelectConversation(conversation)}
                    />
                  ))}
                </div>

                <ConversationThread
                  conversation={selectedConversation}
                  onReply={handleReply}
                  onBack={() => setSelectedConversation(null)}
                />
              </div>
            ) : (
              <div>
                {filteredConversations.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="text-4xl">📭</div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No messages found</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Your inbox is clean.</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      selected={selectedConversation}
                      onClick={() => handleSelectConversation(conversation)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* AI Assistant Widget */}

    </div>
  );
}
