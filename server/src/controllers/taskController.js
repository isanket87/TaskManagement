import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { computeDueDateStatus } from '../utils/dueDateUtils.js'
import { z } from 'zod'
import { startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { logTaskActivity } from '../services/activityService.js'

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
    projectId: true,
    assigneeId: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    assignee: { select: { id: true, name: true, avatar: true } },
    createdBy: { select: { id: true, name: true, avatar: true } },
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
    assigneeId: z.string().optional().nullable()
})

// GET /api/projects/:id/tasks
const getTasks = async (req, res, next) => {
    try {
        const { id: projectId } = req.params
        const { status, priority, assigneeId, dueDateFilter, search, page = 1, limit = 100 } = req.query

        const where = { projectId }
        if (status) where.status = status
        if (priority) where.priority = priority
        if (assigneeId) where.assigneeId = assigneeId
        if (search) where.title = { contains: search, mode: 'insensitive' }

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

        const maxPosition = await prisma.task.aggregate({
            where: { projectId, status: data.status || 'todo' },
            _max: { position: true }
        })

        const dueDate = data.dueDate ? new Date(data.dueDate) : null
        const dueDateStatus = computeDueDateStatus(dueDate, data.status || 'todo')

        const task = await prisma.task.create({
            data: {
                ...data,
                dueDate,
                dueDateStatus,
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

        return successResponse(res, { task }, 'Task created', 201)
    } catch (err) {
        next(err)
    }
}

// GET /api/projects/:id/tasks/:taskId
const getTask = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const task = await prisma.task.findUnique({ where: { id: taskId }, select: taskSelect })
        if (!task) return errorResponse(res, 'Task not found', 404)
        return successResponse(res, { task })
    } catch (err) {
        next(err)
    }
}

// PUT /api/projects/:id/tasks/:taskId
const updateTask = async (req, res, next) => {
    try {
        const { taskId, id: projectId } = req.params
        const data = req.body

        const dueDate = data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined
        const dueDateStatus = dueDate !== undefined ? computeDueDateStatus(dueDate, data.status || 'todo') : undefined

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
                ...(dueDateStatus !== undefined && { dueDateStatus })
            },
            select: taskSelect
        })

        const userId = req.user.id
        const changes = []
        if (data.status) changes.push(`Status changed to ${data.status}`)
        if (data.priority) changes.push(`Priority changed to ${data.priority}`)
        if (data.assigneeId) changes.push(`Reassigned task`)
        if (dueDate !== undefined) changes.push(dueDate ? `Due date set to ${dueDate.toDateString()}` : 'Due date removed')

        if (changes.length > 0) {
            await logTaskActivity({
                projectId,
                taskId,
                userId,
                type: 'task_updated',
                message: changes.join(', '),
                metadata: { changes }
            })
        }

        const io = req.app.get('io')
        if (io) io.to(`project:${projectId}`).emit('task:updated', { task })

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

// GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.id
        const now = new Date()

        const workspaceId = req.workspace.id

        const [myTasks, projects, overdueTasks, upcomingTasks, recentActivity] = await Promise.all([
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
            })
        ])

        return successResponse(res, { stats: { myTasks, projects, overdueTasks, upcomingTasks, recentActivity } })
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

        const tasksToCreate = tasks.map(t => {
            const pos = currentPosition
            currentPosition += 1024
            return {
                title: t.title || 'Untitled Task',
                description: t.description || '',
                status: t.status || 'todo',
                priority: t.priority || 'medium',
                position: pos,
                projectId,
                createdById: userId,
                // Due date parsing if provided
                dueDate: t.dueDate ? new Date(t.dueDate) : null,
                hasDueTime: !!t.hasDueTime
            }
        })

        const created = await prisma.task.createMany({
            data: tasksToCreate
        })

        // Log the bulk import activity
        await logTaskActivity({
            projectId,
            userId,
            type: 'IMPORT_TASKS',
            message: `Imported ${tasks.length} tasks via CSV`
        })

        return successResponse(res, { count: created.count, message: `Successfully imported ${tasks.length} tasks` })
    } catch (err) {
        next(err)
    }
}

export {
    getTasks, createTask, getTask, updateTask, deleteTask,
    updateStatus, updatePosition, updateDueDate, snoozeTask,
    bulkUpdateDueDate, getDueDateSummary, getUpcomingTasks, getOverdueTasks,
    getCalendarTasks, getDashboardStats, getTaskActivities, bulkImportTasks
}
