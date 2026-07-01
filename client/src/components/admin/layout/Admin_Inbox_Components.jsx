import { useState } from "react";
import {
  AlertCircle,
  Archive,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Star,
} from "lucide-react";

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Avatar({ name, size = "h-9 w-9" }) {
  const initials = String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-gold)] text-xs font-bold text-white`}>
      {initials}
    </div>
  );
}

export function InboxHeader({ onRefresh }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">Inbox</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage conversations and messages linked to business records.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-cyan)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-cyan)]/90"
        >
          <MessageSquare className="h-4 w-4" />
          Compose
        </button>
      </div>
    </div>
  );
}

export function InboxLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-cyan)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">Loading inbox...</p>
    </div>
  );
}

export function InboxErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load inbox</h3>
          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--danger)]/90"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function InboxKPICards({ unreadCount, archivedCount, newMessages, totalConversations }) {
  const cards = [
    { label: "New Messages", value: newMessages, icon: Mail, color: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]" },
    { label: "Unread", value: unreadCount, icon: Inbox, color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]" },
    { label: "Archived", value: archivedCount, icon: Archive, color: "text-[var(--success)] bg-[var(--success-soft)] border-[var(--success)]/20" },
    { label: "Conversations", value: totalConversations, icon: MessageSquare, color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{card.label}</p>
                <h3 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">{card.value}</h3>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InboxTabs({ activeTab, onTabChange, unreadCount }) {
  const tabs = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "internal", label: "Internal" },
    { key: "starred", label: "Starred" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="flex flex-wrap gap-5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={
            activeTab === tab.key
              ? "border-b-2 border-[var(--brand-cyan)] pb-2 text-sm font-semibold text-[var(--brand-cyan)]"
              : "pb-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function InboxSearchBar({ search, onSearchChange }) {
  return (
    <div className="relative w-full lg:w-72">
      <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
      <input
        className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-cyan)]"
        placeholder="Search messages..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}

export function ConversationItem({ conversation, selected, onClick }) {
  const isSelected = selected?.id === conversation.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isSelected
          ? "flex w-full gap-3 border-b border-[var(--border-color)] border-l-4 border-l-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] p-4 text-left"
          : conversation.unread
          ? "flex w-full gap-3 border-b border-[var(--border-color)] border-l-4 border-l-transparent bg-[var(--brand-cyan-soft)]/30 p-4 text-left hover:bg-[var(--hover-bg)]"
          : "flex w-full gap-3 border-b border-[var(--border-color)] border-l-4 border-l-transparent bg-[var(--bg-card)] p-4 text-left hover:bg-[var(--hover-bg)]"
      }
    >
      <div className="relative">
        <Avatar name={conversation.from} />
        {conversation.unread && (
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand-cyan)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={conversation.unread ? "truncate font-bold text-[var(--text-primary)]" : "truncate font-semibold text-[var(--text-primary)]"}>
            {conversation.from}
          </p>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">{conversation.time}</span>
        </div>

        <p className={conversation.unread ? "mt-1 truncate text-sm font-semibold text-[var(--text-primary)]" : "mt-1 truncate text-sm text-[var(--text-secondary)]"}>
          {conversation.subject}
        </p>

        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{conversation.preview}</p>

        {conversation.linkedTo && (
          <p className="mt-2 truncate text-xs font-semibold text-[var(--brand-cyan)]">
            Linked {conversation.linkedTo.type}: {conversation.linkedTo.name}
          </p>
        )}
      </div>

      {conversation.starred && <Star className="h-4 w-4 shrink-0 text-[var(--brand-gold)]" />}
    </button>
  );
}

export function ConversationThread({ conversation, onReply, onBack }) {
  const [replyText, setReplyText] = useState("");

  if (!conversation) return null;

  return (
    <div className="flex min-h-[540px] flex-col">
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-3 text-sm font-semibold text-[var(--brand-cyan)]">
            ← Back
          </button>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{conversation.subject}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              From <span className="font-semibold text-[var(--text-primary)]">{conversation.from}</span>{" "}
              &lt;{conversation.fromEmail}&gt;
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {conversation.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-cyan)]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {conversation.linkedTo && (
          <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm">
            <span className="font-semibold text-[var(--brand-cyan)]">
              {conversation.linkedTo.type}:
            </span>{" "}
            {conversation.linkedTo.name}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--hover-bg)] p-5">
        {conversation.messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <Avatar name={message.from} />

            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">{message.from}</span>
                  {message.internal && (
                    <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-0.5 text-xs font-bold text-[var(--brand-gold)]">
                      INTERNAL
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(message.date)} {message.time}
                </span>
              </div>

              <div className={message.internal ? "rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4 text-sm leading-6 text-[var(--text-secondary)]" : "rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-sm leading-6 text-[var(--text-secondary)]"}>
                {message.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4">
        <textarea
          className="min-h-24 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-sm outline-none focus:border-[var(--brand-cyan)]"
          placeholder={`Reply to ${conversation.from}...`}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onReply?.(conversation.id, replyText);
              setReplyText("");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-cyan)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-cyan)]/90"
          >
            <Send className="h-4 w-4" />
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}
