import cron from 'node-cron'
import prisma from '../utils/prisma.js'
import { shouldSendReminder, computeDueDateStatus } from '../utils/dueDateUtils.js'
import { createNotification } from '../services/notificationService.js'

export const startDueDateReminderJob = (io) => {
    console.log('[CronJob] Due date reminder job started — runs every 15 minutes')

    const task = cron.schedule('*/15 * * * *', async () => {
        const now = new Date()
        console.log(`[CronJob] Running due date check at ${now.toISOString()}`)

        try {
            // Get all non-done tasks with due dates
            const tasks = await prisma.task.findMany({
                where: { status: { not: 'done' }, dueDate: { not: null } },
                select: {
                    id: true,
                    title: true,
                    dueDate: true,
                    status: true,
                    remindersSent: true,
                    snoozedUntil: true,
                    assigneeId: true,
                    projectId: true,
                    project: { select: { name: true } }
                }
            })

            const reminderTypes = ['overdue', 'due_24h', 'due_1h', 'due_today']
            const statusUpdates = []

            for (const task of tasks) {
                for (const reminderType of reminderTypes) {
                    if (shouldSendReminder(task, reminderType)) {
                        let message = ''
                        switch (reminderType) {
                            case 'overdue': message = `Task "${task.title}" is overdue`; break
                            case 'due_24h': message = `Task "${task.title}" is due in 24 hours`; break
                            case 'due_1h': message = `Task "${task.title}" is due in 1 hour`; break
                            case 'due_today': message = `Task "${task.title}" is due today`; break
                        }

                        if (task.assigneeId) {
                            await createNotification({
                                userId: task.assigneeId,
                                type: reminderType,
                                message,
                                taskId: task.id,
                                projectId: task.projectId,
                                projectName: task.project?.name,
                                taskTitle: task.title
                            })
                        }

                        await prisma.task.update({
                            where: { id: task.id },
                            data: {
                                remindersSent: { push: reminderType },
                                lastReminderSent: now
                            }
                        })

                        console.log(`[CronJob] Sent ${reminderType} reminder for task: ${task.title}`)
                    }
                }

                // Recompute dueDateStatus
                const newStatus = computeDueDateStatus(task.dueDate, task.status)
                statusUpdates.push({ id: task.id, dueDateStatus: newStatus })
            }

            // Batch update dueDateStatus
            for (const update of statusUpdates) {
                await prisma.task.update({
                    where: { id: update.id },
                    data: { dueDateStatus: update.dueDateStatus }
                })
            }

            console.log(`[CronJob] Updated dueDateStatus for ${statusUpdates.length} tasks`)

            // Emit summary updates — single groupBy replaces N+1 per-user COUNT queries
            if (io) {
                const statuses = ['overdue', 'due_today', 'due_soon', 'on_track']
                const grouped = await prisma.task.groupBy({
                    by: ['assigneeId', 'dueDateStatus'],
                    where: {
                        assigneeId: { not: null },
                        dueDateStatus: { in: statuses },
                        status: { not: 'done' }
                    },
                    _count: { id: true }
                })

                // Build a map: userId -> { overdue, dueToday, dueSoon, upcoming }
                const summaryMap = {}
                for (const row of grouped) {
                    const uid = row.assigneeId
                    if (!summaryMap[uid]) summaryMap[uid] = { overdue: 0, dueToday: 0, dueSoon: 0, upcoming: 0 }
                    const count = row._count.id
                    if (row.dueDateStatus === 'overdue') summaryMap[uid].overdue += count
                    if (row.dueDateStatus === 'due_today') summaryMap[uid].dueToday += count
                    if (row.dueDateStatus === 'due_soon') summaryMap[uid].dueSoon += count
                    if (row.dueDateStatus === 'on_track') summaryMap[uid].upcoming += count
                }

                for (const [userId, summary] of Object.entries(summaryMap)) {
                    io.to(`user:${userId}`).emit('dueDateSummary:updated', summary)
                }
            }
        } catch (err) {
            console.error('[CronJob] Error in due date reminder job:', err)
        }
    })

    return task
}
