import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'
import { z } from 'zod'
import cache, { TTL } from '../utils/cache.js'

const createProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    color: z.string().optional(),
    dueDate: z.string().optional()
})

const getProjects = async (req, res, next) => {
    try {
        const workspaceId = req.workspace.id
        const cacheKey = `ws:${workspaceId}:projects`
        const cached = await cache.get(cacheKey)
        if (cached) return successResponse(res, { projects: cached })

        const projects = await prisma.project.findMany({
            where: { workspaceId },
            include: {
                owner: { select: { id: true, name: true, avatarUrl: true } },
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                _count: { select: { tasks: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        await cache.set(cacheKey, projects, TTL.PROJECTS)
        return successResponse(res, { projects })
    } catch (err) {
        next(err)
    }
}

const createProject = async (req, res, next) => {
    try {
        const { name, description, color, dueDate } = createProjectSchema.parse(req.body)
        const userId = req.user.id

        const project = await prisma.project.create({
            data: {
                name,
                description,
                color: color || '#6366f1',
                dueDate: dueDate ? new Date(dueDate) : null,
                ownerId: userId,
                workspaceId: req.workspace.id,
                members: { create: { userId, role: 'owner' } }
            },
            include: {
                owner: { select: { id: true, name: true, avatarUrl: true } },
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }
            }
        })

        await cache.del(`ws:${req.workspace.id}:projects`)
        return successResponse(res, { project }, 'Project created', 201)
    } catch (err) {
        next(err)
    }
}

const getProject = async (req, res, next) => {
    try {
        const { id } = req.params
        const project = await prisma.project.findFirst({
            where: { id, workspaceId: req.workspace.id },
            include: {
                owner: { select: { id: true, name: true, avatarUrl: true } },
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                _count: { select: { tasks: true } }
            }
        })
        if (!project) return errorResponse(res, 'Project not found', 404)
        return successResponse(res, { project })
    } catch (err) {
        next(err)
    }
}

const updateProject = async (req, res, next) => {
    try {
        const { id } = req.params
        const data = req.body

        // Verify it belongs to workspace (extra safety)
        const check = await prisma.project.findFirst({ where: { id, workspaceId: req.workspace.id } })
        if (!check) return errorResponse(res, 'Project not found in this workspace', 404)

        const project = await prisma.project.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                status: data.status,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined
            }
        })
        await cache.del(`ws:${req.workspace.id}:projects`)
        return successResponse(res, { project }, 'Project updated')
    } catch (err) {
        next(err)
    }
}

const deleteProject = async (req, res, next) => {
    try {
        const { id } = req.params

        const check = await prisma.project.findFirst({ where: { id, workspaceId: req.workspace.id } })
        if (!check) return errorResponse(res, 'Project not found in this workspace', 404)

        await prisma.project.delete({ where: { id } })
        await cache.del(
            `ws:${req.workspace.id}:projects`,
            `project:${id}:analytics`
        )
        return successResponse(res, null, 'Project deleted')
    } catch (err) {
        next(err)
    }
}

const getMembers = async (req, res, next) => {
    try {
        const { id } = req.params
        const members = await prisma.projectMember.findMany({
            where: { projectId: id },
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
        })
        return successResponse(res, { members })
    } catch (err) {
        next(err)
    }
}

const addMember = async (req, res, next) => {
    try {
        const { id } = req.params
        const { userId, role = 'member' } = req.body

        const member = await prisma.projectMember.create({
            data: { projectId: id, userId, role },
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
        })
        return successResponse(res, { member }, 'Member added', 201)
    } catch (err) {
        next(err)
    }
}

const removeMember = async (req, res, next) => {
    try {
        const { id, userId } = req.params
        await prisma.projectMember.deleteMany({ where: { projectId: id, userId } })
        return successResponse(res, null, 'Member removed')
    } catch (err) {
        next(err)
    }
}

const getActivity = async (req, res, next) => {
    try {
        const { id } = req.params
        const activities = await prisma.activityLog.findMany({
            where: { projectId: id },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
        return successResponse(res, { activities })
    } catch (err) {
        next(err)
    }
}

const getAnalytics = async (req, res, next) => {
    try {
        const { id } = req.params
        const cacheKey = `project:${id}:analytics`
        const cached = await cache.get(cacheKey)
        if (cached) return successResponse(res, { analytics: cached })

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Run all DB aggregations in parallel — no full table scan into JS memory
        const [byStatusRaw, byPriorityRaw, totalCount, completedCount, overdueCount, completedLast30Raw] = await Promise.all([
            prisma.task.groupBy({ by: ['status'], where: { projectId: id }, _count: { _all: true } }),
            prisma.task.groupBy({ by: ['priority'], where: { projectId: id }, _count: { _all: true } }),
            prisma.task.count({ where: { projectId: id } }),
            prisma.task.count({ where: { projectId: id, status: 'done' } }),
            prisma.task.count({ where: { projectId: id, status: { not: 'done' }, dueDate: { lt: now } } }),
            prisma.task.findMany({
                where: { projectId: id, status: 'done', updatedAt: { gte: thirtyDaysAgo } },
                select: { updatedAt: true }
            })
        ])

        const byStatus = Object.fromEntries(byStatusRaw.map(r => [r.status, r._count._all]))
        const byPriority = Object.fromEntries(byPriorityRaw.map(r => [r.priority, r._count._all]))
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        const dailyCompletion = {}
        completedLast30Raw.forEach(({ updatedAt }) => {
            const day = updatedAt.toISOString().split('T')[0]
            dailyCompletion[day] = (dailyCompletion[day] || 0) + 1
        })

        const analytics = { byStatus, byPriority, overdue: overdueCount, completionRate, total: totalCount, completed: completedCount, dailyCompletion }
        await cache.set(cacheKey, analytics, TTL.ANALYTICS)
        return successResponse(res, { analytics })
    } catch (err) {
        next(err)
    }
}

export {
    getProjects, createProject, getProject, updateProject, deleteProject,
    getMembers, addMember, removeMember, getActivity, getAnalytics
}
