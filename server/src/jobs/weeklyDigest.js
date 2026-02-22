const cron = require('node-cron');
const prisma = require('../utils/prisma');
const { emailService } = require('../services/emailService');
const { startOfWeek, endOfWeek, subWeeks, format } = require('date-fns');

const runWeeklyDigest = async () => {
  console.log('[WeeklyDigest] Running...');
  try {
    const now = new Date();
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });

    for (const user of users) {
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId: user.id } });
      if (!prefs?.emailEnabled || !prefs?.digestEnabled) continue;

      const [completedTasks, timeEntries, overdueCount] = await Promise.all([
        prisma.task.count({ where: { assigneeId: user.id, status: 'done', updatedAt: { gte: lastWeekStart, lte: lastWeekEnd } } }),
        prisma.timeEntry.findMany({ where: { userId: user.id, startTime: { gte: lastWeekStart, lte: lastWeekEnd }, endTime: { not: null } } }),
        prisma.task.count({ where: { assigneeId: user.id, dueDate: { lt: now }, status: { not: 'done' } } }),
      ]);

      const totalSeconds = timeEntries.reduce((s, e) => s + (e.duration || 0), 0);
      const hours = Math.round(totalSeconds / 3600 * 10) / 10;

      await emailService.sendRaw({
        to: user.email,
        subject: `📊 Weekly Summary — Week of ${format(lastWeekStart, 'MMM d')}`,
        html: `
<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#6366f1;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">📊 Weekly Summary</h1>
    <p style="color:#c7d2fe;margin:4px 0 0;">Week of ${format(lastWeekStart, 'MMMM d, yyyy')}</p>
  </div>
  <div style="padding:32px;">
    <p>Hi ${user.name}, here's your week at a glance:</p>
    <div style="display:grid;gap:12px;margin:20px 0;">
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;"><strong style="color:#16a34a;font-size:24px;">${completedTasks}</strong><p style="margin:4px 0 0;color:#6b7280;">Tasks completed</p></div>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;"><strong style="color:#2563eb;font-size:24px;">${hours}h</strong><p style="margin:4px 0 0;color:#6b7280;">Hours tracked</p></div>
      ${overdueCount ? `<div style="background:#fef2f2;border-radius:8px;padding:16px;"><strong style="color:#dc2626;font-size:24px;">${overdueCount}</strong><p style="margin:4px 0 0;color:#6b7280;">Overdue tasks</p></div>` : ''}
    </div>
    <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard →</a>
  </div>
</div></body></html>`,
      });
    }

    console.log('[WeeklyDigest] Done');
  } catch (err) {
    console.error('[WeeklyDigest] Error:', err.message);
  }
};

// Run at 8 AM every Monday
const startWeeklyDigest = () => {
  cron.schedule('0 8 * * 1', runWeeklyDigest, { timezone: 'UTC' });
  console.log('[WeeklyDigest] Scheduled at 08:00 UTC every Monday');
};

module.exports = { startWeeklyDigest, runWeeklyDigest };
