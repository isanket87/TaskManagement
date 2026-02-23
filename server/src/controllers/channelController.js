import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'

// GET /api/channels — all channels for current user
const getChannels = async (req, res, next) => {
    try {
        const memberships = await prisma.channelMember.findMany({
            where: { userId: req.user.id },
            include: {
                channel: {
                    include: {
                        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                        _count: { select: { messages: true } }
                    }
                }
            }
        })

        const channels = memberships.map(m => ({
            ...m.channel,
            lastReadAt: m.lastReadAt,
            memberRole: m.role
        }))

        return successResponse(res, { channels })
    } catch (err) { next(err) }
}

// POST /api/channels
const createChannel = async (req, res, next) => {
    try {
        const { name, description, type = 'general', memberIds = [], projectId } = req.body
        if (!name) return errorResponse(res, 'Channel name is required', 400)

        const channel = await prisma.channel.create({
            data: {
                name,
                description,
                type,
                projectId: projectId || null,
                createdById: req.user.id,
                members: {
                    create: [
                        { userId: req.user.id, role: 'admin' },
                        ...memberIds.filter(id => id !== req.user.id).map(userId => ({ userId, role: 'member' }))
                    ]
                }
            },
            include: { members: { include: { user: { select: { id: true, name: true, avatar: true } } } } }
        })

        return successResponse(res, { channel }, 'Channel created', 201)
    } catch (err) { next(err) }
}

// GET /api/channels/:id
const getChannel = async (req, res, next) => {
    try {
        const { id } = req.params
        const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: req.user.id } } })
        if (!member) return errorResponse(res, 'Access denied', 403)

        const channel = await prisma.channel.findUnique({
            where: { id },
            include: { members: { include: { user: { select: { id: true, name: true, avatar: true } } } } }
        })
        if (!channel) return errorResponse(res, 'Channel not found', 404)

        return successResponse(res, { channel })
    } catch (err) { next(err) }
}

// PUT /api/channels/:id
const updateChannel = async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, description } = req.body
        const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: req.user.id } } })
        if (!member || member.role !== 'admin') return errorResponse(res, 'Admin only', 403)

        const channel = await prisma.channel.update({ where: { id }, data: { name, description } })
        return successResponse(res, { channel })
    } catch (err) { next(err) }
}

// DELETE /api/channels/:id
const deleteChannel = async (req, res, next) => {
    try {
        const { id } = req.params
        const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: req.user.id } } })
        if (!member || member.role !== 'admin') return errorResponse(res, 'Admin only', 403)

        await prisma.channel.delete({ where: { id } })
        return successResponse(res, null, 'Channel deleted')
    } catch (err) { next(err) }
}

// POST /api/channels/:id/members
const addMember = async (req, res, next) => {
    try {
        const { id } = req.params
        const { userId, role = 'member' } = req.body
        const existing = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId } } })
        if (existing) return errorResponse(res, 'Already a member', 409)

        await prisma.channelMember.create({ data: { channelId: id, userId, role } })
        return successResponse(res, null, 'Member added')
    } catch (err) { next(err) }
}

// DELETE /api/channels/:id/members/:userId
const removeMember = async (req, res, next) => {
    try {
        const { id, userId } = req.params
        const me = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: req.user.id } } })
        if (!me || (me.role !== 'admin' && req.user.id !== userId)) return errorResponse(res, 'Not allowed', 403)

        await prisma.channelMember.delete({ where: { channelId_userId: { channelId: id, userId } } })
        return successResponse(res, null, 'Member removed')
    } catch (err) { next(err) }
}

// PATCH /api/channels/:id/read
const markRead = async (req, res, next) => {
    try {
        const { id } = req.params
        await prisma.channelMember.update({
            where: { channelId_userId: { channelId: id, userId: req.user.id } },
            data: { lastReadAt: new Date() }
        })
        return successResponse(res, null, 'Marked as read')
    } catch (err) { next(err) }
}

// GET /api/direct-messages/:userId — get or create DM between current user and target
const getOrCreateDM = async (req, res, next) => {
    try {
        const { userId: targetId } = req.params
        const myId = req.user.id

        // Find existing DM
        const existing = await prisma.channel.findFirst({
            where: {
                type: 'direct',
                members: { every: { userId: { in: [myId, targetId] } } },
                AND: [
                    { members: { some: { userId: myId } } },
                    { members: { some: { userId: targetId } } }
                ]
            },
            include: { members: { include: { user: { select: { id: true, name: true, avatar: true } } } } }
        })
        if (existing) return successResponse(res, { channel: existing })

        const target = await prisma.user.findUnique({ where: { id: targetId }, select: { name: true } })
        const me = await prisma.user.findUnique({ where: { id: myId }, select: { name: true } })

        const channel = await prisma.channel.create({
            data: {
                name: `${me.name} & ${target.name}`,
                type: 'direct',
                createdById: myId,
                members: { create: [{ userId: myId, role: 'admin' }, { userId: targetId, role: 'admin' }] }
            },
            include: { members: { include: { user: { select: { id: true, name: true, avatar: true } } } } }
        })

        return successResponse(res, { channel }, 'DM created', 201)
    } catch (err) { next(err) }
}

// GET /api/channels/unread-counts
const getUnreadCounts = async (req, res, next) => {
    try {
        const memberships = await prisma.channelMember.findMany({
            where: { userId: req.user.id },
            select: { channelId: true, lastReadAt: true }
        })

        const counts = await Promise.all(memberships.map(async m => {
            const count = await prisma.message.count({
                where: { channelId: m.channelId, createdAt: { gt: m.lastReadAt }, deletedAt: null, authorId: { not: req.user.id } }
            })
            return { channelId: m.channelId, unread: count }
        }))

        return successResponse(res, { counts })
    } catch (err) { next(err) }
}

export { getChannels, createChannel, getChannel, updateChannel, deleteChannel, addMember, removeMember, markRead, getOrCreateDM, getUnreadCounts }
