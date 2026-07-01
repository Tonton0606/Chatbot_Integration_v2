/**
 * Campaign Email Delivery Routes
 * Full pipeline: create campaign → schedule → send → track
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const { supabase } = require('../config/supabase');
const { sendCampaignEmail, sendEmail } = require('../services/emailService');

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────

function getWorkspaceId(req) {
  return req.headers['x-workspace-id'] || req.query.workspaceId;
}

// ── Unsubscribe endpoint (CAN-SPAM / PH Data Privacy Act) ───
// Must be before /:id routes to avoid parameter conflict
router.get('/unsubscribe', async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!email || !token) return res.status(400).send('Invalid unsubscribe link.');

    const crypto = require('crypto');
    const secret = process.env.UNSUBSCRIBE_SECRET;
    if (!secret) {
      return res.status(500).send('Server configuration error.');
    }
    const expectedToken = crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32);

    if (token !== expectedToken) return res.status(403).send('Invalid token.');

    // Mark as unsubscribed
    await supabase.from('email_unsubscribes').upsert(
      { email: email.toLowerCase(), unsubscribed_at: new Date().toISOString() },
      { onConflict: 'email' }
    );

    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h1>You have been unsubscribed</h1>
        <p>You will no longer receive marketing emails from Exponify.</p>
      </body></html>
    `);
  } catch (err) {
    return res.status(500).send('Error processing unsubscribe.');
  }
});

// ── List campaigns ──────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get single campaign ─────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Create campaign ─────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { name, subject, html_body, from_name, recipient_list, segment_ids } = req.body;
    if (!name || !subject || !html_body) {
      return res.status(400).json({ error: 'name, subject, and html_body required' });
    }

    const sanitizeHtml = (input) => {
      if (typeof input !== 'string') return '';
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
    };

    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        workspace_id: workspaceId,
        name,
        subject,
        html_body: sanitizeHtml(html_body),
        from_name: from_name || 'Exponify',
        status: 'draft',
        recipient_count: (recipient_list || []).length + (segment_ids || []).length,
        recipient_list: recipient_list || [],
        segment_ids: segment_ids || [],
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update campaign ─────────────────────────────────────────

router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name', 'subject', 'html_body', 'from_name', 'status', 'recipient_list', 'segment_ids', 'scheduled_at'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Sanitize html_body on every write — same logic as create
    if (updates.html_body) {
      updates.html_body = updates.html_body
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Delete campaign ─────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Send campaign now ───────────────────────────────────────

router.post('/:id/send', async (req, res) => {
  try {
    const { data: campaign, error: fetchError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return res.status(400).json({ error: 'Campaign already sent or sending' });
    }

    // Update status to sending
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign.id);

    // Get recipients
    const recipientList = campaign.recipient_list || [];
    if (recipientList.length === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0 })
        .eq('id', campaign.id);
      return res.json({ success: true, message: 'No recipients to send to' });
    }

    // Filter out unsubscribed addresses (CAN-SPAM / PH Data Privacy Act)
    const emailAddresses = recipientList.map((r) => r.email?.toLowerCase()).filter(Boolean);
    const { data: unsubscribed } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .in('email', emailAddresses);
    const unsubscribedSet = new Set((unsubscribed || []).map((r) => r.email));

    const recipients = recipientList
      .filter((r) => r.email && !unsubscribedSet.has(r.email.toLowerCase()))
      .map((r) => ({
        email: r.email,
        first_name: r.first_name || r.name || '',
        last_name: r.last_name || '',
      }));

    if (recipients.length === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0 })
        .eq('id', campaign.id);
      return res.json({ success: true, message: 'All recipients have unsubscribed' });
    }

    // Send in parallel batches (handled by emailService)
    sendCampaignEmail({
      recipients,
      subject: campaign.subject,
      html: campaign.html_body,
      from: campaign.from_name,
    })
      .then(async (result) => {
        await supabase
          .from('email_campaigns')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_count: result.sent,
            failed_count: result.failed,
            error_log: result.errors.length > 0 ? result.errors : null,
          })
          .eq('id', campaign.id);
      })
      .catch(async (err) => {
        await supabase
          .from('email_campaigns')
          .update({ status: 'failed', error_log: [{ error: err.message }] })
          .eq('id', campaign.id);
      });

    return res.json({ success: true, message: 'Campaign sending started', campaignId: campaign.id });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Campaign analytics (opens, clicks, etc.) ────────────────

router.get('/:id/analytics', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('id, name, status, sent_count, failed_count, created_at, sent_at')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    // Get open/click events
    const { data: events } = await supabase
      .from('email_events')
      .select('*')
      .eq('campaign_id', req.params.id);

    const analytics = {
      ...data,
      open_count: (events || []).filter((e) => e.event === 'open').length,
      click_count: (events || []).filter((e) => e.event === 'click').length,
      bounce_count: (events || []).filter((e) => e.event === 'bounce').length,
      unsubscribe_count: (events || []).filter((e) => e.event === 'unsubscribe').length,
    };

    return res.json({ success: true, data: analytics });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
