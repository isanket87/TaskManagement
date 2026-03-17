import cron from 'node-cron'
import prisma from '../utils/prisma.js'
import { calculateNextOccurrence } from '../utils/recurrenceUtils.js'
import { computeDueDateStatus } from '../utils/dueDateUtils.js'
import { logTaskActivity } from '../services/activityService.js'

export const startRecurringTasksJob = (io) => {
    console.log('[CronJob] Recurring tasks job started — runs every hour')

    // Run every hour at minute 0
    const job = cron.schedule('0 * * * *', async () => {
        const now = new Date()
        console.log(`[CronJob] Checking for recurring tasks to recreate at ${now.toISOString()}`)

        try {
            // Find all tasks that are recurring and have reached their next occurrence date
            // Usually, the "template" task is what we track.
            const templates = await prisma.task.findMany({
                where: {
                    isRecurring: true,
                    nextOccurrence: { lte: now }
                }
            })

            console.log(`[CronJob] Found ${templates.length} recurring templates to process`)

            for (const template of templates) {
                // 1. Create the new task instance
                const nextDueDate = template.nextOccurrence
                const nextDueDateStatus = computeDueDateStatus(nextDueDate, 'todo')

                // Calculate next position in the project's 'todo' status
                const maxPosition = await prisma.task.aggregate({
                    where: { projectId: template.projectId, status: 'todo' },
                    _max: { position: true }
                })
                const newPosition = (maxPosition._max.position || 0) + 1

                const newTask = await prisma.task.create({
                    data: {
                        title: template.title,
                        description: template.description,
                        status: 'todo',
                        priority: template.priority,
                        tags: template.tags,
                        dueDate: nextDueDate,
                        hasDueTime: template.hasDueTime,
                        dueDateStatus: nextDueDateStatus,
                        projectId: template.projectId,
                        assigneeId: template.assigneeId,
                        createdById: template.createdById,
                        parentTaskId: template.parentTaskId,
                        position: newPosition,
                        lastRecurrenceId: template.id
                    }
                })

                // 2. Calculate the subsequent occurrence for the template
                const nextOccurrence = calculateNextOccurrence(
                    template.nextOccurrence,
                    template.recurrenceRule,
                    template.recurrenceConfig || {}
                )

                // 3. Update the template task
                await prisma.task.update({
                    where: { id: template.id },
                    data: {
                        nextOccurrence,
                        updatedAt: now
                    }
                })

                // 4. Log activity
                await logTaskActivity({
                    projectId: template.projectId,
                    taskId: newTask.id,
                    userId: template.createdById,
                    type: 'task_created',
                    message: `Automatically created recurring task "${newTask.title}"`,
                    metadata: { templateId: template.id }
                })

                // 5. Emit socket event
                if (io) {
                    io.to(`project:${template.projectId}`).emit('task:created', { task: newTask })
                }

                console.log(`[CronJob] Recreated task "${template.title}" (New ID: ${newTask.id})`)
            }
        } catch (err) {
            console.error('[CronJob] Error in recurring tasks job:', err)
        }
    })

    return job
}
