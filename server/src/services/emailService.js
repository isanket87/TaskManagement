import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = process.env.EMAIL_FROM || 'TaskFlow <noreply@taskflow.app>'

export const emailService = {
  async sendRaw({ to, subject, html, text }) {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[Email] Resend not configured. Would send to ${to}: ${subject}`)
      return
    }
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
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
    <p style="margin:0;color:#9ca3af;font-size:12px;">TaskFlow · <a href="${process.env.CLIENT_URL}/settings" style="color:#6366f1;">Manage notifications</a></p>
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
    // const taskList = (tasks) => tasks.map(t => `<li style="margin:4px 0;color:#374151;">${t.title} <span style="color:#9ca3af;">· ${t.projectName}</span></li>`).join('');
    await this.sendRaw({
      to,
      subject: `📋 Your Daily Summary — ${new Date().toLocaleDateString()}`,
      html: `
  </div>
</div></body></html>`
    })
  },

  async sendWorkspaceInvite({ to, inviterName, workspaceName, memberCount, projectCount, token }) {
    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`

    await this.sendRaw({
      to,
      subject: `${inviterName} invited you to join ${workspaceName} on TaskFlow`,
      html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#4f46e5;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">TaskFlow</h1>
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
  }
}
