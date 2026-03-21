import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { computeDueDateStatus } from '../utils/dueDateUtils.js'
import { z } from 'zod'
import { startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { logTaskActivity } from '../services/activityService.js'
import { calculateNextOccurrence } from '../utils/recurrenceUtils.js'
import cache, { TTL } from '../utils/cache.js'

// Bust all task-aggregation caches for a workspace after any mutation
const invalidateTaskCaches = (workspaceId, projectId, userId) =>
    cache.del(
        `ws:${workspaceId}:user:${userId}:dashboard`,
        `ws:${workspaceId}:analytics`,
        `ws:${workspaceId}:projects`,
        `project:${projectId}:analytics`
    )

const taskSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    position: true,
    tags: true,
    dueDate: true,
    hasDueTime: true,
    dueDateStatus: true,
    snoozedUntil: true,
    remindersSent: true,
    isRecurring: true,
    recurrenceRule: true,
    recurrenceConfig: true,
    nextOccurrence: true,
    lastRecurrenceId: true,
    projectId: true,
    assigneeId: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    assignee: { select: { id: true, name: true, avatar: true } },
    createdBy: { select: { id: true, name: true, avatar: true } },
    parentTaskId: true,
    _count: { select: { comments: true } }
}

const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    dueDate: z.string().optional().nullable(),
    hasDueTime: z.boolean().optional(),
    assigneeId: z.string().optional().nullable().transform(val => val === '' ? null : val),
    parentTaskId: z.string().optional().nullable().transform(val => val === '' ? null : val),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional().nullable(),
    recurrenceConfig: z.any().optional().nullable()
})

// Helper to validate assignee existence
const validateAssignee = async (assigneeId) => {
    if (!assigneeId) return null;
    const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
    return user ? user.id : null;
};

// GET /api/projects/:id/tasks
const getTasks = async (req, res, next) => {
    try {
        const { id: projectId } = req.params
        const { status, priority, assigneeId, dueDateFilter, search, page = 1, limit = 500 } = req.query

        const where = { projectId }
        if (status) where.status = status
        if (priority) where.priority = priority
        if (assigneeId) where.assigneeId = assigneeId
        if (search) where.title = { contains: search, mode: 'insensitive' }
        if (req.query.includeSubtasks !== 'true') where.parentTaskId = null

        const now = new Date()
        if (dueDateFilter === 'overdue') {
            where.dueDate = { lt: now }
            where.status = { not: 'done' }
        } else if (dueDateFilter === 'today') {
            where.dueDate = { gte: startOfDay(now), lte: endOfDay(now) }
        } else if (dueDateFilter === 'this_week') {
            where.dueDate = { gte: now, lte: addDays(now, 7) }
        } else if (dueDateFilter === 'no_date') {
            where.dueDate = null
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)
        const take = parseInt(limit)

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({ where, select: taskSelect, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], skip, take }),
            prisma.task.count({ where })
        ])
        return successResponse(res, { tasks, total, page: parseInt(page), limit: parseInt(limit) })
    } catch (err) {
        next(err)
    }
}

// POST /api/projects/:id/tasks
const createTask = async (req, res, next) => {
    try {
        const { id: projectId } = req.params
        const data = createTaskSchema.parse(req.body)
        const userId = req.user.id

        // Validate assignee existence to prevent FK crashes
        if (data.assigneeId) {
            const validId = await validateAssignee(data.assigneeId);
            if (!validId) {
                data.assigneeId = null; // Default to unassigned if user not found instead of crashing
            }
        }

        const maxPosition = await prisma.task.aggregate({
            where: { projectId, status: data.status || 'todo' },
            _max: { position: true }
        })

        const dueDate = data.dueDate ? new Date(data.dueDate) : null
        const dueDateStatus = computeDueDateStatus(dueDate, data.status || 'todo')

        // Calculate next occurrence if recurring
        let nextOccurrence = null
        if (data.isRecurring && data.recurrenceRule) {
            // First occurrence is usually the due date, or today if no due date
            nextOccurrence = calculateNextOccurrence(dueDate || new Date(), data.recurrenceRule, data.recurrenceConfig || {})
        }

        const task = await prisma.task.create({
            data: {
                ...data,
                dueDate,
                dueDateStatus,
                nextOccurrence,
                projectId,
                createdById: userId,
                position: (maxPosition._max.position || 0) + 1
            },
            select: taskSelect
        })

        // Log activity
        await logTaskActivity({
            projectId,
            taskId: task.id,
            userId,
            type: 'task_created',
            message: `Created task "${task.title}"`,
            metadata: {}
        })

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:created', { task })

        // Invalidate aggregation caches
        await invalidateTaskCaches(req.workspace.id, projectId, req.user.id)

        return successResponse(res, { task }, 'Task created', 201)
    } catch (err) {
        next(err)
    }
}

// GET /api/projects/:id/tasks/:taskId
const getTask = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                ...taskSelect,
                subtasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        assignee: { select: { id: true, name: true, avatar: true } },
                        _count: { select: { subtasks: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })
        if (!task) return errorResponse(res, 'Task not found', 404)
        return successResponse(res, { task })
    } catch (err) {
        next(err)
    }
}

// PUT /api/projects/:id/tasks/:taskId
const updateTask = async (req, res, next) => {
    try {
        const { taskId } = req.params
        let { id: projectId } = req.params

        const data = req.body

        // If accessed via workspace alias (/workspaces/:slug/tasks/:taskId), projectId will be undefined.
        if (!projectId) {
            const tempTask = await prisma.task.findUnique({
                where: { id: taskId },
                select: { projectId: true }
            })
            if (!tempTask) throw new Error('Task not found')
            projectId = tempTask.projectId
        }

        const dueDate = data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined
        const dueDateStatus = dueDate !== undefined ? computeDueDateStatus(dueDate, data.status || 'todo') : undefined

        // Handle recurrence updates
        let nextOccurrence = undefined
        const currentTask = await prisma.task.findUnique({ 
            where: { id: taskId },
            include: { assignee: true }
        })

        if (data.isRecurring !== undefined || data.recurrenceRule !== undefined || data.recurrenceConfig !== undefined || dueDate !== undefined) {
            const isRec = data.isRecurring !== undefined ? data.isRecurring : currentTask.isRecurring
            const rule = data.recurrenceRule !== undefined ? data.recurrenceRule : currentTask.recurrenceRule
            const config = data.recurrenceConfig !== undefined ? data.recurrenceConfig : currentTask.recurrenceConfig
            const dDate = dueDate !== undefined ? dueDate : currentTask.dueDate

            if (isRec && rule) {
                nextOccurrence = calculateNextOccurrence(dDate || new Date(), rule, config || {})
            } else if (isRec === false) {
                nextOccurrence = null
            }
        }

        // --- Audit Logging Logic ---
        const changes = []
        const metadata = { before: {}, after: {} }

        const logChange = (field, label, formatFn = (v) => v) => {
            if (data[field] !== undefined && data[field] !== currentTask[field]) {
                const oldVal = formatFn(currentTask[field])
                const newVal = formatFn(data[field])
                changes.push(`${label} from "${oldVal || 'None'}" to "${newVal || 'None'}"`)
                metadata.before[field] = currentTask[field]
                metadata.after[field] = data[field]
            }
        }

        logChange('title', 'title')
        logChange('status', 'status', (v) => v?.replace('_', ' '))
        logChange('priority', 'priority')

        if (data.description !== undefined && data.description !== currentTask.description) {
            const stripHtml = (html) => html?.replace(/<[^>]*>?/gm, '') || '';
            const oldPlain = stripHtml(currentTask.description);
            const newPlain = stripHtml(data.description);
            
            const oldSnippet = oldPlain.length > 30 ? oldPlain.substring(0, 30) + '...' : oldPlain;
            const newSnippet = newPlain.length > 30 ? newPlain.substring(0, 30) + '...' : newPlain;

            changes.push(`description from "${oldSnippet || 'None'}" to "${newSnippet || 'None'}"`)
            metadata.before.description = currentTask.description
            metadata.after.description = data.description
        }

        if (data.tags !== undefined && JSON.stringify(data.tags) !== JSON.stringify(currentTask.tags)) {
            const oldTags = Array.isArray(currentTask.tags) ? currentTask.tags.join(', ') : 'None'
            const newTags = Array.isArray(data.tags) ? data.tags.join(', ') : 'None'
            changes.push(`tags from "${oldTags}" to "${newTags}"`)
            metadata.before.tags = currentTask.tags
            metadata.after.tags = data.tags
        }

        if (data.isRecurring !== undefined && data.isRecurring !== currentTask.isRecurring) {
            changes.push(`recurrence ${data.isRecurring ? 'enabled' : 'disabled'}`)
            metadata.before.isRecurring = currentTask.isRecurring
            metadata.after.isRecurring = data.isRecurring
        }

        if (data.recurrenceRule !== undefined && data.recurrenceRule !== currentTask.recurrenceRule) {
            changes.push(`recurrence rule from "${currentTask.recurrenceRule || 'None'}" to "${data.recurrenceRule || 'None'}"`)
            metadata.before.recurrenceRule = currentTask.recurrenceRule
            metadata.after.recurrenceRule = data.recurrenceRule
        }

        if (data.assigneeId !== undefined && data.assigneeId !== currentTask.assigneeId) {            // Clean empty string from frontend
            if (data.assigneeId === '') data.assigneeId = null;

            const validId = data.assigneeId ? await validateAssignee(data.assigneeId) : null;
            if (data.assigneeId && !validId) {
                data.assigneeId = null; // Reset to null if invalid
            }

            const newAssigneeName = data.assigneeId 
                ? (await prisma.user.findUnique({ where: { id: data.assigneeId }, select: { name: true } }))?.name
                : 'Unassigned'
            
            changes.push(`assignee from "${currentTask.assignee?.name || 'Unassigned'}" to "${newAssigneeName}"`)
            metadata.before.assignee = currentTask.assignee?.name
            metadata.after.assignee = newAssigneeName
        }

        if (dueDate !== undefined && String(dueDate) !== String(currentTask.dueDate)) {
            const oldDate = currentTask.dueDate ? new Date(currentTask.dueDate).toLocaleDateString() : 'None'
            const newDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'None'
            changes.push(`due date from "${oldDate}" to "${newDate}"`)
        }
        // --- End Audit Logging ---

        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.tags !== undefined && { tags: data.tags }),
                ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
                ...(dueDate !== undefined && { dueDate }),
                ...(data.hasDueTime !== undefined && { hasDueTime: data.hasDueTime }),
                ...(dueDateStatus !== undefined && { dueDateStatus }),
                ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
                ...(data.recurrenceRule !== undefined && { recurrenceRule: data.recurrenceRule }),
                ...(data.recurrenceConfig !== undefined && { recurrenceConfig: data.recurrenceConfig }),
                ...(nextOccurrence !== undefined && { nextOccurrence })
            },
            select: taskSelect
        })

        if (changes.length > 0) {
            await logTaskActivity({
                projectId,
                taskId,
                userId: req.user.id,
                type: 'task_updated',
                message: `Updated ${changes.join(', ')}`,
                metadata
            })
        }

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:updated', { task })

        // Invalidate aggregation caches
        await invalidateTaskCaches(req.workspace.id, projectId, req.user.id)

        return successResponse(res, { task }, 'Task updated')
    } catch (err) {
        next(err)
    }
}

// DELETE /api/projects/:id/tasks/:taskId
const deleteTask = async (req, res, next) => {
    try {
        const { taskId, id: projectId } = req.params
        await prisma.task.delete({ where: { id: taskId } })

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:deleted', { taskId })

        // Invalidate aggregation caches
        await invalidateTaskCaches(req.workspace.id, projectId, req.user.id)

        return successResponse(res, null, 'Task deleted')
    } catch (err) {
        next(err)
    }
}

// PATCH /api/projects/:id/tasks/:taskId/status
const updateStatus = async (req, res, next) => {
    try {
        const { taskId, id: projectId } = req.params
        const { status } = req.body

        // Step 1: update status, get dueDate back from taskSelect (no pre-read needed)
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { status },
            select: taskSelect
        })

        // Step 2: patch dueDateStatus only if it changed (avoids a write when not needed)
        const dueDateStatus = computeDueDateStatus(task.dueDate, status)
        if (task.dueDateStatus !== dueDateStatus) {
            await prisma.task.update({ where: { id: taskId }, data: { dueDateStatus } })
            task.dueDateStatus = dueDateStatus
        }

        await logTaskActivity({
            projectId,
            taskId,
            userId: req.user.id,
            type: 'status_updated',
            message: `Status changed to ${status}`,
            metadata: { status }
        })

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:moved', { taskId, status })

        // Invalidate aggregation caches (status changes affect dashboard counts)
        await invalidateTaskCaches(req.workspace.id, projectId, req.user.id)

        return successResponse(res, { task }, 'Status updated')
    } catch (err) {
        next(err)
    }
}

// PATCH /api/projects/:id/tasks/:taskId/position
const updatePosition = async (req, res, next) => {
    try {
        const { taskId, id: projectId } = req.params
        const { position, status } = req.body

        const task = await prisma.task.update({
            where: { id: taskId },
            data: { position, ...(status && { status }) },
            select: taskSelect
        })

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:moved', { taskId, status, position })

        return successResponse(res, { task })
    } catch (err) {
        next(err)
    }
}

// PATCH /api/projects/:id/tasks/:taskId/due-date
const updateDueDate = async (req, res, next) => {
    try {
        const { taskId, id: projectId } = req.params
        const { dueDate, hasDueTime } = req.body

        const due = dueDate ? new Date(dueDate) : null
        const existingTask = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true } })
        const dueDateStatus = computeDueDateStatus(due, existingTask?.status || 'todo')

        const task = await prisma.task.update({
            where: { id: taskId },
            data: { dueDate: due, hasDueTime: hasDueTime ?? false, dueDateStatus },
            select: taskSelect
        })

        await logTaskActivity({
            projectId,
            taskId,
            userId: req.user.id,
            type: 'due_date_updated',
            message: due ? `Due date set to ${due.toDateString()}` : `Due date removed`,
            metadata: { dueDate: due }
        })

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:dueDateUpdated', { taskId, dueDate: due, dueDateStatus })

        await invalidateTaskCaches(req.workspace.id, projectId, req.user.id)

        return successResponse(res, { task }, 'Due date updated')
    } catch (err) {
        next(err)
    }
}

// PATCH /api/projects/:id/tasks/:taskId/snooze
const snoozeTask = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const { snoozedUntil } = req.body
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null },
            select: taskSelect
        })
        return successResponse(res, { task }, 'Task snoozed')
    } catch (err) {
        next(err)
    }
}

// PATCH /api/tasks/bulk-due-date
const bulkUpdateDueDate = async (req, res, next) => {
    try {
        const { taskIds, dueDate, hasDueTime } = req.body
        if (!taskIds || !Array.isArray(taskIds)) return errorResponse(res, 'taskIds required', 400)

        const due = dueDate ? new Date(dueDate) : null

        await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { dueDate: due, hasDueTime: hasDueTime ?? false }
        })

        return successResponse(res, null, 'Bulk due date updated')
    } catch (err) {
        next(err)
    }
}

// GET /api/tasks/due-date-summary
const getDueDateSummary = async (req, res, next) => {
    try {
        const userId = req.user.id
        const now = new Date()
        const workspaceId = req.workspace.id

        const [overdue, dueToday, dueSoon, upcoming] = await Promise.all([
            prisma.task.count({ where: { assigneeId: userId, dueDate: { lt: now }, status: { not: 'done' }, project: { workspaceId } } }),
            prisma.task.count({ where: { assigneeId: userId, dueDate: { gte: startOfDay(now), lte: endOfDay(now) }, status: { not: 'done' }, project: { workspaceId } } }),
            prisma.task.count({ where: { assigneeId: userId, dueDate: { gt: endOfDay(now), lte: addDays(now, 3) }, status: { not: 'done' }, project: { workspaceId } } }),
            prisma.task.count({ where: { assigneeId: userId, dueDate: { gt: addDays(now, 3) }, status: { not: 'done' }, project: { workspaceId } } })
        ])

        return successResponse(res, { summary: { overdue, dueToday, dueSoon, upcoming } })
    } catch (err) {
        next(err)
    }
}

// GET /api/tasks/upcoming
const getUpcomingTasks = async (req, res, next) => {
    try {
        const userId = req.user.id
        const days = parseInt(req.query.days || 7)
        const now = new Date()
        const workspaceId = req.workspace.id

        const tasks = await prisma.task.findMany({
            where: {
                assigneeId: userId,
                dueDate: { gte: now, lte: addDays(now, days) },
                status: { not: 'done' },
                project: { workspaceId }
            },
            select: taskSelect,
            orderBy: { dueDate: 'asc' }
        })
        return successResponse(res, { tasks })
    } catch (err) {
        next(err)
    }
}

// GET /api/tasks/overdue
const getOverdueTasks = async (req, res, next) => {
    try {
        const userId = req.user.id
        const workspaceId = req.workspace.id
        const tasks = await prisma.task.findMany({
            where: { assigneeId: userId, dueDate: { lt: new Date() }, status: { not: 'done' }, project: { workspaceId } },
            select: taskSelect,
            orderBy: { dueDate: 'asc' }
        })
        return successResponse(res, { tasks })
    } catch (err) {
        next(err)
    }
}

// GET /api/calendar
const getCalendarTasks = async (req, res, next) => {
    try {
        const userId = req.user.id
        const workspaceId = req.workspace.id
        const { month } = req.query // e.g., "2025-03"

        let start, end
        if (month) {
            const [year, m] = month.split('-').map(Number)
            const d = new Date(year, m - 1, 1)
            start = startOfMonth(d)
            end = endOfMonth(d)
        } else {
            const now = new Date()
            start = startOfMonth(now)
            end = endOfMonth(now)
        }

        const tasks = await prisma.task.findMany({
            where: {
                dueDate: { gte: start, lte: end },
                project: { workspaceId }
            },
            select: { ...taskSelect, project: { select: { id: true, name: true, color: true } } },
            orderBy: { dueDate: 'asc' }
        })
        return successResponse(res, { tasks })
    } catch (err) {
        next(err)
    }
}

const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.id
        const workspaceId = req.workspace.id
        const cacheKey = `ws:${workspaceId}:user:${userId}:dashboard`
        const cached = await cache.get(cacheKey)
        if (cached) return successResponse(res, { stats: cached })

        const now = new Date()
        const weekAgo = addDays(now, -7)

        const [
            myTasks, projects, overdueTasks, upcomingTasks, recentActivity, 
            completedThisWeek, hoursThisWeekRaw, tasksThisWeek, byPriorityRaw
        ] = await Promise.all([
            prisma.task.findMany({
                where: { assigneeId: userId, status: { not: 'done' }, project: { workspaceId } },
                select: taskSelect,
                orderBy: { dueDate: 'asc' },
                take: 20
            }),
            prisma.project.count({
                where: { workspaceId }
            }),
            prisma.task.count({ where: { assigneeId: userId, dueDate: { lt: now }, status: { not: 'done' }, project: { workspaceId } } }),
            prisma.task.findMany({
                where: { assigneeId: userId, dueDate: { gte: now, lte: addDays(now, 7) }, status: { not: 'done' }, project: { workspaceId } },
                select: taskSelect,
                orderBy: { dueDate: 'asc' },
                take: 10
            }),
            prisma.activityLog.findMany({
                where: { project: { workspaceId } },
                include: { user: { select: { id: true, name: true, avatar: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            prisma.task.count({
                where: { assigneeId: userId, status: 'done', updatedAt: { gte: weekAgo }, project: { workspaceId } }
            }),
            prisma.timeEntry.aggregate({
                where: { userId, startTime: { gte: weekAgo }, project: { workspaceId } },
                _sum: { duration: true }
            }),
            // NEW: Weekly Trend
            prisma.task.findMany({
                where: { assigneeId: userId, status: 'done', updatedAt: { gte: weekAgo }, project: { workspaceId } },
                select: { updatedAt: true }
            }),
            // NEW: Priority Breakdown
            prisma.task.groupBy({
                by: ['priority'],
                where: { assigneeId: userId, status: { not: 'done' }, project: { workspaceId } },
                _count: { _all: true }
            })
        ])

        const hoursThisWeek = Math.round(((hoursThisWeekRaw._sum.duration || 0) / 3600) * 10) / 10
        
        // Process productivity trend
        const productivityTrend = []
        const trendMap = {}
        for (let i = 6; i >= 0; i--) {
            const d = addDays(now, -i)
            trendMap[d.toISOString().split('T')[0]] = 0
        }
        tasksThisWeek.forEach(t => {
            const day = t.updatedAt.toISOString().split('T')[0]
            if (trendMap[day] !== undefined) trendMap[day]++
        })
        Object.entries(trendMap).forEach(([date, count]) => {
            productivityTrend.push({ date, count })
        })

        const stats = { 
            myTasks, projects, overdueTasks, upcomingTasks, recentActivity, 
            completedThisWeek, hoursThisWeek, productivityTrend,
            byPriority: Object.fromEntries(byPriorityRaw.map(r => [r.priority, r._count._all]))
        }

        await cache.set(cacheKey, stats, TTL.DASHBOARD)
        return successResponse(res, { stats })
    } catch (err) {
        next(err)
    }
}

// GET /api/projects/:id/tasks/:taskId/activities
const getTaskActivities = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const activities = await prisma.activityLog.findMany({
            where: { taskId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(res, { activities })
    } catch (err) {
        next(err)
    }
}

// POST /api/projects/:id/tasks/:taskId/duplicate
const duplicateTask = async (req, res, next) => {
    try {
        const { taskId, id: projectId } = req.params;
        const userId = req.user.id;

        // Fetch original with all needed properties
        const original = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!original) {
            return errorResponse(res, 'Task not found', 404);
        }

        // Calculate position - place immediately below original
        // Shift all tasks in the same status that come after the original down by 1
        await prisma.task.updateMany({
            where: {
                projectId,
                status: original.status,
                position: { gt: original.position }
            },
            data: {
                position: { increment: 1 }
            }
        });

        const newPosition = original.position + 1;

        // Create the clone
        let assigneeId = original.assigneeId;
        if (assigneeId) {
            const validId = await validateAssignee(assigneeId);
            if (!validId) assigneeId = null;
        }

        const clone = await prisma.task.create({
            data: {
                title: `Copy of ${original.title}`,
                description: original.description,
                status: original.status,
                priority: original.priority,
                tags: original.tags,
                dueDate: original.dueDate,
                hasDueTime: original.hasDueTime,
                dueDateStatus: original.dueDateStatus,
                position: newPosition,
                projectId: original.projectId,
                assigneeId,
                parentTaskId: original.parentTaskId,
                createdById: userId,
            },
            select: taskSelect
        });

        // Log the duplication 
        await logTaskActivity({
            projectId,
            taskId: clone.id,
            userId,
            type: 'task_duplicated',
            message: `Duplicated from task "${original.title}"`,
            metadata: { originalTaskId: original.id }
        });

        // Broadcast to clients so they update their boards in real-time
        const io = req.app.get('io');
        if (io) io.to(`project:${projectId}`).emit('task:created', { task: clone });

        // Invalidate aggregations
        await invalidateTaskCaches(req.workspace.id, projectId, userId);

        return successResponse(res, { task: clone }, 'Task duplicated successfully', 201);
    } catch (err) {
        next(err);
    }
}

// POST /api/projects/:id/tasks/bulk
const bulkImportTasks = async (req, res, next) => {
    try {
        const { id: projectId } = req.params
        const { tasks } = req.body
        const userId = req.user.id

        if (!tasks || !Array.isArray(tasks)) {
            return res.status(400).json({ success: false, message: 'Invalid tasks array' })
        }

        // Get max position to append new tasks at the end
        const maxPositionTask = await prisma.task.findFirst({
            where: { projectId },
            orderBy: { position: 'desc' },
            select: { position: true }
        })
        let currentPosition = maxPositionTask ? maxPositionTask.position + 1024 : 1024

        const tasksToCreate = await Promise.all(tasks.map(async (t) => {
            const pos = currentPosition
            currentPosition += 1024

            const dueDate = t.dueDate ? new Date(t.dueDate) : null;
            const status = t.status || 'todo';
            const dueDateStatus = computeDueDateStatus(dueDate, status);

            // Clean empty string and validate existence
            let assigneeId = t.assigneeId === '' ? null : (t.assigneeId || null);
            if (assigneeId) {
                const validId = await validateAssignee(assigneeId);
                if (!validId) assigneeId = null;
            }

            return {
                title: t.title || 'Untitled Task',
                description: t.description || '',
                status,
                priority: t.priority || 'medium',
                position: pos,
                projectId,
                createdById: userId,
                assigneeId,
                parentTaskId: t.parentTaskId || null,
                tags: t.tags || [],
                // Due date parsing if provided
                dueDate,
                hasDueTime: !!t.hasDueTime,
                dueDateStatus
            }
        }))

        const created = await prisma.task.createMany({
            data: tasksToCreate
        })

        // Log the bulk import activity
        await logTaskActivity({
            projectId,
            userId,
            type: 'IMPORT_TASKS',
            message: `Imported ${tasks.length} tasks`
        })

        // Invalidate caches — bulk import affects dashboard and analytics counts
        await invalidateTaskCaches(req.workspace.id, projectId, userId)

        return successResponse(res, { count: created.count, message: `Successfully imported ${tasks.length} tasks` })
    } catch (err) {
        next(err)
    }
}

export {
    getTasks, createTask, getTask, updateTask, deleteTask, duplicateTask,
    updateStatus, updatePosition, updateDueDate, snoozeTask,
    bulkUpdateDueDate, getDueDateSummary, getUpcomingTasks, getOverdueTasks,
    getCalendarTasks, getDashboardStats, getTaskActivities, bulkImportTasks
}
