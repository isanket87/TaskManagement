import prisma from '../utils/prisma.js'
import { successResponse, errorResponse } from '../utils/helpers.js'

const getComments = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: { author: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
        })
        return successResponse(res, { comments })
    } catch (err) {
        next(err)
    }
}

const createComment = async (req, res, next) => {
    try {
        const { taskId } = req.params
        const { text } = req.body
        if (!text) return errorResponse(res, 'Text required', 400)

        const comment = await prisma.comment.create({
            data: { text, taskId, authorId: req.user.id },
            include: { author: { select: { id: true, name: true, avatar: true } } }
        })

        const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } })
        const io = req.app.get('io')
        if (io && task) io.to(`project:${task.projectId}`).emit('comment:added', { comment })

        return successResponse(res, { comment }, 'Comment created', 201)
    } catch (err) {
        next(err)
    }
}

const updateComment = async (req, res, next) => {
    try {
        const { commentId } = req.params
        const { text } = req.body
        const comment = await prisma.comment.update({ where: { id: commentId }, data: { text } })
        return successResponse(res, { comment }, 'Comment updated')
    } catch (err) {
        next(err)
    }
}

const deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params
        await prisma.comment.delete({ where: { id: commentId } })
        return successResponse(res, null, 'Comment deleted')
    } catch (err) {
        next(err)
    }
}

export { getComments, createComment, updateComment, deleteComment }
