import prisma from '../utils/prisma.js'

export const logTaskActivity = async ({ projectId, taskId, userId, type, message, metadata = {} }) => {
    try {
        await prisma.activityLog.create({
            data: {
                projectId,
                taskId,
                userId,
                type,
                message,
                metadata
            }
        })
    } catch (error) {
        console.error('Error logging task activity:', error)
    }
}
