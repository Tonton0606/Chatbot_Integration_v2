import DOMPurify from 'dompurify';
import { supabase } from "../../config/supabaseClient";

export async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("User not authenticated");

  return user;
}

export async function fetchLeadBatchesForCampaigns() {
  const { data, error } = await supabase
    .from("lead_batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEmailCampaign(campaignData) {
  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ ...campaignData, status: "draft" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEmailCampaign(campaignId, campaignData) {
  const { data, error } = await supabase
    .from("email_campaigns")
    .update({
      ...campaignData,
      status: "draft",
      sent_count: 0,
      opened_count: 0,
      clicked_count: 0,
    })
    .eq("id", campaignId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEmailCampaign(campaignId) {
  const { error } = await supabase
    .from("email_campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) throw error;
}

export async function fetchCampaignBatchLeads(leadBatchId) {
  const { data: batch, error: batchError } = await supabase
    .from("lead_batches")
    .select("lead_ids")
    .eq("id", leadBatchId)
    .single();

  if (batchError) throw batchError;
  if (!batch?.lead_ids?.length) return [];

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("email, status")
    .in("id", batch.lead_ids);

  if (leadsError) throw leadsError;
  return leads || [];
}

export async function updateCampaignSendingProgress(campaignId, payload) {
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      leads: payload.leads,
      sent_count: payload.sentCount,
      status: "sending",
    })
    .eq("id", campaignId);

  if (error) throw error;
}

export async function finalizeCampaignSend(campaignId, payload) {
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      status: payload.status,
      leads: payload.leads,
      sent_count: payload.sentCount,
      sent_at: payload.sentAt,
    })
    .eq("id", campaignId);

  if (error) throw error;
}


export const EMAIL_TEMPLATES = {
  launch: {
    name: 'Launch',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launch Email</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #38bdf8); padding: 40px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 32px;">{{BUSINESS_NAME}}</h1>
              <p style="margin: 12px 0 0; font-size: 18px; opacity: 0.9;">New launch update</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; color: #111827;">
              <h2 style="margin: 0 0 24px 0; font-size: 26px;">{{SUBJECT}}</h2>
              <div style="font-size: 16px; line-height: 1.75; color: #4b5563;">{{BODY}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="#" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 600;">Learn More</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  announcement: {
    name: 'Announcement',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Announcement Email</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #eef2ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eef2ff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #4338ca; padding: 36px 40px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 30px;">Big News</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px; color: #1f2937;">
              <h2 style="margin: 0 0 18px 0; font-size: 24px;">{{SUBJECT}}</h2>
              <div style="font-size: 16px; line-height: 1.75; color: #4b5563;">{{BODY}}</div>
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">Sent by {{BUSINESS_NAME}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  offer: {
    name: 'Offer',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promotional Offer Email</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #fff7ed;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #f97316; padding: 40px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 32px;">Special Offer</h1>
              <p style="margin: 12px 0 0 0; font-size: 16px; opacity: 0.9;">Don't miss this limited-time deal.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px; color: #111827;">
              <h2 style="margin: 0 0 18px 0; font-size: 24px;">{{SUBJECT}}</h2>
              <div style="font-size: 16px; line-height: 1.75; color: #4b5563;">{{BODY}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="#" style="display: inline-block; background-color: #fb923c; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 700;">Claim Offer</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  newsletter: {
    name: 'Newsletter',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter Email</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #0f172a; color: #ffffff;">
              <h1 style="margin: 0; font-size: 28px;">{{BUSINESS_NAME}} Newsletter</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px; color: #111827;">
              <h2 style="margin: 0 0 18px 0; font-size: 24px;">{{SUBJECT}}</h2>
              <div style="font-size: 16px; line-height: 1.75; color: #4b5563;">{{BODY}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center; background-color: #f1f5f9;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Stay in the loop with the latest from {{BUSINESS_NAME}}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
};

export function parseEmails(raw) {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export function getInvalidEmails(raw) {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}

export function safeHtmlPreview(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}

export function getCampaignTotalLeads(campaign) {
  if (campaign.total_leads !== undefined && campaign.total_leads !== null) {
    return campaign.total_leads;
  }
  return Array.isArray(campaign.leads) ? campaign.leads.length : 0;
}

export function getCampaignOpens(campaign) {
  if (campaign.opened_count !== undefined && campaign.opened_count !== null) {
    return campaign.opened_count;
  }
  if (Array.isArray(campaign.leads)) {
    return campaign.leads.filter((lead) => {
      if (!lead || typeof lead === 'string') return false;
      return lead.opened || lead.status === 'opened';
    }).length;
  }
  return 0;
}

export function getCampaignClicks(campaign) {
  if (campaign.clicked_count !== undefined && campaign.clicked_count !== null) {
    return campaign.clicked_count;
  }
  if (Array.isArray(campaign.leads)) {
    return campaign.leads.filter((lead) => {
      if (!lead || typeof lead === 'string') return false;
      return lead.clicked || lead.status === 'clicked';
    }).length;
  }
  return 0;
}

export function formatRate(count, total) {
  if (!total || total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

