const logger = require('../../config/logger');

async function processPendingSequenceSteps({ supabaseClient, sendFacebookMessage, getFacebookConfig }) {
  const now = new Date().toISOString();

  const { data: pendingSteps } = await supabaseClient
    .from('fb_sequence_executions')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50);

  if (!pendingSteps || pendingSteps.length === 0) return;

  logger.info({ count: pendingSteps.length }, 'Processing pending sequence steps');

  for (const step of pendingSteps) {
    try {
      const { data: sequence } = await supabaseClient
        .from('fb_flow_sequences')
        .select('*')
        .eq('id', step.sequence_id)
        .single();

      if (!sequence || !sequence.is_active) {
        await supabaseClient
          .from('fb_sequence_executions')
          .update({ status: 'cancelled', sent_at: now })
          .eq('id', step.id);
        continue;
      }

      let steps = sequence.steps;
      if (typeof steps === 'string') {
        try { steps = JSON.parse(steps); } catch { steps = []; }
      }

      const currentStep = Array.isArray(steps) ? steps[step.step_index] : null;
      if (!currentStep) {
        await supabaseClient
          .from('fb_sequence_executions')
          .update({ status: 'completed', sent_at: now })
          .eq('id', step.id);
        continue;
      }

      let pageConfig;
      if (getFacebookConfig) {
        pageConfig = await getFacebookConfig({ pageId: step.page_id });
      }

      if (!pageConfig?.pageAccessToken) {
        await supabaseClient
          .from('fb_sequence_executions')
          .update({ status: 'failed', error_message: 'No page access token', sent_at: now })
          .eq('id', step.id);
        continue;
      }

      await sendFacebookMessage(step.customer_psid, currentStep.message || currentStep.text || '', {
        pageId: step.page_id,
        pageAccessToken: pageConfig.pageAccessToken,
      });

      await supabaseClient
        .from('fb_sequence_executions')
        .update({ status: 'sent', sent_at: now })
        .eq('id', step.id);

      const nextStepIndex = step.step_index + 1;
      if (nextStepIndex < steps.length) {
        const nextStep = steps[nextStepIndex];
        const delayMinutes = nextStep.delay_minutes || nextStep.delayMinutes || 60;
        const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

        await supabaseClient
          .from('fb_sequence_executions')
          .insert({
            sequence_id: step.sequence_id,
            conversation_id: step.conversation_id,
            customer_psid: step.customer_psid,
            page_id: step.page_id,
            workspace_id: step.workspace_id,
            step_index: nextStepIndex,
            status: 'pending',
            scheduled_for: scheduledFor,
          });
      }

      logger.info({ stepId: step.id, stepIndex: step.step_index }, 'Sequence step sent');
    } catch (err) {
      logger.error({ err: err.message, stepId: step.id }, 'Sequence step failed');
      await supabaseClient
        .from('fb_sequence_executions')
        .update({ status: 'failed', error_message: err.message, sent_at: now })
        .eq('id', step.id);
    }
  }
}

async function enrollConversationInSequence({ supabaseClient, sequenceId, conversationId, customerPsid, pageId, workspaceId }) {
  const { data: sequence } = await supabaseClient
    .from('fb_flow_sequences')
    .select('*')
    .eq('id', sequenceId)
    .eq('is_active', true)
    .single();

  if (!sequence) return false;

  let steps = sequence.steps;
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps); } catch { steps = []; }
  }

  if (!Array.isArray(steps) || steps.length === 0) return false;

  const firstStep = steps[0];
  const delayMinutes = firstStep.delay_minutes || firstStep.delayMinutes || 0;
  const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  await supabaseClient
    .from('fb_sequence_executions')
    .insert({
      sequence_id: sequenceId,
      conversation_id: conversationId,
      customer_psid: customerPsid,
      page_id: pageId,
      workspace_id: workspaceId,
      step_index: 0,
      status: 'pending',
      scheduled_for: scheduledFor,
    });

  return true;
}

module.exports = { processPendingSequenceSteps, enrollConversationInSequence };
