const logger = require('../../config/logger');

const DAY_MAP = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function isWithinBusinessHours(settings) {
  if (!settings || !settings.business_hours_enabled) return true;

  const tz = settings.business_hours_timezone || 'Asia/Manila';
  const now = new Date();

  const localStr = now.toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = localStr.match(/(\w+)\s+(\d{2}):(\d{2})/);
  if (!parts) return true;

  const dayName = parts[1];
  const hour = parseInt(parts[2], 10);
  const minute = parseInt(parts[3], 10);
  const currentMinutes = hour * 60 + minute;

  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const todayNum = dayMap[dayName] || 1;

  let activeDays = settings.business_hours_days;
  if (typeof activeDays === 'string') {
    try { activeDays = JSON.parse(activeDays); } catch { activeDays = [1,2,3,4,5]; }
  }
  if (!Array.isArray(activeDays) || activeDays.length === 0) return true;

  if (!activeDays.includes(todayNum)) return false;

  const openMin = parseTimeToMinutes(settings.business_hours_start);
  const closeMin = parseTimeToMinutes(settings.business_hours_end);
  if (openMin === null || closeMin === null) return true;

  return currentMinutes >= openMin && currentMinutes < closeMin;
}

function getAwayMessage(settings) {
  return settings?.away_message || "We're currently away. We'll get back to you during business hours! 🕐";
}

function getResponseDelayMs(settings) {
  const rawSeconds =
    settings?.response_delay_seconds ?? settings?.responseDelaySeconds;
  if (rawSeconds === undefined || rawSeconds === null || rawSeconds === "") {
    return null;
  }

  const seconds = Number(rawSeconds);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(10, seconds) * 1000;
  }

  return null;
}

function detectSentiment(text) {
  const lower = (text || '').toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'thanks', 'thank you', 'salamat', 'sige', 'okay', 'ok', 'nice', 'amazing', 'wow', 'ganda', 'maganda'];
  const negativeWords = ['bad', 'terrible', 'angry', 'hate', 'awful', 'worst', 'sira', 'ayaw', 'hindi', 'problem', 'issue', 'complaint', 'galit', 'gusto ko malaman', 'bakit'];

  const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

async function autoTagConversation({ supabaseClient, conversationId, workspaceId, intent, leadPriority, sentiment }) {
  if (!supabaseClient || !conversationId || !workspaceId) return;

  const tags = [];
  if (intent) tags.push(`intent:${intent}`);
  if (leadPriority) tags.push(`lead:${leadPriority}`);
  if (sentiment && sentiment !== 'neutral') tags.push(`sentiment:${sentiment}`);

  if (tags.length === 0) return;

  try {
    const { data: existing } = await supabaseClient
      .from('client_facebook_conversations')
      .select('tags')
      .eq('id', conversationId)
      .maybeSingle();

    const existingTags = Array.isArray(existing?.tags) ? existing.tags : [];
    const merged = [...new Set([...existingTags, ...tags])];

    await supabaseClient
      .from('client_facebook_conversations')
      .update({ tags: merged, sentiment, lead_priority: leadPriority })
      .eq('id', conversationId);

    for (const tag of tags) {
      const { data: tagRow } = await supabaseClient
        .from('fb_conversation_tags')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', tag)
        .maybeSingle();

      if (tagRow) {
        await supabaseClient
          .from('fb_conversation_tag_map')
          .upsert({ conversation_id: conversationId, tag_id: tagRow.id, applied_by: 'auto' }, { onConflict: 'conversation_id,tag_id' });
      } else {
        const { data: newTag } = await supabaseClient
          .from('fb_conversation_tags')
          .insert({ workspace_id: workspaceId, name: tag, color: leadPriority === 'hot' ? '#ef4444' : leadPriority === 'warm' ? '#f59e0b' : '#3b82f6' })
          .select('id')
          .single();

        if (newTag) {
          await supabaseClient
            .from('fb_conversation_tag_map')
            .insert({ conversation_id: conversationId, tag_id: newTag.id, applied_by: 'auto' });
        }
      }
    }
  } catch (err) {
    logger.debug({ err: err.message }, 'Auto-tag conversation failed');
  }
}

module.exports = {
  isWithinBusinessHours,
  getAwayMessage,
  getResponseDelayMs,
  detectSentiment,
  autoTagConversation,
};
