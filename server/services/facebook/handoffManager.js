const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const { createFacebookConfigService } = require("./facebookConfig");
const { createFacebookGraphApi } = require("./facebookGraphApi");

const facebookConfigService = createFacebookConfigService({
  supabaseClient: supabase,
  runtimeConfig: {
    pageId: "",
    pageName: "",
    pageAccessToken: "",
    businessType: "",
    productServices: "",
    productServicePriceRanges: "",
    websiteLink: "",
    shoppeLink: "",
    lazadaLink: "",
    knowledge: "",
    connectedWorkspaceId: "",
    verifyToken: "",
    appSecret: "",
  },
  env: process.env,
});

const facebookGraphApi = createFacebookGraphApi({
  getFacebookConfig: facebookConfigService.getFacebookConfig,
});

const { sendFacebookMessage } = facebookGraphApi;

const axios = require("axios");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchFacebookUserProfile(senderId, pageAccessToken) {
  if (!senderId || !pageAccessToken) return null;
  try {
    const url = `https://graph.facebook.com/v22.0/${senderId}?fields=first_name,last_name,name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;
    const response = await axios.get(url);
    if (response.status === 200 && response.data) {
      return {
        name: response.data.name || [response.data.first_name, response.data.last_name].filter(Boolean).join(" ") || null,
        profilePic: response.data.profile_pic || null
      };
    }
  } catch (err) {
    logger.warn({ err: err.message }, "[Facebook Profile Fetch Error]");
  }
  return null;
}

async function fetchFacebookPageParticipants(pageId, pageAccessToken) {
  if (!pageId || !pageAccessToken) return {};
  try {
    const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(pageId)}/conversations?fields=participants{id,name}&limit=100&access_token=${encodeURIComponent(pageAccessToken)}`;
    const response = await axios.get(url);
    const nameMap = {};
    if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
      response.data.data.forEach(thread => {
        const participants = thread.participants?.data || [];
        participants.forEach(p => {
          if (p.id && p.id !== pageId && p.name && p.name.toLowerCase() !== "facebook user") {
            nameMap[p.id] = p.name;
          }
        });
      });
    }
    return nameMap;
  } catch (err) {
    logger.warn({ err: err.message }, "[Facebook Participants Fetch Error]");
  }
  return {};
}

class HandoffManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || supabase;
  }

  /**
   * Retrieves all human handoff conversations for a workspace and connected page.
   */
  async getHandoffConversations({ workspaceId, pageId = "", filter = "all" }) {
    const wsId = normalizeText(workspaceId);
    const pgId = normalizeText(pageId);

    if (!wsId) {
      throw new Error("workspaceId is required");
    }

    let query = this.supabase
      .from("client_facebook_conversations")
      .select("*")
      .eq("workspace_id", wsId);

    if (pgId) {
      query = query.eq("page_id", pgId);
    }

    if (filter === "handoffs") {
      // Active handoffs: bot is paused or needs human intervention
      query = query.or("bot_paused.eq.true,needs_human.eq.true,status.eq.human_handoff");
    } else if (filter === "executed") {
      // Executed/resolved: bot is no longer paused, conversation went through handoff
      query = query.eq("bot_paused", false).neq("status", "human_handoff");
    }
    // "all" — no additional filter, show everything

    query = query.order("updated_at", { ascending: false });

    const { data: conversations, error } = await query;

    if (error) {
      logger.error({ error }, "Error fetching handoff conversations");
      throw error;
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    try {
      const conversationsNeedingResolution = conversations.filter(
        c => !c.customer_name || c.customer_name === "Facebook User" || !c.customer_profile_pic
      );

      if (conversationsNeedingResolution.length > 0) {
        // Fetch unique page access tokens and participants name maps
        const pageIds = Array.from(new Set(conversationsNeedingResolution.map(c => c.page_id).filter(Boolean)));
        const tokenMap = {};
        const pageParticipantsMap = {};

        for (const pid of pageIds) {
          try {
            const pageConfig = await facebookConfigService.getFacebookConfig({ pageId: pid });
            if (pageConfig && pageConfig.pageAccessToken) {
              tokenMap[pid] = pageConfig.pageAccessToken;
              const nameMap = await fetchFacebookPageParticipants(pid, pageConfig.pageAccessToken);
              pageParticipantsMap[pid] = nameMap || {};
            }
          } catch (err) {
            logger.error({ err, pid }, `Failed to get access token/participants for page ${pid}`);
          }
        }

        // Fetch name lookup from local database facebook_conversations table
        const psids = conversationsNeedingResolution.map(c => c.customer_psid).filter(Boolean);
        const localNamesMap = {};
        const localPicsMap = {};
        if (psids.length > 0) {
          const chunkSize = 50;
          for (let i = 0; i < psids.length; i += chunkSize) {
            const chunk = psids.slice(i, i + chunkSize);
            const { data: realNames } = await this.supabase
              .from("facebook_conversations")
              .select("customer_psid, customer_name, customer_profile_pic")
              .in("customer_psid", chunk);

            if (realNames) {
              realNames.forEach(rn => {
                if (rn.customer_name && rn.customer_name !== "Facebook User") {
                  localNamesMap[rn.customer_psid] = rn.customer_name;
                }
                if (rn.customer_profile_pic) {
                  localPicsMap[rn.customer_psid] = rn.customer_profile_pic;
                }
              });
            }
          }
        }

        // Resolve name for each conversation
        for (const conv of conversationsNeedingResolution) {
          let resolvedName = localNamesMap[conv.customer_psid];
          let resolvedPic = localPicsMap[conv.customer_psid] || conv.customer_profile_pic || null;

          // 1. Try resolving from our page conversations participants map
          if (!resolvedName) {
            const pMap = pageParticipantsMap[conv.page_id];
            if (pMap && pMap[conv.customer_psid]) {
              resolvedName = pMap[conv.customer_psid];
            }
          }

          // 2. Fallback: Try calling Meta Graph API Profile Endpoint (just in case)
          if (!resolvedName || !resolvedPic) {
            const token = tokenMap[conv.page_id];
            if (token) {
              const profile = await fetchFacebookUserProfile(conv.customer_psid, token);
              if (profile) {
                if (profile.name && !resolvedName) {
                  resolvedName = profile.name;
                }
                if (profile.profilePic && !resolvedPic) {
                  resolvedPic = profile.profilePic;
                }
              }
            }
          }

          // If we resolved a name or picture, update it in the conversation object and database
          if (resolvedName || resolvedPic) {
            const updateFields = {};
            if (resolvedName) {
              conv.customer_name = resolvedName;
              updateFields.customer_name = resolvedName;
            }
            if (resolvedPic) {
              conv.customer_profile_pic = resolvedPic;
              updateFields.customer_profile_pic = resolvedPic;
            }

            // Update local facebook_conversations cache table
            this.supabase
              .from("facebook_conversations")
              .update(updateFields)
              .eq("customer_psid", conv.customer_psid)
              .then(({ error: dbErr }) => {
                if (dbErr) logger.error({ error: dbErr }, "Failed to update facebook_conversations name/pic cache");
              });

            // Update client_facebook_conversations table
            this.supabase
              .from("client_facebook_conversations")
              .update(updateFields)
              .eq("id", conv.id)
              .then(({ error: dbErr }) => {
                if (dbErr) logger.error({ error: dbErr }, "Failed to update client_facebook_conversations name/pic cache");
              });
          }
        }
      }
    } catch (nameErr) {
      logger.error({ error: nameErr }, "Error resolving customer names in getHandoffConversations");
    }

    return conversations;
  }

  /**
   * Retrieves messages for a specific handoff conversation.
   */
  async getHandoffMessages({ workspaceId, conversationId }) {
    const wsId = normalizeText(workspaceId);
    const convId = normalizeText(conversationId);

    if (!wsId || !convId) {
      throw new Error("workspaceId and conversationId are required");
    }

    const { data: messages, error } = await this.supabase
      .from("client_facebook_messages")
      .select("*")
      .eq("workspace_id", wsId)
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ error }, "Error fetching handoff messages");
      throw error;
    }

    return messages || [];
  }

  /**
   * Sends a human reply to Facebook Messenger and records it.
   */
  async sendHumanReply({ workspaceId, conversationId, messageText, mediaUrl, mediaType, senderName }) {
    const wsId = normalizeText(workspaceId);
    const convId = normalizeText(conversationId);
    const text = messageText?.trim();
    const mUrl = mediaUrl?.trim();
    const name = senderName?.trim() || "Agent";

    if (!wsId || !convId || (!text && !mUrl)) {
      throw new Error("workspaceId, conversationId, and either messageText or mediaUrl are required");
    }

    // Auto-detect media type from extension if not provided
    let resolvedMediaType = mediaType || null;
    if (mUrl && !resolvedMediaType) {
      const ext = String(mUrl).split("?")[0].split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) resolvedMediaType = "image";
      else if (["mp4", "mov", "avi", "webm", "mkv", "m4v"].includes(ext)) resolvedMediaType = "video";
      else if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) resolvedMediaType = "audio";
      else resolvedMediaType = "file";
    }

    // 1. Get the conversation details to get customer_psid and page_id
    const { data: conv, error: convError } = await this.supabase
      .from("client_facebook_conversations")
      .select("*")
      .eq("id", convId)
      .single();

    if (convError || !conv) {
      throw new Error(convError?.message || "Conversation not found");
    }

    const { page_id: pageId, customer_psid: customerPsid } = conv;

    // 2. Fetch page config to get access token
    const pageConfig = await facebookConfigService.getFacebookConfig({ pageId });
    if (!pageConfig.pageAccessToken) {
      throw new Error(`Facebook Page Access Token not found for page_id ${pageId}`);
    }

    // 3. Send message(s) to Facebook Messenger
    let facebookMid = null;
    try {
      if (mUrl) {
        // Send media attachment first
        const fbResultMedia = await sendFacebookMessage(customerPsid, "", {
          pageId,
          pageAccessToken: pageConfig.pageAccessToken,
          mediaUrl: mUrl,
          mediaType: resolvedMediaType,
        });
        facebookMid = fbResultMedia?.message_id || null;
      }
      
      if (text) {
        // Send text message next
        const fbResultText = await sendFacebookMessage(customerPsid, text, {
          pageId,
          pageAccessToken: pageConfig.pageAccessToken,
        });
        facebookMid = fbResultText?.message_id || facebookMid;
      }
    } catch (fbErr) {
      logger.error({ error: fbErr }, "Failed to send reply to Facebook Messenger");
      throw new Error(`Messenger send failed: ${fbErr.message}`);
    }

    // 4. Save to client_facebook_messages (reuse image_url column for all media)
    const { data: messageRecord, error: msgError } = await this.supabase
      .from("client_facebook_messages")
      .insert({
        conversation_id: convId,
        workspace_id: wsId,
        sender_type: "human",
        sender_name: name,
        message_text: text || null,
        image_url: mUrl || null,
        facebook_mid: facebookMid,
      })
      .select("*")
      .single();

    if (msgError) {
      logger.error({ error: msgError }, "Failed to save human message to client_facebook_messages");
    }

    // 5. Update last_message, needs_human = false, updated_at in conversation
    const mediaEmojis = { image: "📷", video: "🎬", audio: "🎵", file: "📎" };
    const displayMessage = text || `${mediaEmojis[resolvedMediaType] || "📎"} ${resolvedMediaType === "image" ? "Photo" : resolvedMediaType === "video" ? "Video" : resolvedMediaType === "audio" ? "Audio" : "File"}`;
    const { error: updateError } = await this.supabase
      .from("client_facebook_conversations")
      .update({
        last_message: displayMessage,
        needs_human: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convId);

    if (updateError) {
      logger.error({ error: updateError }, "Failed to update conversation state");
    }

    return {
      success: true,
      message: messageRecord,
    };
  }

  /**
   * Enables the chatbot for a conversation, resuming automated responses.
   */
  async enableChatbot({ workspaceId, conversationId }) {
    const wsId = normalizeText(workspaceId);
    const convId = normalizeText(conversationId);

    if (!wsId || !convId) {
      throw new Error("workspaceId and conversationId are required");
    }

    // 1. Get the conversation details
    const { data: conv, error: convError } = await this.supabase
      .from("client_facebook_conversations")
      .select("*")
      .eq("id", convId)
      .single();

    if (convError || !conv) {
      throw new Error(convError?.message || "Conversation not found");
    }

    const { page_id: pageId, customer_psid: customerPsid } = conv;

    // 2. Fetch page config
    const pageConfig = await facebookConfigService.getFacebookConfig({ pageId });

    // 3. Send optional chatbot re-enabled message
    const botMessage = "Chatbot is now enabled again. ✅";
    if (pageConfig.pageAccessToken) {
      try {
        await sendFacebookMessage(customerPsid, botMessage, {
          pageId,
          pageAccessToken: pageConfig.pageAccessToken,
        });
      } catch (fbErr) {
        logger.error({ error: fbErr }, "Failed to send chatbot enabled message to Messenger");
      }
    }

    // 4. Save bot message to client_facebook_messages
    await this.supabase
      .from("client_facebook_messages")
      .insert({
        conversation_id: convId,
        workspace_id: wsId,
        sender_type: "bot",
        sender_name: "Chatbot",
        message_text: botMessage,
      });

    // 5. Update conversation status to active
    const { error: updateError } = await this.supabase
      .from("client_facebook_conversations")
      .update({
        bot_paused: false,
        needs_human: false,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", convId);

    if (updateError) {
      throw updateError;
    }

    return { success: true };
  }

  /**
   * Gets the count of conversations waiting for human response.
   */
  async getHandoffBadgeCount({ workspaceId, pageId = "" }) {
    const wsId = normalizeText(workspaceId);
    const pgId = normalizeText(pageId);

    if (!wsId) {
      throw new Error("workspaceId is required");
    }

    let query = this.supabase
      .from("client_facebook_conversations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", wsId)
      .eq("status", "human_handoff")
      .eq("needs_human", true);

    if (pgId) {
      query = query.eq("page_id", pgId);
    }

    const { count, error } = await query;

    if (error) {
      logger.error({ error }, "Error getting handoff badge count");
      throw error;
    }

    return count || 0;
  }
}

module.exports = new HandoffManager(supabase);
