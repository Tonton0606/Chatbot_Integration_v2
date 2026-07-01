/**
 * Hermes Email Template Generator
 * Layout inspired by clean transactional email style
 * Color palette: warm gold/yellow on white background
 */

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const getEmailTemplate = (type, data = {}) => {
  const {
    companyName,
    fullName,
    email,
    phone,
    date,
    time,
    platform,
    meetingLink,
    adminMessage,
    customContent,
  } = data;

  const safeFullName = escapeHtml(fullName || "there");
  const safeEmail = escapeHtml(email || "");
  const safePhone = escapeHtml(phone || "");
  const safeCompanyName = escapeHtml(companyName || "");
  const safeDate = escapeHtml(date || "");
  const safeTime = escapeHtml(time || "");
  const safePlatform = escapeHtml(platform || "");
  const safeMeetingLink = escapeHtml(meetingLink || "");
  const safeAdminMessage = escapeHtml(adminMessage || "");

  const heroMap = {
    confirmation: {
      icon: "✓",
      title: "Demo Booking Confirmed",
      subtitle: `Your demo session has been scheduled for <strong>${safeDate}</strong> at <strong>${safeTime}</strong>.`,
    },
    rejection: {
      icon: "✕",
      title: "Booking Status Update",
      subtitle: "Your booking request has been reviewed by our team.",
    },
    "admin-notification": {
      icon: "📋",
      title: "New Demo Booking Request",
      subtitle: `<strong>${safeFullName}</strong> has submitted a demo request that requires your attention.`,
    },
    custom: {
      icon: "📩",
      title: "Booking Update",
      subtitle: "Please review the details below.",
    },
  };

  const hero = heroMap[type] || heroMap.custom;

  const greeting =
    type !== "admin-notification"
      ? `<p class="greeting">Hi <strong>${safeFullName}</strong>,</p>`
      : `<p class="greeting">Hello Admin,</p>`;

  const introText =
    {
      confirmation:
        "Thank you for booking a demo with us! We've received your details and confirmed your session. You'll find everything you need below.",
      rejection:
        "Thank you for your interest in Hermes. After reviewing your request, we're unfortunately unable to accommodate the selected time slot at this time.",
      "admin-notification":
        "A new demo booking request has been submitted and requires your review. Client details and the requested schedule are listed below.",
      custom: "",
    }[type] || "";

  const row = (label, value) =>
    value
      ? `<tr>
           <td class="row-label">${escapeHtml(label)}</td>
           <td class="row-value">${value}</td>
         </tr>`
      : "";

  const confirmationCard = `
    <table class="detail-table" cellpadding="0" cellspacing="0">
      ${row("DATE", safeDate)}
      ${row("TIME", safeTime)}
      ${row(
        "PLATFORM",
        safePlatform === "zoom" ? "Zoom Meeting" : "Google Meet"
      )}
      ${
        safeMeetingLink
          ? row(
              "MEETING LINK",
              `<a href="${safeMeetingLink}" class="inline-link">${safeMeetingLink}</a>`
            )
          : ""
      }
    </table>
    ${
      safeMeetingLink
        ? `<div class="btn-wrap"><a href="${safeMeetingLink}" class="cta-btn">Join Meeting</a></div>`
        : ""
    }`;

  const rejectionCard = `
    <div class="status-badge rejected">Booking Not Confirmed</div>
    <p style="color:#6b7280;font-size:15px;margin:16px 0 0;">
      We apologize for the inconvenience. Please feel free to submit a new request for a different date or time, and we will do our best to accommodate you.
    </p>`;

  const adminCard = `
    <h3 class="card-section-title">Client Details</h3>
    <table class="detail-table" cellpadding="0" cellspacing="0">
      ${row("FULL NAME", safeFullName)}
      ${row("EMAIL", safeEmail)}
      ${row("COMPANY", safeCompanyName || "Not specified")}
      ${row("PHONE", safePhone || "Not provided")}
    </table>

    <h3 class="card-section-title" style="margin-top:28px;">Requested Schedule</h3>
    <table class="detail-table" cellpadding="0" cellspacing="0">
      ${row("DATE", safeDate)}
      ${row("TIME", safeTime)}
      ${row(
        "PLATFORM",
        safePlatform === "zoom" ? "Zoom Meeting" : "Google Meet"
      )}
    </table>

    <div class="btn-wrap">
      <a href="https://www.exponify.ph/Admin/Booking" class="cta-btn">Review &amp; Respond</a>
    </div>`;

  const cardContent =
    {
      confirmation: confirmationCard,
      rejection: rejectionCard,
      "admin-notification": adminCard,
      custom: "",
    }[type] || "";

  const adminNote = safeAdminMessage
    ? `<div class="note-box">
         <p class="note-label">${
           type === "admin-notification" ? "Admin Notes" : "Message from Team"
         }</p>
         <p class="note-body">${safeAdminMessage}</p>
       </div>`
    : "";

  const customBlock = customContent
    ? `<div style="color:#6b7280;font-size:14px;line-height:1.7;margin-bottom:24px;">${customContent}</div>`
    : "";

  const helpSection =
    type !== "admin-notification"
      ? `<div class="help-section">
         <p>If you need to reschedule or have questions, feel free to reply to this email or reach out directly.</p>
         <p>We look forward to connecting with you!</p>
       </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(hero.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #f5f5f5;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    .hero {
      background-color: #d4a017;
      padding: 40px 48px;
      text-align: center;
    }

    .hero-icon {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      font-size: 22px;
      margin-bottom: 14px;
      color: #fff;
    }

    .hero h1 {
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.3px;
      margin-bottom: 6px;
    }

    .hero .brand {
      font-size: 13px;
      color: rgba(255,255,255,0.75);
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .body {
      padding: 40px 48px;
    }

    .greeting {
      font-size: 16px;
      color: #1f2937;
      margin-bottom: 12px;
    }

    .intro {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 32px;
    }

    .detail-table {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      background: #fffbf0;
      border: 1px solid #f0e0a0;
      margin-bottom: 28px;
    }

    .detail-table tr {
      border-bottom: 1px solid #f0e0a0;
    }

    .detail-table tr:last-child {
      border-bottom: none;
    }

    .row-label {
      padding: 14px 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #9ca3af;
      width: 38%;
      vertical-align: middle;
    }

    .row-value {
      padding: 14px 20px;
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      vertical-align: middle;
    }

    .card-section-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 12px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }

    .status-badge.rejected {
      background: #fef2f2;
      color: #dc2626;
    }

    .btn-wrap {
      text-align: center;
      margin: 28px 0 8px;
    }

    .cta-btn {
      display: inline-block;
      background-color: #d4a017;
      color: #ffffff;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .inline-link {
      color: #d4a017;
      text-decoration: underline;
      font-weight: 500;
    }

    .note-box {
      background: #fffbf0;
      border-left: 4px solid #d4a017;
      border-radius: 4px;
      padding: 18px 20px;
      margin-bottom: 28px;
    }

    .note-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #d4a017;
      margin-bottom: 8px;
    }

    .note-body {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.6;
    }

    .help-section {
      border-top: 1px solid #f3f4f6;
      padding-top: 24px;
      margin-top: 8px;
    }

    .help-section p {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.7;
    }

    .footer {
      background: #f9fafb;
      border-top: 1px solid #f3f4f6;
      padding: 28px 48px;
      text-align: center;
    }

    .footer-links {
      margin-bottom: 12px;
    }

    .footer-links a {
      color: #9ca3af;
      font-size: 12px;
      text-decoration: none;
      margin: 0 10px;
    }

    .footer-copy {
      font-size: 12px;
      color: #9ca3af;
    }

    .footer-copy a {
      color: #d4a017;
      text-decoration: none;
      font-weight: 500;
    }

    @media (max-width: 620px) {
      .wrapper { margin: 0; border-radius: 0; }
      .hero, .body, .footer { padding-left: 24px; padding-right: 24px; }
      .hero h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="hero">
      <div class="hero-icon">${hero.icon}</div>
      <h1>${escapeHtml(hero.title)}</h1>
      <p class="brand">Hermes</p>
    </div>

    <div class="body">
      ${greeting}
      ${introText ? `<p class="intro">${introText}</p>` : ""}
      ${cardContent}
      ${adminNote}
      ${customBlock}
      ${helpSection}
    </div>

    <div class="footer">
      <div class="footer-links">
        <a href="https://www.exponify.ph/privacy">Privacy Policy</a>
        <a href="https://www.exponify.ph/terms">Terms of Service</a>
        <a href="https://www.exponify.ph/contact">Contact Us</a>
      </div>
      <p class="footer-copy">
        © ${new Date().getFullYear()} <a href="https://www.exponify.ph">Hermes</a>. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
};

const getPasswordResetEmail = (data = {}) => {
  const firstName = escapeHtml(data.firstName || "there");
  const resetPasswordLink = escapeHtml(data.resetPasswordLink || "#");
  const unsubscribeLink = escapeHtml(data.unsubscribeLink || "#");
  const psLink = escapeHtml(data.psLink || "#");
  const logoUrl = escapeHtml(data.logoUrl || "");
  const companyAddress = escapeHtml(
    data.companyAddress || "Exponify PH, Philippines"
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    table { border-collapse:collapse !important; }
    body { margin:0 !important; padding:0 !important; width:100% !important; }

    @media screen and (max-width: 640px) {
      .email-shell { width:100% !important; }
      .email-card { border-radius:0 !important; }
      .email-padding { padding-left:24px !important; padding-right:24px !important; }
      .email-button { width:100% !important; }
      .link-box { word-break:break-all !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Inter,Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111111;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Reset your Exponify password. This secure link expires in 60 minutes.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:26px 16px 40px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-shell" style="width:600px;max-width:600px;">
          <tr>
            <td align="center" style="padding:0 0 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  ${
                    logoUrl
                      ? `<td style="padding-right:12px;vertical-align:middle;">
                          <img src="${logoUrl}" alt="Exponify PH" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:8px;">
                        </td>`
                      : ""
                  }
                  <td style="vertical-align:middle;">
                    <div style="font-size:48px;line-height:52px;font-weight:800;letter-spacing:-2px;color:#151515;">
                      Exponify
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="email-card" style="background:#ffffff;border-radius:28px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="email-padding" style="padding:42px 40px 0;text-align:left;">
                    <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#111111;">
                      Hi ${firstName},
                    </p>

                    <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#111111;">
                      We received a request to reset the password for your <strong style="font-weight:800;">Exponify</strong> account.
                    </p>

                    <p style="margin:0 0 26px;font-size:14px;line-height:22px;color:#111111;">
                      If you made this request, click the button below to create a new password. This reset link will expire in 60 minutes for security purposes.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" class="email-padding" style="padding:0 40px 30px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="border-radius:8px;background:#c9a84c;">
                          <a href="${resetPasswordLink}" target="_blank" class="email-button" style="display:inline-block;padding:13px 28px;border-radius:8px;background:#c9a84c;color:#070b14;font-size:14px;line-height:18px;font-weight:800;text-decoration:none;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="email-padding" style="padding:0 40px 44px;text-align:left;">
                    <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#111111;">
                      If you did not request a password reset, you can safely ignore this email and no changes will be made to your account.
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#111111;">
                      If the button does not work, copy and paste the following link into your browser:
                    </p>

                    <p class="link-box" style="margin:0 0 26px;font-size:12px;line-height:18px;color:#2563eb;word-break:break-word;">
                      <a href="${resetPasswordLink}" target="_blank" style="color:#2563eb;text-decoration:underline;">${resetPasswordLink}</a>
                    </p>

                    <p style="margin:0;font-size:14px;line-height:22px;color:#111111;">
                      Thank you,<br />
                      The Exponify Team
                    </p>

                    <p style="margin:22px 0 0;font-size:12px;line-height:18px;color:#555555;">
                      P.S. For account security tips, <a href="${psLink}" target="_blank" style="color:#2563eb;text-decoration:none;">visit the Exponify Help Center</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 16px 0;">
              <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#8f8f8f;">
                <a href="${unsubscribeLink}" target="_blank" style="color:#8f8f8f;text-decoration:underline;">Unsubscribe</a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#a3a3a3;">
                ${companyAddress}
              </p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#a3a3a3;">
                &copy; ${new Date().getFullYear()} Exponify. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
  getEmailTemplate,
  getPasswordResetEmail,
  getBookingConfirmationEmail: (data) => getEmailTemplate("confirmation", data),
  getBookingRejectionEmail: (data) => getEmailTemplate("rejection", data),
  getAdminNotificationEmail: (data) =>
    getEmailTemplate("admin-notification", data),
  getCustomEmail: (data) => getEmailTemplate("custom", data),
};
