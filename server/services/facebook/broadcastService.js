const logger = require('../../config/logger');

async function executeBroadcast({ supabaseClient, campaignId, sendFacebookMessage, pageConfigMap }) {
  const { data: campaign } = await supabaseClient
    .from('fb_broadcast_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.status === 'sent') return;

  await supabaseClient
    .from('fb_broadcast_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  let targetQuery = supabaseClient
    .from('client_facebook_conversations')
    .select('id, customer_psid, page_id, tags, lead_priority')
    .eq('workspace_id', campaign.workspace_id)
    .neq('customer_psid', '');

  if (campaign.target_segment && campaign.target_segment !== 'all') {
    if (campaign.target_segment === 'hot') {
      targetQuery = targetQuery.eq('lead_priority', 'hot');
    } else if (campaign.target_segment === 'warm') {
      targetQuery = targetQuery.eq('lead_priority', 'warm');
    } else if (campaign.target_segment === 'cold') {
      targetQuery = targetQuery.eq('lead_priority', 'cold');
    }
  }

  let targetTags = campaign.target_tags;
  if (typeof targetTags === 'string') {
    try { targetTags = JSON.parse(targetTags); } catch { targetTags = []; }
  }

  const { data: conversations } = await targetQuery.limit(1000);

  if (!conversations || conversations.length === 0) {
    await supabaseClient
      .from('fb_broadcast_campaigns')
      .update({ status: 'sent', sent_count: 0 })
      .eq('id', campaignId);
    return;
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const conv of conversations) {
    if (targetTags && targetTags.length > 0) {
      const convTags = Array.isArray(conv.tags) ? conv.tags : [];
      const hasTag = targetTags.some(t => convTags.includes(t));
      if (!hasTag) continue;
    }

    try {
      const pageConfig = pageConfigMap?.[conv.page_id];
      if (!pageConfig?.pageAccessToken) {
        failedCount++;
        continue;
      }

      await sendFacebookMessage(conv.customer_psid, campaign.message_text, {
        pageId: conv.page_id,
        pageAccessToken: pageConfig.pageAccessToken,
      });

      sentCount++;

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      failedCount++;
      logger.warn({ err: err.message, campaignId, psid: conv.customer_psid }, 'Broadcast send failed');
    }
  }

  await supabaseClient
    .from('fb_broadcast_campaigns')
    .update({
      status: 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  logger.info({ campaignId, sentCount, failedCount }, 'Broadcast campaign completed');
}

module.exports = { executeBroadcast };
