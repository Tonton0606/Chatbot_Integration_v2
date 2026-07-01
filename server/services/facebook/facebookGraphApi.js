const FB_GRAPH_API_BASE = "https://graph.facebook.com/v22.0";

// ── Per-recipient message rate guard ─────────────────────────────────────────
// Facebook allows ~200 messages/sec globally but will soft-ban chatbots that
// flood individual users. Limit: max 5 messages per recipient per 10 seconds.
const _recipientWindows = new Map();
const FB_RATE_MAX = 5;
const FB_RATE_WINDOW_MS = 10_000;

function _checkRecipientRate(recipientId) {
  const now = Date.now();
  const entry = _recipientWindows.get(recipientId) || { count: 0, windowStart: now };
  if (now - entry.windowStart > FB_RATE_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  _recipientWindows.set(recipientId, entry);
  if (entry.count > FB_RATE_MAX) {
    throw new Error(`[FacebookAPI] Rate limit: too many messages to recipient ${recipientId} in ${FB_RATE_WINDOW_MS / 1000}s`);
  }
}

// Prune stale recipients every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - FB_RATE_WINDOW_MS * 6;
  for (const [id, entry] of _recipientWindows) {
    if (entry.windowStart < cutoff) _recipientWindows.delete(id);
  }
}, 5 * 60 * 1000);

function normalizePageId(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildGraphUrl(pathname, params = {}) {
  const url = new URL(`${FB_GRAPH_API_BASE}/${pathname}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function createFacebookGraphApi({ getFacebookConfig }) {
  if (typeof getFacebookConfig !== "function") {
    throw new Error("getFacebookConfig is required for facebookGraphApi service.");
  }

  async function resolvePageAccessToken(context = {}) {
    const directToken =
      typeof context.pageAccessToken === "string" &&
      context.pageAccessToken.trim();

    if (directToken) {
      return directToken;
    }

    const config = await getFacebookConfig({ pageId: context.pageId });
    return config.pageAccessToken;
  }

  async function fetchFacebookPageConversations(page = {}, options = {}) {
    const normalizedPageId = normalizePageId(page.pageId);
    const pageAccessToken = normalizeText(page.pageAccessToken);

    if (!normalizedPageId || !pageAccessToken) {
      return [];
    }

    const conversationLimit = Math.min(
      25,
      Math.max(1, Number(options.conversationLimit) || 10)
    );
    const messageLimit = Math.min(
      50,
      Math.max(1, Number(options.messageLimit) || 15)
    );

    const conversationsUrl = buildGraphUrl(
      `${encodeURIComponent(normalizedPageId)}/conversations`,
      {
        fields:
          "id,updated_time,snippet,message_count,participants.limit(10){id,name}",
        limit: conversationLimit,
        access_token: pageAccessToken,
      }
    );

    const conversationsResponse = await fetch(conversationsUrl, {
      method: "GET",
    });

    if (!conversationsResponse.ok) {
      const details = await conversationsResponse.text();
      throw new Error(
        `Facebook Conversations API error (${conversationsResponse.status}): ${details}`
      );
    }

    const conversationsPayload = await conversationsResponse.json();
    const conversations = Array.isArray(conversationsPayload?.data)
      ? conversationsPayload.data
      : [];

    const threads = await Promise.all(
      conversations.map(async (conversation) => {
        const conversationId = normalizeText(conversation?.id);
        if (!conversationId) return null;

        const participants = Array.isArray(conversation?.participants?.data)
          ? conversation.participants.data
          : [];

        const customerParticipant = participants.find(
          (participant) => normalizePageId(participant?.id) !== normalizedPageId
        );

        const messagesUrl = buildGraphUrl(
          `${encodeURIComponent(conversationId)}/messages`,
          {
            fields: "id,message,created_time,from{id,name},attachments{id,mime_type,name,size,url}",
            limit: messageLimit,
            access_token: pageAccessToken,
          }
        );

        const messagesResponse = await fetch(messagesUrl, { method: "GET" });

        if (!messagesResponse.ok) {
          const details = await messagesResponse.text();
          throw new Error(
            `Facebook Messages API error (${messagesResponse.status}): ${details}`
          );
        }

        const messagesPayload = await messagesResponse.json();
        const rawMessages = Array.isArray(messagesPayload?.data)
          ? messagesPayload.data
          : [];

        const ordered = rawMessages.slice().reverse();

        const messages = ordered
          .map((msg) => {
            const text = normalizeText(msg?.message);
            
            // Extract image attachment URL
            const attachments = msg?.attachments?.data || [];
            const imageAttachment = attachments.find(
              (a) => String(a.mime_type || "").startsWith("image/") || a.url
            );
            const imageUrl = imageAttachment ? imageAttachment.url : null;

            if (!text && !imageUrl) return null;

            const fromId = normalizePageId(msg?.from?.id);
            const fromName = normalizeText(msg?.from?.name) || "Unknown";

            return {
              id: normalizeText(msg?.id),
              text,
              imageUrl,
              fromId,
              fromName,
              createdTime: normalizeText(msg?.created_time),
              isPageMessage: fromId === normalizedPageId,
            };
          })
          .filter(Boolean);

        return {
          threadId: conversationId,
          participantId: normalizePageId(customerParticipant?.id),
          participantName:
            normalizeText(customerParticipant?.name) || "Facebook User",
          updatedTime: normalizeText(conversation?.updated_time),
          snippet: normalizeText(conversation?.snippet),
          messageCount: Number(conversation?.message_count) || messages.length,
          messages,
        };
      })
    );

    return threads.filter(Boolean);
  }

  async function sendFacebookMessage(recipientId, text, context = {}) {
    _checkRecipientRate(recipientId);
    const pageAccessToken = await resolvePageAccessToken(context);

    if (!pageAccessToken) {
      throw new Error("Missing Facebook Page token from Supabase (fb_pages.fb_token)");
    }

    // Build message payload — supports image, video, audio, file attachments
    const mediaUrl = context.mediaUrl || context.imageUrl;
    const messagePayload = {};
    if (mediaUrl) {
      // Determine attachment type: image | video | audio | file
      const allowedTypes = ["image", "video", "audio", "file"];
      let attachType = allowedTypes.includes(context.mediaType) ? context.mediaType : null;
      if (!attachType) {
        // Auto-detect from URL extension
        const ext = String(mediaUrl).split("?")[0].split(".").pop().toLowerCase();
        if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) attachType = "image";
        else if (["mp4", "mov", "avi", "webm", "mkv", "m4v"].includes(ext)) attachType = "video";
        else if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) attachType = "audio";
        else attachType = "file";
      }
      messagePayload.attachment = {
        type: attachType,
        payload: { url: mediaUrl, is_reusable: true },
      };
    } else if (Array.isArray(context.cards) && context.cards.length > 0) {
      // Generic template (single card or carousel)
      messagePayload.attachment = {
        type: "template",
        payload: {
          template_type: "generic",
          elements: context.cards.slice(0, 10),
        },
      };
    } else if (Array.isArray(context.buttons) && context.buttons.length > 0) {
      // Button template (text + up to 3 buttons)
      messagePayload.attachment = {
        type: "template",
        payload: {
          template_type: "button",
          text: String(text || "").slice(0, 640) || " ",
          buttons: context.buttons.slice(0, 3),
        },
      };
    } else {
      messagePayload.text = text;
    }

    // Quick replies attach to any non-template message (text or media).
    if (
      Array.isArray(context.quickReplies) &&
      context.quickReplies.length > 0 &&
      !messagePayload.attachment?.payload?.template_type
    ) {
      messagePayload.quick_replies = context.quickReplies
        .slice(0, 13)
        .map((qr) => ({
          content_type: "text",
          title: String(qr.title || "").slice(0, 20),
          payload: String(qr.payload || qr.title || ""),
        }));
    }

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(
        pageAccessToken
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message: messagePayload,
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Facebook Send API error (${response.status}): ${details}`);
    }
  }

  async function sendFacebookSenderAction(recipientId, action, context = {}) {
    const pageAccessToken = await resolvePageAccessToken(context);

    if (!pageAccessToken) {
      throw new Error("Missing Facebook Page token from Supabase (fb_pages.fb_token)");
    }

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(
        pageAccessToken
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: action,
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Facebook sender action error (${response.status}): ${details}`
      );
    }
  }

  async function subscribeFacebookPageToApp(context = {}) {
    const normalizedPageId = normalizePageId(context.pageId);
    const pageAccessToken = await resolvePageAccessToken(context);

    if (!normalizedPageId) {
      throw new Error("pageId is required to subscribe Facebook page webhooks.");
    }

    if (!pageAccessToken) {
      throw new Error("Missing Facebook Page token from Supabase (fb_pages.fb_token)");
    }

    const response = await fetch(
      buildGraphUrl(`${encodeURIComponent(normalizedPageId)}/subscribed_apps`, {
        subscribed_fields: "messages,messaging_postbacks,messaging_referrals,feed",
        access_token: pageAccessToken,
      }),
      { method: "POST" }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        `Facebook subscribed_apps error (${response.status}): ${JSON.stringify(payload)}`
      );
    }

    return payload;
  }

  /**
   * Send a message with quick-reply buttons.
   * replies: [{ title: "Yes", payload: "YES" }, ...]  (max 13, title max 20 chars)
   */
  async function sendQuickReplies(recipientId, text, replies, context = {}) {
    _checkRecipientRate(recipientId);
    const pageAccessToken = await resolvePageAccessToken(context);
    if (!pageAccessToken) throw new Error("Missing Facebook Page token");

    const quickReplies = replies.slice(0, 13).map((r) => ({
      content_type: "text",
      title: String(r.title).slice(0, 20),
      payload: r.payload || r.title,
    }));

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message: { text, quick_replies: quickReplies },
        }),
      }
    );
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Facebook Quick Replies error (${response.status}): ${details}`);
    }
  }

  /**
   * Send a horizontal product carousel (Generic Template).
   * products: [{ title, subtitle, image_url, url, buttons: [{title, url}] }]  (max 10 cards)
   */
  async function sendProductCarousel(recipientId, products, context = {}) {
    _checkRecipientRate(recipientId);
    const pageAccessToken = await resolvePageAccessToken(context);
    if (!pageAccessToken) throw new Error("Missing Facebook Page token");

    const elements = products.slice(0, 10).map((p) => ({
      title: String(p.title || "Product").slice(0, 80),
      subtitle: p.subtitle ? String(p.subtitle).slice(0, 80) : undefined,
      image_url: p.image_url || undefined,
      default_action: p.url
        ? { type: "web_url", url: p.url, webview_height_ratio: "TALL" }
        : undefined,
      buttons: (p.buttons || []).slice(0, 3).map((b) => ({
        type: "web_url",
        url: b.url || p.url || "#",
        title: String(b.title || "View").slice(0, 20),
      })),
    }));

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements,
              },
            },
          },
        }),
      }
    );
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Facebook Carousel error (${response.status}): ${details}`);
    }
  }

  // Sets the Messenger profile (Get Started button + persistent menu) for a page.
  async function setMessengerProfile(context = {}, profile = {}) {
    const pageAccessToken = await resolvePageAccessToken(context);

    if (!pageAccessToken) {
      throw new Error("Missing Facebook Page token from Supabase (fb_pages.fb_token)");
    }

    const body = {};
    if (profile.getStarted) {
      body.get_started = { payload: String(profile.getStarted) };
    }
    if (Array.isArray(profile.iceBreakers) && profile.iceBreakers.length > 0) {
      body.ice_breakers = [
        {
          question: String(profile.iceBreakers[0].question).slice(0, 80),
          payload: String(profile.iceBreakers[0].payload)
        }
      ];
      // Note: Facebook ice_breakers can take an array, let's map them properly
      body.ice_breakers = profile.iceBreakers.slice(0, 4).map(ib => ({
        question: String(ib.question || "").slice(0, 80),
        payload: String(ib.payload || ib.question || "")
      }));
      // Ice breakers are per locale, so wrap it
      body.ice_breakers = [{
        locale: "default",
        call_to_actions: profile.iceBreakers.slice(0, 4).map(ib => ({
          question: String(ib.question || "").slice(0, 80),
          payload: String(ib.payload || ib.question || "")
        }))
      }];
    } else {
       // if iceBreakers is explicitly an empty array, we can clear them by sending empty array? Actually no, messenger profile requires deleting if empty, but we can try sending empty array
    }
    if (Array.isArray(profile.persistentMenu) && profile.persistentMenu.length > 0) {
      body.persistent_menu = [
        {
          locale: "default",
          composer_input_disabled: false,
          call_to_actions: profile.persistentMenu.slice(0, 3),
        },
      ];
    }

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/me/messenger_profile?access_token=${encodeURIComponent(
        pageAccessToken
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        `Facebook messenger_profile error (${response.status}): ${JSON.stringify(payload)}`
      );
    }

    return payload;
  }

  // Posts a public reply to a comment.
  async function postCommentReply(commentId, message, context = {}) {
    const pageAccessToken = await resolvePageAccessToken(context);

    if (!pageAccessToken) {
      throw new Error("Missing Facebook Page token from Supabase (fb_pages.fb_token)");
    }
    if (!commentId) {
      throw new Error("commentId is required to reply to a comment.");
    }

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/${encodeURIComponent(commentId)}/comments?access_token=${encodeURIComponent(
        pageAccessToken
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: String(message || "") }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Facebook comment reply error (${response.status}): ${details}`);
    }

    return response.json().catch(() => ({}));
  }

  // Opens a Messenger thread by privately replying to a comment (one per comment).
  async function sendPrivateReply(commentId, message, context = {}) {
    const pageAccessToken = await resolvePageAccessToken(context);

    if (!pageAccessToken) {
      throw new Error("Missing Facebook Page token from Supabase (fb_pages.fb_token)");
    }
    if (!commentId) {
      throw new Error("commentId is required to send a private reply.");
    }

    const response = await fetch(
      `${FB_GRAPH_API_BASE}/${encodeURIComponent(commentId)}/private_replies?access_token=${encodeURIComponent(
        pageAccessToken
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: String(message || "") }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Facebook private reply error (${response.status}): ${details}`);
    }

    return response.json().catch(() => ({}));
  }

  return {
    fetchFacebookPageConversations,
    subscribeFacebookPageToApp,
    sendFacebookMessage,
    sendFacebookSenderAction,
    sendQuickReplies,
    sendProductCarousel,
    setMessengerProfile,
    postCommentReply,
    sendPrivateReply,
  };
}

function getTypingDelayMs(text) {
  const length = typeof text === "string" ? text.length : 0;
  const raw = Math.round(length * 25);

  return Math.min(2500, Math.max(700, raw));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  FB_GRAPH_API_BASE,
  buildGraphUrl,
  createFacebookGraphApi,
  getTypingDelayMs,
  normalizePageId,
  normalizeText,
  sleep,
};
