/**
 * Hermes Task Email Template Generator
 * Matches zoom.js / emailTemplate.js style
 * Types: task-assigned | high-priority-alert | task-done | admin-task-alert
 */

const getTaskEmailTemplate = (type, data) => {
  const {
    assigneeName,
    assigneeEmail,
    taskTitle,
    project,
    priority,
    dueDate,
    description,
    adminNote,
    status,
  } = data;

  // ── Priority config ───────────────────────────────────────────────────────
  const priorityConfig = {
    critical: {
      label:       '🚨 CRITICAL PRIORITY',
      badgeBg:     '#fef2f2',
      badgeColor:  '#dc2626',
      badgeBorder: '#fecaca',
      bannerColor: '#dc2626',
      iconChar:    '🚨',
    },
    high: {
      label:       '⚠️ HIGH PRIORITY',
      badgeBg:     '#fff7ed',
      badgeColor:  '#ea580c',
      badgeBorder: '#fed7aa',
      bannerColor: '#ea580c',
      iconChar:    '⚠️',
    },
    medium: {
      label:       'MEDIUM PRIORITY',
      badgeBg:     '#fffbeb',
      badgeColor:  '#d97706',
      badgeBorder: '#fde68a',
      bannerColor: '#c9930c',
      iconChar:    '📋',
    },
    low: {
      label:       'LOW PRIORITY',
      badgeBg:     '#f0fdf4',
      badgeColor:  '#16a34a',
      badgeBorder: '#bbf7d0',
      bannerColor: '#16a34a',
      iconChar:    '📝',
    },
  };

  const pCfg      = priorityConfig[priority] || priorityConfig.medium;
  const isUrgent  = ['critical', 'high'].includes(priority);
  const adminUrl  = process.env.VITE_ADMIN_URL || 'http://localhost:3000';

  // ── Hero config per type ──────────────────────────────────────────────────
  const heroMap = {
    'task-assigned': {
      iconChar:    pCfg.iconChar,
      bannerColor: pCfg.bannerColor,
      title:       'New Task Assigned',
      subtitle:    `Task: <strong>${taskTitle}</strong>`,
    },
    'high-priority-alert': {
      iconChar:    '🚨',
      bannerColor: '#dc2626',
      title:       `${priority?.toUpperCase()} Priority Task Alert`,
      subtitle:    `Assigned to <strong>${assigneeName}</strong>`,
    },
    'task-done': {
      iconChar:    '✓',
      bannerColor: '#16a34a',
      title:       'Task Completed',
      subtitle:    `Task: <strong>${taskTitle}</strong> has been marked done.`,
    },
    'admin-task-alert': {
      iconChar:    '📋',
      bannerColor: '#8b6914',
      title:       'New Task Created',
      subtitle:    `A new task has been assigned and requires your awareness.`,
    },
  };

  const hero = heroMap[type] || heroMap['task-assigned'];

  // ── Greeting ──────────────────────────────────────────────────────────────
  const greeting =
    type === 'high-priority-alert' || type === 'admin-task-alert'
      ? `<p class="greeting">Hello Admin,</p>`
      : `<p class="greeting">Hi <strong>${assigneeName}</strong>,</p>`;

  // ── Intro text ────────────────────────────────────────────────────────────
  const introMap = {
    'task-assigned': isUrgent
      ? `You have been assigned a <strong>${priority}</strong> priority task that requires your <strong>immediate attention</strong>. Please review the details below and begin work as soon as possible.`
      : `You have been assigned a new task. Please review the details below and get started when you're ready.`,
    'high-priority-alert':
      `A <strong>${priority}</strong> priority task has been created and assigned to <strong>${assigneeName}</strong>. This alert is sent so you remain aware of high-impact work items in progress.`,
    'task-done':
      `The following task has been marked as <strong>completed</strong>. Here is a summary for your records.`,
    'admin-task-alert':
      `A new task has been created and assigned to <strong>${assigneeName}</strong>. Below are the task details for your reference.`,
  };

  const introText = introMap[type] || '';

  // ── Priority badge HTML ───────────────────────────────────────────────────
  const priorityBadgeHtml = isUrgent
    ? `<div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;padding:6px 20px;border-radius:999px;font-size:13px;font-weight:700;letter-spacing:0.5px;background:${pCfg.badgeBg};color:${pCfg.badgeColor};border:1px solid ${pCfg.badgeBorder};">
          ${pCfg.label}
        </span>
      </div>`
    : '';

  // ── Detail rows ───────────────────────────────────────────────────────────
  const row = (label, value, isLast = false) =>
    value
      ? `<tr>
          <td style="padding:14px 20px;font-size:11px;font-weight:700;letter-spacing:0.8px;color:#9ca3af;width:38%;${!isLast ? 'border-bottom:1px solid #f0e0a0;' : ''}">${label}</td>
          <td style="padding:14px 20px;font-size:14px;font-weight:600;color:#1f2937;${!isLast ? 'border-bottom:1px solid #f0e0a0;' : ''}">${value}</td>
        </tr>`
      : '';

  const rows = [
    ['TASK',        taskTitle],
    ['PROJECT',     project || null],
    ['ASSIGNEE',    type !== 'task-assigned' ? (assigneeName || null) : null],
    ['PRIORITY',    priority?.toUpperCase()],
    ['STATUS',      status?.toUpperCase() || null],
    ['DUE DATE',    dueDate || 'No deadline set'],
    ['DESCRIPTION', description || null],
  ].filter(([, val]) => val);

  const rowsHtml = rows
    .map(([label, val], i) => row(label, val, i === rows.length - 1))
    .join('');

  // ── Action button ─────────────────────────────────────────────────────────
  const actionBtn = `
    <div style="text-align:center;margin:28px 0;">
      <a href="${adminUrl}/Admin/Tasks"
        style="display:inline-block;background:#c9930c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">
        View Task
      </a>
    </div>`;

  // ── Admin note box ────────────────────────────────────────────────────────
  const adminNoteHtml = adminNote
    ? `<div style="background:#fffbf0;border-left:4px solid #c9930c;border-radius:4px;padding:18px 20px;margin-bottom:28px;">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#c9930c;margin:0 0 8px;">Note</p>
        <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0;">${adminNote}</p>
      </div>`
    : '';

  // ── Footer note ───────────────────────────────────────────────────────────
  const footerNoteMap = {
    'task-assigned': isUrgent
      ? `⚡ This task is marked <strong>${priority}</strong> priority. Please acknowledge and begin work immediately.`
      : 'Log in to the admin panel to view full task details and update the status.',
    'high-priority-alert': 'This is an automated alert sent because task priority is critical or high.',
    'task-done':           'This is an automated notification confirming task completion.',
    'admin-task-alert':    'This is an automated notification sent to you as the admin.',
  };

  const footerNote = footerNoteMap[type] || '';

  // ── Full HTML ─────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${hero.title}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body {
      background:#f5f5f5;
      font-family:'Helvetica Neue',Arial,sans-serif;
      color:#1f2937;
      -webkit-font-smoothing:antialiased;
    }
    .wrapper {
      max-width:600px;
      margin:40px auto;
      background:#ffffff;
      border-radius:8px;
      overflow:hidden;
      box-shadow:0 2px 12px rgba(0,0,0,0.06);
    }
    .hero {
      background:${hero.bannerColor};
      padding:48px;
      text-align:center;
    }
    .hero-icon {
      display:inline-block;
      width:56px;
      height:56px;
      line-height:56px;
      border-radius:50%;
      background:rgba(255,255,255,0.15);
      font-size:24px;
      color:#fff;
      margin-bottom:16px;
    }
    .hero h1 {
      font-size:28px;
      font-weight:700;
      color:#ffffff;
      letter-spacing:-0.3px;
      margin:0 0 8px;
    }
    .hero .brand {
      font-size:14px;
      color:rgba(255,255,255,0.8);
      font-weight:500;
    }
    .body { padding:40px 48px; }
    .greeting {
      font-size:16px;
      color:#1f2937;
      margin:0 0 12px;
    }
    .intro {
      font-size:15px;
      color:#6b7280;
      line-height:1.7;
      margin:0 0 32px;
    }
    .detail-table {
      width:100%;
      border-radius:8px;
      background:#fffbf0;
      border:1px solid #f0e0a0;
      margin-bottom:28px;
      border-collapse:collapse;
    }
    .help-section {
      border-top:1px solid #f3f4f6;
      padding-top:24px;
      margin-top:8px;
    }
    .help-section p {
      font-size:14px;
      color:#6b7280;
      line-height:1.7;
    }
    .footer {
      background:#f9fafb;
      border-top:1px solid #f3f4f6;
      padding:28px 48px;
      text-align:center;
    }
    .footer a {
      color:#9ca3af;
      font-size:12px;
      text-decoration:none;
      margin:0 10px;
    }
    .footer-copy {
      font-size:12px;
      color:#9ca3af;
      margin-top:12px;
    }
    .footer-copy a {
      color:#c9930c;
      text-decoration:none;
      font-weight:500;
    }
    @media (max-width:620px) {
      .wrapper { margin:0; border-radius:0; }
      .hero, .body, .footer { padding-left:24px; padding-right:24px; }
      .hero h1 { font-size:22px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Hero Banner -->
    <div class="hero">
      <div class="hero-icon">${hero.iconChar}</div>
      <h1>${hero.title}</h1>
      <p class="brand">Hermes</p>
    </div>

    <!-- Body -->
    <div class="body">
      ${greeting}
      <p class="intro">${introText}</p>

      ${priorityBadgeHtml}

      <!-- Detail rows -->
      ${rowsHtml ? `<table class="detail-table">${rowsHtml}</table>` : ''}

      ${actionBtn}
      ${adminNoteHtml}

      <!-- Help -->
      <div class="help-section">
        <p style="font-size:13px;color:#9ca3af;font-style:italic;margin:0 0 16px;">${footerNote}</p>
        <p>If you have any questions, feel free to reply to this email and we'll be happy to help.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Contact Us</a>
      </div>
      <p class="footer-copy">
        © ${new Date().getFullYear()} <a href="#">Hermes</a>. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>`;
};

module.exports = {
  getTaskEmailTemplate,
  getTaskAssignedEmail:       (data) => getTaskEmailTemplate('task-assigned', data),
  getHighPriorityAlertEmail:  (data) => getTaskEmailTemplate('high-priority-alert', data),
  getTaskDoneEmail:           (data) => getTaskEmailTemplate('task-done', data),
  getAdminTaskAlertEmail:     (data) => getTaskEmailTemplate('admin-task-alert', data),
};