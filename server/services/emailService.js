const logger = require('../config/logger');
/**
 * Email Service — SendGrid/Mailgun SMTP Integration
 * Handles all email sending for the platform:
 * - Demo booking confirmations
 * - Invoice/quote emails
 * - Marketing campaigns
 * - Notifications
 */

const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { getEmailTemplate } = require('../templates/emailTemplate');
const { escapeHtml } = require('../utils/htmlEscape');

// ── Transporter Setup ─────────────────────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  if (provider === 'resend') {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    transporter = {
      sendMail: async (mailOptions) => {
        const from =
          mailOptions.from ||
          process.env.EMAIL_FROM ||
          process.env.MAIL_FROM ||
          'Exponify <info@exponify.ph>';

        const result = await resend.emails.send({
          from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
          reply_to: mailOptions.replyTo,
        });

        if (result?.error) {
          throw new Error(result.error.message || 'Resend email failed');
        }

        return { messageId: result?.data?.id || result?.id };
      },
      verify: async () => true,
    };

    return transporter;
  }

  if (provider === 'sendgrid') {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // Wrap sendgrid in nodemailer-like interface
    transporter = {
      sendMail: async (mailOptions) => {
        const msg = {
          to: mailOptions.to,
          from: mailOptions.from || process.env.EMAIL_FROM || 'noreply@exponify.ph',
          subject: mailOptions.subject,
          html: mailOptions.html || mailOptions.text,
        };
        try {
          const result = await sgMail.send(msg);
          return { messageId: result[0].headers['x-message-id'] };
        } catch (error) {
          logger.error({ message: error.message }, '[EmailService] SendGrid error:');
          throw error;
        }
      },
      verify: async () => {
        if (!process.env.SENDGRID_API_KEY) {
          throw new Error('SENDGRID_API_KEY not configured');
        }
        return true;
      },
    };
    return transporter;
  }

  if (provider === 'mailgun') {
    transporter = nodemailer.createTransport({
      host: process.env.MAILGUN_HOST || 'smtp.mailgun.org',
      port: parseInt(process.env.MAILGUN_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAILGUN_USERNAME,
        pass: process.env.MAILGUN_API_KEY,
      },
    });
    return transporter;
  }

  // Default: generic SMTP (works with Mailtrap, Postmark, etc.)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  return transporter;
}

// ── Verification ──────────────────────────────────────────────────────────────

async function verifyEmailConnection() {
  try {
    const transport = getTransporter();
    if (transport.verify) {
      await transport.verify();
    }
    return { configured: true, provider: process.env.EMAIL_PROVIDER || 'smtp' };
  } catch (error) {
    logger.warn({ message: error.message }, '[EmailService] Email not configured:');
    return { configured: false, error: error.message };
  }
}

// ── Unsubscribe Token Helper (Data Privacy Act of 2012 / CAN-SPAM compliance) ──
const crypto = require('crypto');

function generateUnsubscribeToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET not configured - cannot generate unsubscribe token');
  }
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32);
}

function buildUnsubscribeUrl(email) {
  const token = generateUnsubscribeToken(email);
  const base = process.env.BACKEND_URL || 'https://hermesbackend-j1w5.onrender.com';
  return `${base}/api/email/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// ── Core Send Function ────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, text, from, replyTo, isMarketing = false }) {
  const defaultFrom = process.env.EMAIL_FROM || 'Exponify <noreply@exponify.ph>';

  // Append unsubscribe footer to marketing emails (PH Data Privacy Act + CAN-SPAM)
  let finalHtml = html;
  let finalText = text || html?.replace(/<[^>]*>/g, '');
  let unsubUrl = null;
  if (isMarketing) {
    unsubUrl = buildUnsubscribeUrl(to);
    finalHtml = (html || '') + `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;font-family:sans-serif;">
  <p>You received this email because you subscribed to Exponify updates.</p>
  <p><a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> &nbsp;|&nbsp; Exponify PH &nbsp;|&nbsp; Philippines</p>
</div>`;
    finalText += `\n\n---\nTo unsubscribe: ${unsubUrl}`;
  }

  const mailOptions = {
    from: from || defaultFrom,
    to,
    subject,
    html: finalHtml,
    text: finalText,
    replyTo,
    // RFC 2369 List-Unsubscribe header (required by Gmail/Yahoo bulk sender rules 2024)
    ...(isMarketing && {
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  };

  try {
    const transport = getTransporter();
    const result = await transport.sendMail(mailOptions);
    logger.info(`[EmailService] Email sent to ${to} — ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error({ message: error.message }, `[EmailService] Failed to send email to ${to}:`);
    return { success: false, error: error.message };
  }
}

// ── Email Types ───────────────────────────────────────────────────────────────

/**
 * Send demo booking confirmation email
 */
async function sendBookingConfirmation(bookingData) {
  const html = getBookingConfirmationEmail(bookingData);
  return sendEmail({
    to: bookingData.email,
    subject: `Demo Confirmed — ${bookingData.companyName || 'Exponify'} on ${bookingData.date}`,
    html,
  });
}

/**
 * Send demo booking rejection email
 */
async function sendBookingRejection(bookingData) {
  const html = getBookingRejectionEmail(bookingData);
  return sendEmail({
    to: bookingData.email,
    subject: 'Booking Status Update — Exponify',
    html,
  });
}

/**
 * Send admin notification for new booking
 */
async function sendAdminNotification(bookingData, adminEmail) {
  const html = getAdminNotificationEmail(bookingData);
  return sendEmail({
    to: adminEmail,
    subject: `New Demo Request from ${bookingData.fullName}`,
    html,
  });
}

/**
 * Send invoice email to customer
 */
async function sendInvoiceEmail(invoice, workspaceName, customMessage = '') {
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeCustomMessage = escapeHtml(customMessage);
  const safeNotes = escapeHtml(invoice.notes);
  const safeTerms = escapeHtml(invoice.terms);
  const safeInvoiceNumber = escapeHtml(invoice.invoice_number);

  const itemsHtml = (invoice.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0e0a0;font-size:14px;color:#1f2937;">
          ${escapeHtml(item.description)}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0e0a0;text-align:center;font-size:14px;">
          ${item.quantity}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:14px;">
          ₱${Number(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:14px;font-weight:600;">
          ₱${Number(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice ${safeInvoiceNumber}</title>
</head>
<body style="background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background:#d4a017;padding:36px 48px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;">Invoice ${safeInvoiceNumber}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${safeWorkspaceName}</p>
    </div>
    <div style="padding:36px 48px;">
      <p style="font-size:15px;color:#6b7280;margin-bottom:24px;">Hello,</p>
      ${safeCustomMessage ? `<p style="font-size:14px;color:#4b5563;line-height:1.6;margin-bottom:20px;">${safeCustomMessage}</p>` : ''}
      
      <table style="width:100%;margin-bottom:24px;border:1px solid #f0e0a0;border-radius:8px;overflow:hidden;background:#fffbf0;">
        <tr><td style="padding:12px 16px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">DATE</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;">${invoice.issue_date}</td></tr>
        <tr><td style="padding:12px 16px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">DUE DATE</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;">${invoice.due_date}</td></tr>
        <tr><td style="padding:12px 16px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">STATUS</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;text-transform:uppercase;">${invoice.status}</td></tr>
        ${invoice.tin_number ? `<tr><td style="padding:12px 16px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">TIN</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;">${invoice.tin_number}</td></tr>` : ''}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#fffbf0;">
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">DESCRIPTION</th>
            <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">QTY</th>
            <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">PRICE</th>
            <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.8px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="text-align:right;margin-bottom:24px;">
        <table style="display:inline-block;text-align:left;border:1px solid #f0e0a0;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:10px 20px;font-size:13px;color:#6b7280;">Subtotal</td>
              <td style="padding:10px 20px;font-size:14px;font-weight:600;">₱${Number(invoice.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
          ${invoice.discount_amount > 0 ? `<tr><td style="padding:10px 20px;font-size:13px;color:#6b7280;">Discount</td>
              <td style="padding:10px 20px;font-size:14px;font-weight:600;color:#dc2626;">-₱${Number(invoice.discount_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>` : ''}
          ${invoice.vat_amount > 0 ? `<tr><td style="padding:10px 20px;font-size:13px;color:#6b7280;">VAT (${invoice.vat_rate}%)</td>
              <td style="padding:10px 20px;font-size:14px;font-weight:600;">₱${Number(invoice.vat_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>` : ''}
          ${invoice.ewt_amount > 0 ? `<tr><td style="padding:10px 20px;font-size:13px;color:#6b7280;">EWT (${invoice.ewt_rate}%)</td>
              <td style="padding:10px 20px;font-size:14px;font-weight:600;">-₱${Number(invoice.ewt_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>` : ''}
          <tr style="background:#fffbf0;">
            <td style="padding:12px 20px;font-size:14px;font-weight:700;border-top:2px solid #d4a017;">TOTAL</td>
            <td style="padding:12px 20px;font-size:16px;font-weight:700;border-top:2px solid #d4a017;">₱${Number(invoice.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${invoice.amount_paid > 0 ? `<tr>
            <td style="padding:10px 20px;font-size:13px;color:#6b7280;">Amount Paid</td>
            <td style="padding:10px 20px;font-size:14px;font-weight:600;color:#10b981;">₱${Number(invoice.amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:#fffbf0;">
            <td style="padding:12px 20px;font-size:14px;font-weight:700;">Balance Due</td>
            <td style="padding:12px 20px;font-size:16px;font-weight:700;color:#dc2626;">₱${Number(invoice.balance_due).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          </tr>` : ''}
        </table>
      </div>

      ${safeNotes ? `<div style="background:#fffbf0;border-left:4px solid #d4a017;border-radius:4px;padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#d4a017;margin-bottom:6px;">Notes</p>
        <p style="font-size:14px;color:#4b5563;line-height:1.6;">${safeNotes}</p>
      </div>` : ''}

      ${safeTerms ? `<div style="border-top:1px solid #f3f4f6;padding-top:20px;margin-top:8px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Terms &amp; Conditions</p>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;">${safeTerms}</p>
      </div>` : ''}
    </div>
    <div style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 48px;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} ${safeWorkspaceName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: invoice.customer_email || invoice.customer_name,
    subject: `Invoice ${safeInvoiceNumber} from ${safeWorkspaceName}`,
    html,
  });
}

/**
 * Send quote/proposal email
 */
async function sendQuoteEmail(quote, workspaceName, customMessage = '') {
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeCustomMessage = escapeHtml(customMessage);
  const safeQuoteNumber = escapeHtml(quote.quote_number);
  const safeValidUntil = escapeHtml(quote.valid_until);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background:#4f46e5;padding:36px 48px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;">Quote ${safeQuoteNumber}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${safeWorkspaceName}</p>
    </div>
    <div style="padding:36px 48px;">
      <p style="font-size:15px;color:#6b7280;margin-bottom:24px;">Hello,</p>
      ${safeCustomMessage ? `<p style="font-size:14px;color:#4b5563;line-height:1.6;margin-bottom:20px;">${safeCustomMessage}</p>` : `<p style="font-size:14px;color:#4b5563;line-height:1.6;margin-bottom:20px;">Thank you for your interest. Please find our quotation below. This quote is valid until <strong>${safeValidUntil}</strong>.</p>`}

      <table style="width:100%;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:12px 16px;font-size:11px;font-weight:700;color:#9ca3af;">QUOTE #</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;">${safeQuoteNumber}</td></tr>
        <tr><td style="padding:12px 16px;font-size:11px;font-weight:700;color:#9ca3af;">VALID UNTIL</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;">${safeValidUntil}</td></tr>
      </table>

      <div style="text-align:right;margin-bottom:24px;">
        <table style="display:inline-block;text-align:left;">
          <tr><td style="padding:6px 16px;font-size:13px;color:#6b7280;">Total</td>
              <td style="padding:6px 16px;font-size:16px;font-weight:700;">₱${Number(quote.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
        </table>
      </div>
    </div>
    <div style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 48px;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} ${safeWorkspaceName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: quote.customer_email || quote.customer_name,
    subject: `Quote ${safeQuoteNumber} from ${safeWorkspaceName}`,
    html,
  });
}

/**
 * Send campaign email to multiple recipients
 */
async function sendCampaignEmail({ recipients, subject, html, from }) {
  const results = { sent: 0, failed: 0, errors: [] };

  // Process in batches of 50 to avoid rate limits
  const BATCH_SIZE = 50;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (recipient) => {
      try {
        const personalizedHtml = html
          .replace(/\{\{FIRST_NAME\}\}/g, recipient.first_name || '')
          .replace(/\{\{LAST_NAME\}\}/g, recipient.last_name || '')
          .replace(/\{\{EMAIL\}\}/g, recipient.email || '')
          .replace(/\{\{UNSUBSCRIBE_LINK\}\}/g, `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(recipient.email)}`);

        await sendEmail({
          to: recipient.email,
          subject,
          html: personalizedHtml,
          from,
        });
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({ email: recipient.email, error: error.message });
      }
    });

    await Promise.allSettled(promises);

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

module.exports = {
  verifyEmailConnection,
  sendEmail,
  sendBookingConfirmation,
  sendBookingRejection,
  sendAdminNotification,
  sendInvoiceEmail,
  sendQuoteEmail,
  sendCampaignEmail,
  getTransporter,
};