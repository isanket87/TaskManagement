const cron = require('node-cron');
const prisma = require('../utils/prisma');
const { sendDailyDigestForUser } = require('../services/notificationService');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } = require('date-fns');

const runDailyDigest = async () => {
    console.log('[DailyDigest] Running...');
    try {
        const now = new Date();
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });

        for (const user of users) {
            const [overdueTasks, dueTodayTasks, dueThisWeek] = await Promise.all([
                prisma.task.findMany({
                    where: { assigneeId: user.id, dueDate: { lt: dayStart }, status: { not: 'done' } },
                    select: { id: true, title: true, project: { select: { name: true } } },
                }),
                prisma.task.findMany({
                    where: { assigneeId: user.id, dueDate: { gte: dayStart, lte: dayEnd }, status: { not: 'done' } },
                    select: { id: true, title: true, project: { select: { name: true } } },
                }),
                prisma.task.count({
                    where: { assigneeId: user.id, dueDate: { gt: dayEnd, lte: weekEnd }, status: { not: 'done' } },
                }),
            ]);

            if (overdueTasks.length + dueTodayTasks.length === 0) continue;

            await sendDailyDigestForUser({
                user,
                overdueTasks: overdueTasks.map(t => ({ ...t, projectName: t.project.name })),
                dueTodayTasks: dueTodayTasks.map(t => ({ ...t, projectName: t.project.name })),
                dueThisWeekCount: dueThisWeek,
            });
        }

        console.log('[DailyDigest] Done');
    } catch (err) {
        console.error('[DailyDigest] Error:', err.message);
    }
};

// Run at 8:00 AM every day
const startDailyDigest = () => {
    cron.schedule('0 8 * * *', runDailyDigest, { timezone: 'UTC' });
    console.log('[DailyDigest] Scheduled at 08:00 UTC daily');
};

module.exports = { startDailyDigest, runDailyDigest };
