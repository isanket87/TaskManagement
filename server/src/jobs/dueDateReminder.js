const cron = require('node-cron');
const prisma = require('../utils/prisma');
const { shouldSendReminder, computeDueDateStatus } = require('../utils/dueDateUtils');
const { createNotification } = require('../services/notificationService');

const startDueDateReminderJob = (io) => {
    console.log('[CronJob] Due date reminder job started — runs every 15 minutes');

    cron.schedule('*/15 * * * *', async () => {
        const now = new Date();
        console.log(`[CronJob] Running due date check at ${now.toISOString()}`);

        try {
            // Get all non-done tasks with due dates
            const tasks = await prisma.task.findMany({
                where: { status: { not: 'done' }, dueDate: { not: null } },
                select: {
                    id: true, title: true, dueDate: true, status: true,
                    remindersSent: true, snoozedUntil: true, assigneeId: true,
                    projectId: true, project: { select: { name: true } },
                },
            });

            const reminderTypes = ['overdue', 'due_24h', 'due_1h', 'due_today'];
            const statusUpdates = [];

            for (const task of tasks) {
                for (const reminderType of reminderTypes) {
                    if (shouldSendReminder(task, reminderType)) {
                        let message = '';
                        switch (reminderType) {
                            case 'overdue': message = `Task "${task.title}" is overdue`; break;
                            case 'due_24h': message = `Task "${task.title}" is due in 24 hours`; break;
                            case 'due_1h': message = `Task "${task.title}" is due in 1 hour`; break;
                            case 'due_today': message = `Task "${task.title}" is due today`; break;
                        }

                        if (task.assigneeId) {
                            await createNotification({
                                userId: task.assigneeId,
                                type: reminderType,
                                message,
                                taskId: task.id,
                                projectId: task.projectId,
                                projectName: task.project?.name,
                                taskTitle: task.title,
                            });
                        }

                        await prisma.task.update({
                            where: { id: task.id },
                            data: {
                                remindersSent: { push: reminderType },
                                lastReminderSent: now,
                            },
                        });

                        console.log(`[CronJob] Sent ${reminderType} reminder for task: ${task.title}`);
                    }
                }

                // Recompute dueDateStatus
                const newStatus = computeDueDateStatus(task.dueDate, task.status);
                statusUpdates.push({ id: task.id, dueDateStatus: newStatus });
            }

            // Batch update dueDateStatus
            for (const update of statusUpdates) {
                await prisma.task.update({
                    where: { id: update.id },
                    data: { dueDateStatus: update.dueDateStatus },
                });
            }

            console.log(`[CronJob] Updated dueDateStatus for ${statusUpdates.length} tasks`);

            // Emit summary updates to connected users
            if (io) {
                const users = await prisma.user.findMany({ select: { id: true } });
                for (const user of users) {
                    const [overdue, dueToday, dueSoon, upcoming] = await Promise.all([
                        prisma.task.count({ where: { assigneeId: user.id, dueDateStatus: 'overdue' } }),
                        prisma.task.count({ where: { assigneeId: user.id, dueDateStatus: 'due_today' } }),
                        prisma.task.count({ where: { assigneeId: user.id, dueDateStatus: 'due_soon' } }),
                        prisma.task.count({ where: { assigneeId: user.id, dueDateStatus: 'on_track' } }),
                    ]);
                    io.to(`user:${user.id}`).emit('dueDateSummary:updated', { overdue, dueToday, dueSoon, upcoming });
                }
            }
        } catch (err) {
            console.error('[CronJob] Error in due date reminder job:', err);
        }
    });
};

module.exports = { startDueDateReminderJob };
