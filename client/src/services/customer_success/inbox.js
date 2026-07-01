export const INBOX_CATEGORIES = ["Inbox", "Starred", "Sent", "Internal", "Archived"];

export const mockConversations = [
  {
    id: 1,
    category: "Inbox",
    type: "customer",
    subject: "Re: ERP Implementation Timeline",
    preview: "Hi James, thanks for the update. Can we schedule a call to discuss Sprint 2 scope?",
    from: "Maria Santos",
    fromEmail: "msantos@accenture.ph",
    to: "James Reyes",
    date: "2026-05-05",
    time: "10:32 AM",
    unread: true,
    starred: false,
    linkedTo: { type: "project", name: "ERP Implementation – Accenture PH" },
    tags: ["ERP", "Priority"],
    messages: [
      {
        id: 1,
        from: "James Reyes",
        internal: false,
        date: "2026-05-04",
        time: "3:00 PM",
        body: "Hi Maria, Sprint 1 has been completed successfully. We are now planning Sprint 2 scope. I will send over a detailed breakdown shortly.",
      },
      {
        id: 2,
        from: "Maria Santos",
        internal: false,
        date: "2026-05-05",
        time: "10:32 AM",
        body: "Hi James, thanks for the update. Can we schedule a call to discuss Sprint 2 scope? We have additional requirements from the finance team.",
      },
    ],
  },
  {
    id: 2,
    category: "Inbox",
    type: "customer",
    subject: "Onboarding Checklist – TechCorp",
    preview: "Please find attached the completed onboarding checklist. We are ready to proceed.",
    from: "Carlos Dela Cruz",
    fromEmail: "c.delacruz@techcorp.ph",
    to: "Ana Lim",
    date: "2026-05-05",
    time: "9:15 AM",
    unread: true,
    starred: false,
    linkedTo: { type: "project", name: "SaaS Onboarding – TechCorp Manila" },
    tags: ["Onboarding"],
    messages: [
      {
        id: 1,
        from: "Ana Lim",
        internal: false,
        date: "2026-05-02",
        time: "11:00 AM",
        body: "Hi Carlos, please find the onboarding checklist attached. Please review and return with your team's signatures.",
      },
      {
        id: 2,
        from: "Carlos Dela Cruz",
        internal: false,
        date: "2026-05-05",
        time: "9:15 AM",
        body: "Please find attached the completed onboarding checklist. We are ready to proceed with data migration next week.",
      },
    ],
  },
  {
    id: 3,
    category: "Internal",
    type: "internal",
    subject: "Sprint 2 Planning Notes",
    preview: "Team, here are the notes from today's sprint planning. Please review before EOD.",
    from: "James Reyes",
    fromEmail: "james@hermes.ph",
    to: "Team",
    date: "2026-05-05",
    time: "2:00 PM",
    unread: false,
    starred: true,
    linkedTo: { type: "project", name: "ERP Implementation – Accenture PH" },
    tags: ["Internal", "Sprint"],
    messages: [
      {
        id: 1,
        from: "James Reyes",
        internal: true,
        date: "2026-05-05",
        time: "2:00 PM",
        body: "Team, here are the notes from today's sprint planning:\n\n1. Focus on database schema for HR module\n2. API endpoints for inventory due May 15\n3. Daily standups at 9am\n\nPlease review and flag blockers.",
      },
      {
        id: 2,
        from: "Ana Lim",
        internal: true,
        date: "2026-05-05",
        time: "3:30 PM",
        body: "Noted. I'll have the inventory endpoints ready by May 12 as a buffer.",
      },
    ],
  },
  {
    id: 4,
    category: "Inbox",
    type: "customer",
    subject: "Payment Gateway – Urgent",
    preview: "We have decided to go with Stripe. Please proceed with integration immediately.",
    from: "Raj Patel",
    fromEmail: "r.patel@ecommhub.ph",
    to: "Sofia Mendoza",
    date: "2026-05-03",
    time: "11:20 AM",
    unread: true,
    starred: false,
    linkedTo: { type: "project", name: "E-Commerce Portal – EComm Hub" },
    tags: ["Urgent", "Blocked"],
    messages: [
      {
        id: 1,
        from: "Sofia Mendoza",
        internal: false,
        date: "2026-04-30",
        time: "9:00 AM",
        body: "Hi Raj, the project is currently blocked pending your decision on the payment gateway provider. Please advise ASAP.",
      },
      {
        id: 2,
        from: "Raj Patel",
        internal: false,
        date: "2026-05-03",
        time: "11:20 AM",
        body: "Hi Sofia, apologies for the delay. We have decided to go with Stripe. Please proceed with integration immediately.",
      },
    ],
  },
];

export async function getInboxData() {
  return {
    conversations: mockConversations,
    categories: INBOX_CATEGORIES,
  };
}

export async function sendMessage(conversationId, message) {
  return {
    conversationId,
    message: {
      id: Date.now(),
      ...message,
    },
  };
}

export async function markAsRead(id) {
  return { id };
}

export async function toggleStar(id) {
  return { id };
}

export async function archiveConversation(id) {
  return { id };
}
