import prisma from '../utils/prisma.js'

// ── GET /tasks/:taskId/dependencies ───────────────────────────────────────────
const getDependencies = async (req, res, next) => {
    try {
        const { taskId } = req.params

        const [blockedBy, blocks] = await Promise.all([
            // Tasks that BLOCK this task (must be done first)
            prisma.taskDependency.findMany({
                where: { blockedTaskId: taskId },
                include: {
                    blockingTask: {
                        select: {
                            id: true, title: true, status: true, priority: true,
                            project: { select: { id: true, name: true, color: true } },
                            assignee: { select: { id: true, name: true, avatarUrl: true } }
                        }
                    }
                }
            }),
            // Tasks that THIS task blocks
            prisma.taskDependency.findMany({
                where: { blockingTaskId: taskId },
                include: {
                    blockedTask: {
                        select: {
                            id: true, title: true, status: true, priority: true,
                            project: { select: { id: true, name: true, color: true } },
                            assignee: { select: { id: true, name: true, avatarUrl: true } }
                        }
                    }
                }
            })
        ])

        return res.json({
            success: true,
            data: {
                blockedBy: blockedBy.map(d => ({ depId: d.id, ...d.blockingTask })),
                blocks: blocks.map(d => ({ depId: d.id, ...d.blockedTask }))
            }
        })
    } catch (err) { next(err) }
}

// ── POST /tasks/:taskId/dependencies ──────────────────────────────────────────
const addDependency = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const { blockingTaskId } = req.body

        if (!blockingTaskId) return res.status(400).json({ success: false, message: 'blockingTaskId is required' })
        if (blockingTaskId === taskId) return res.status(400).json({ success: false, message: 'A task cannot depend on itself' })

        // Check both tasks belong to the same workspace
        const workspaceId = req.workspace.id
        const [blocker, blocked] = await Promise.all([
            prisma.task.findFirst({ where: { id: blockingTaskId, project: { workspaceId } }, select: { id: true } }),
            prisma.task.findFirst({ where: { id: taskId, project: { workspaceId } }, select: { id: true } })
        ])
        if (!blocker || !blocked) return res.status(404).json({ success: false, message: 'Task not found in workspace' })

        // Circular dependency check: would adding blockingTask → taskId create a cycle?
        // i.e. is taskId already an ancestor of blockingTaskId?
        const hasCycle = await detectCycle(blockingTaskId, taskId)
        if (hasCycle) {
            return res.status(400).json({ success: false, message: 'Adding this dependency would create a circular dependency' })
        }

        const dep = await prisma.taskDependency.create({
            data: { blockingTaskId, blockedTaskId: taskId },
            include: {
                blockingTask: {
                    select: {
                        id: true, title: true, status: true, priority: true,
                        project: { select: { id: true, name: true, color: true } },
                        assignee: { select: { id: true, name: true, avatarUrl: true } }
                    }
                }
            }
        })

        return res.status(201).json({ success: true, data: { depId: dep.id, ...dep.blockingTask } })
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'This dependency already exists' })
        next(err)
    }
}

// ── DELETE /tasks/:taskId/dependencies/:depId ─────────────────────────────────
const removeDependency = async (req, res, next) => {
    try {
        const { depId } = req.params
        await prisma.taskDependency.delete({ where: { id: depId } })
        return res.json({ success: true })
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Dependency not found' })
        next(err)
    }
}

// ── BFS cycle detection ────────────────────────────────────────────────────────
// Returns true if `targetId` can be reached by following BLOCKING chain from `startId`
async function detectCycle(startId, targetId) {
    const visited = new Set()
    const queue = [startId]
    while (queue.length > 0) {
        const current = queue.shift()
        if (current === targetId) return true
        if (visited.has(current)) continue
        visited.add(current)
        // Find everything that blocks `current`
        const deps = await prisma.taskDependency.findMany({
            where: { blockedTaskId: current },
            select: { blockingTaskId: true }
        })
        deps.forEach(d => queue.push(d.blockingTaskId))
    }
    return false
}

export { getDependencies, addDependency, removeDependency }
