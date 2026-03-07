import { Resend } from 'resend'

// Lazy-initialize so the key is always read fresh (not baked in at module load)
const getResend = () => process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = () => process.env.EMAIL_FROM || 'Brioright <noreply@brioright.app>'

export const emailService = {
  async sendRaw({ to, subject, html, text }) {
    const resend = getResend()
    if (!resend) {
      console.log(`[Email] Resend not configured. Would send to ${to}: ${subject}`)
      return
    }
    try {
      const { data, error } = await resend.emails.send({
        from: FROM(),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || ''
      })
      if (error) {
        console.error('Email send failed:', error)
      } else {
        console.log('✅ Email sent:', data.id)
      }
    } catch (err) {
      console.error('Email service error:', err)
    }
  },

  async sendPasswordReset({ to, userName, resetUrl }) {
    await this.sendRaw({
      to,
      subject: 'Reset your Brioright password',
      html: `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🔐 Reset your password</h1>
    <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px;">Brioright — Work with precision</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#374151;margin:0 0 16px;">Hi ${userName},</p>
    <p style="color:#374151;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Reset Password →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">If the button doesn't work, copy this link into your browser:</p>
    <p style="color:#6b7280;font-size:12px;word-break:break-all;background:#f8fafc;padding:10px;border-radius:6px;">${resetUrl}</p>
    <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
  </div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Brioright · <a href="${process.env.CLIENT_URL}" style="color:#4f46e5;">brioright.app</a></p>
  </div>
</div></body></html>`,
      text: `Hi ${userName},\n\nReset your Brioright password by clicking this link (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`
    })
  },

  async sendTaskAssigned({ to, userName, taskTitle, projectName, priority, dueDate, assignedBy, taskUrl }) {
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date'
    const priorityColor = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' }[priority] || '#6b7280'
    await this.sendRaw({
      to,
      subject: `You've been assigned: ${taskTitle}`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#6366f1;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">📋 New Task Assigned</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#374151;margin:0 0 8px;">Hi ${userName},</p>
    <p style="color:#374151;">You've been assigned a new task:</p>
    <div style="background:#f8fafc;border-left:4px solid #6366f1;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
      <h2 style="margin:0 0 8px;color:#1f2937;font-size:18px;">${taskTitle}</h2>
      <p style="margin:4px 0;color:#6b7280;">📁 ${projectName}</p>
      <p style="margin:4px 0;"><span style="background:${priorityColor};color:#fff;padding:2px 8px;border-radius:9999px;font-size:12px;">${priority}</span></p>
      <p style="margin:4px 0;color:#6b7280;">📅 Due: ${dueDateStr}</p>
    </div>
    <p style="color:#6b7280;font-size:14px;">Assigned by: <strong>${assignedBy}</strong></p>
    ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">View Task →</a>` : ''}
  </div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Brioright · <a href="${process.env.CLIENT_URL}/settings" style="color:#6366f1;">Manage notifications</a></p>
  </div>
</div></body></html>`
    })
  },

  async sendTaskDueSoon({ to, userName, taskTitle, projectName, dueDate, taskUrl }) {
    await this.sendRaw({
      to,
      subject: `⏰ Due Tomorrow: ${taskTitle}`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#f59e0b;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">⏰ Due Tomorrow</h1>
  </div>
  <div style="padding:32px;">
    <p>Hi ${userName}, this task is due tomorrow:</p>
    <h2 style="color:#1f2937;">${taskTitle}</h2>
    <p style="color:#6b7280;">📁 ${projectName} · 📅 ${new Date(dueDate).toLocaleDateString()}</p>
    ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Open Task →</a>` : ''}
  </div>
</div></body></html>`
    })
  },

  async sendTaskOverdue({ to, userName, taskTitle, projectName, dueDate, taskUrl }) {
    await this.sendRaw({
      to,
      subject: `🔴 Overdue: ${taskTitle}`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#ef4444;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">🔴 Overdue Task</h1>
  </div>
  <div style="padding:32px;">
    <p>Hi ${userName}, this task is overdue:</p>
    <h2 style="color:#1f2937;">${taskTitle}</h2>
    <p style="color:#6b7280;">📁 ${projectName} · Was due: ${new Date(dueDate).toLocaleDateString()}</p>
    ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">View Task →</a>` : ''}
  </div>
</div></body></html>`
    })
  },

  async sendCommentMention({ to, userName, authorName, commentText, taskTitle, projectName, taskUrl }) {
    await this.sendRaw({
      to,
      subject: `${authorName} mentioned you in a comment`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#6366f1;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">💬 You were mentioned</h1>
  </div>
  <div style="padding:32px;">
    <p>Hi ${userName}, <strong>${authorName}</strong> mentioned you in <strong>${taskTitle}</strong>:</p>
    <blockquote style="border-left:4px solid #6366f1;margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;color:#374151;">${commentText}</blockquote>
    <p style="color:#6b7280;">📁 ${projectName}</p>
    ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Comment →</a>` : ''}
  </div>
</div></body></html>`
    })
  },

  async sendDailyDigest({ to, userName, overdueTasks, dueTodayTasks, dueThisWeekCount, dashboardUrl }) {
    const taskRow = (t) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#1f2937;font-size:14px;">${t.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280;font-size:13px;">${t.projectName}</td>
      </tr>`

    const taskTable = (tasks, accentColor) =>
      tasks.length === 0 ? `<p style="color:#6b7280;font-size:14px;margin:0;">None — great job! 🎉</p>` :
        `<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:${accentColor}10;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Task</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Project</th>
        </tr></thead>
        <tbody>${tasks.map(taskRow).join('')}</tbody>
      </table>`

    await this.sendRaw({
      to,
      subject: `📋 Your Daily Summary — ${new Date().toLocaleDateString()}`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;margin:0;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#6366f1;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">📋 Daily Summary</h1>
    <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div style="padding:32px;">
    <p style="color:#374151;margin:0 0 24px;">Hi <strong>${userName}</strong>, here's your task summary for today:</p>

    <!-- Stats row -->
    <div style="display:flex;gap:12px;margin-bottom:28px;">
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#ef4444;">${overdueTasks.length}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Overdue</div>
      </div>
      <div style="flex:1;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#f97316;">${dueTodayTasks.length}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Due Today</div>
      </div>
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#22c55e;">${dueThisWeekCount}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">This Week</div>
      </div>
    </div>

    <!-- Overdue -->
    ${overdueTasks.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#ef4444;margin:0 0 12px;font-size:15px;">🔴 Overdue Tasks</h3>
      ${taskTable(overdueTasks, '#ef4444')}
    </div>` : ''}

    <!-- Due Today -->
    <div style="margin-bottom:24px;">
      <h3 style="color:#f97316;margin:0 0 12px;font-size:15px;">⏰ Due Today</h3>
      ${taskTable(dueTodayTasks, '#f97316')}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        Open Dashboard →
      </a>
    </div>
  </div>

  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
      Brioright · <a href="${process.env.CLIENT_URL}/settings" style="color:#6366f1;">Manage notifications</a>
    </p>
  </div>
</div>
</body></html>`
    })
  },


  async sendWorkspaceInvite({ to, inviterName, workspaceName, memberCount, projectCount, token }) {
    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`

    await this.sendRaw({
      to,
      subject: `${inviterName} invited you to join ${workspaceName} on Brioright`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#4f46e5;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">Brioright</h1>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#1f2937;margin-top:0;">You've been invited! 🎉</h2>
    <p style="color:#374151;font-size:16px;"><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong> as a Member.</p>
    
    <div style="background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:8px;margin:24px 0;">
      <h3 style="margin:0 0 8px;color:#1f2937;font-size:18px;">🏢 ${workspaceName}</h3>
      <p style="margin:0;color:#6b7280;font-size:14px;">${memberCount} members · ${projectCount} projects</p>
    </div>
    
    <p style="color:#6b7280;font-size:14px;">This invite expires in 7 days.</p>
    
    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Accept Invitation →</a>
    </div>
    
    <p style="color:#6b7280;font-size:14px;word-break:break-all;">
      Or paste this link in your browser:<br>
      <a href="${inviteUrl}" style="color:#4f46e5;">${inviteUrl}</a>
    </p>
    
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</div></body></html>`
    })
  },

  async sendEmailVerification({ to, userName, verifyUrl }) {
    await this.sendRaw({
      to,
      subject: 'Verify your Brioright email address',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td bgcolor="#4f46e5" align="center"
                style="background-color:#4f46e5;padding:40px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0 0 10px;font-size:36px;line-height:1;">&#x2709;&#xFE0F;</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;line-height:1.4;">
                Verify your email address
              </h1>
              <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Brioright &mdash; Work with precision</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:36px 32px;">
              <p style="margin:0 0 14px;color:#111827;font-size:16px;">Hi <strong>${userName}</strong>,</p>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                Thanks for signing up! Click the button below to verify your email address
                and complete your account setup. This link expires in <strong>24 hours</strong>.
              </p>

              <!-- BUTTON — background-color on the <a> itself for max compatibility -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${verifyUrl}"
                       target="_blank"
                       style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:15px 40px;border-radius:8px;border:1px solid #4338ca;">
                      Verify Email Address &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">
                If the button doesn&apos;t work, paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;word-break:break-all;background-color:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e5e7eb;">
                <a href="${verifyUrl}" style="color:#4f46e5;text-decoration:none;">${verifyUrl}</a>
              </p>

              <p style="margin:0;color:#9ca3af;font-size:13px;">
                If you didn&apos;t create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#f8fafc" align="center"
                style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Brioright &middot;
                <a href="${process.env.CLIENT_URL}" style="color:#4f46e5;text-decoration:none;">brioright.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`,
      text: `Hi ${userName},\n\nVerify your Brioright email by clicking this link (expires in 24 hours):\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.\n\nBrioright — brioright.app`
    })
  }
}
