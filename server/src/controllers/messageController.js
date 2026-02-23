import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'

const MESSAGE_INCLUDE = {
    author: { select: { id: true, name: true, avatar: true } },
    reactions: { include: { user: { select: { id: true, name: true } } } },
    replies: { where: { deletedAt: null }, include: { author: { select: { id: true, name: true, avatar: true } } } },
    mentions: { include: { user: { select: { id: true, name: true } } } }
}

// Verify channel membership
const requireMember = async (channelId, userId) => {
    const member = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId } }
    })
    return !!member
}

// GET /api/channels/:id/messages?cursor=&limit=50
const getMessages = async (req, res, next) => {
    try {
        const { id: channelId } = req.params
        if (!await requireMember(channelId, req.user.id)) return errorResponse(res, 'Access denied', 403)

        const { cursor, limit = 50 } = req.query
        const take = Math.min(parseInt(limit), 100)

        const messages = await prisma.message.findMany({
            where: { channelId, parentId: null, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            include: MESSAGE_INCLUDE
        })

        const ordered = messages.reverse()
        const nextCursor = messages.length === take ? messages[messages.length - 1]?.id : null

        return successResponse(res, { messages: ordered, nextCursor })
    } catch (err) { next(err) }
}

// POST /api/channels/:id/messages
const sendMessage = async (req, res, next) => {
    try {
        const { id: channelId } = req.params
        if (!await requireMember(channelId, req.user.id)) return errorResponse(res, 'Access denied', 403)

        const { content, type = 'text', mentionIds = [] } = req.body
        if (!content?.trim()) return errorResponse(res, 'Content required', 400)

        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                type,
                channelId,
                authorId: req.user.id,
                mentions: mentionIds.length
                    ? { create: mentionIds.map(userId => ({ userId })) }
                    : undefined
            },
            include: MESSAGE_INCLUDE
        })

        return successResponse(res, { message }, 'Message sent', 201)
    } catch (err) { next(err) }
}

// PUT /api/channels/:id/messages/:msgId
const editMessage = async (req, res, next) => {
    try {
        const { msgId } = req.params
        const { content } = req.body

        const msg = await prisma.message.findUnique({ where: { id: msgId } })
        if (!msg) return errorResponse(res, 'Not found', 404)
        if (msg.authorId !== req.user.id) return errorResponse(res, 'Not yours', 403)

        const updated = await prisma.message.update({
            where: { id: msgId },
            data: { content: content.trim(), editedAt: new Date() },
            include: MESSAGE_INCLUDE
        })

        return successResponse(res, { message: updated })
    } catch (err) { next(err) }
}

// DELETE /api/channels/:id/messages/:msgId
const deleteMessage = async (req, res, next) => {
    try {
        const { id: channelId, msgId } = req.params
        const msg = await prisma.message.findUnique({ where: { id: msgId } })
        if (!msg) return errorResponse(res, 'Not found', 404)

        const member = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId, userId: req.user.id } }
        })
        const allowed = msg.authorId === req.user.id || member?.role === 'admin'
        if (!allowed) return errorResponse(res, 'Not allowed', 403)

        await prisma.message.update({ where: { id: msgId }, data: { deletedAt: new Date() } })
        return successResponse(res, null, 'Message deleted')
    } catch (err) { next(err) }
}

// POST /api/channels/:id/messages/:msgId/reactions
const addReaction = async (req, res, next) => {
    try {
        const { msgId } = req.params
        const { emoji } = req.body
        if (!emoji) return errorResponse(res, 'Emoji required', 400)

        const existing = await prisma.reaction.findUnique({
            where: { messageId_userId_emoji: { messageId: msgId, userId: req.user.id, emoji } }
        })
        if (existing) {
            await prisma.reaction.delete({ where: { id: existing.id } })
            return successResponse(res, { action: 'removed' })
        }

        await prisma.reaction.create({ data: { emoji, messageId: msgId, userId: req.user.id } })
        return successResponse(res, { action: 'added' }, 'Reaction added', 201)
    } catch (err) { next(err) }
}

// GET /api/channels/:id/messages/:msgId/thread
const getThread = async (req, res, next) => {
    try {
        const { msgId } = req.params
        const replies = await prisma.message.findMany({
            where: { parentId: msgId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: MESSAGE_INCLUDE
        })
        return successResponse(res, { replies })
    } catch (err) { next(err) }
}

// POST /api/channels/:id/messages/:msgId/thread
const replyToThread = async (req, res, next) => {
    try {
        const { id: channelId, msgId } = req.params
        if (!await requireMember(channelId, req.user.id)) return errorResponse(res, 'Access denied', 403)

        const { content } = req.body
        if (!content?.trim()) return errorResponse(res, 'Content required', 400)

        const reply = await prisma.message.create({
            data: { content: content.trim(), channelId, authorId: req.user.id, parentId: msgId },
            include: MESSAGE_INCLUDE
        })

        return successResponse(res, { message: reply }, 'Reply sent', 201)
    } catch (err) { next(err) }
}

export { getMessages, sendMessage, editMessage, deleteMessage, addReaction, getThread, replyToThread }
