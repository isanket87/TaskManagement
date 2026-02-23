import prisma from '../utils/prisma.js'
import { emailService } from './emailService.js'
import { slackService } from './slackService.js'

let io
export const setSocketIO = (socketIO) => { io = socketIO }

const buildTaskUrl = (taskId) => `${process.env.CLIENT_URL || 'http://localhost:5173'}/tasks/${taskId}`
const buildDashboardUrl = () => `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`

const getPrefs = async (userId) => {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId } })
    if (!prefs) prefs = await prisma.notificationPreference.create({ data: { userId } })
    return prefs
}

/**
 * Creates an in-app notification and emits via socket.
 */
export const createNotification = async ({ userId, type, message, link, taskId, projectId, projectName, taskTitle }) => {
    try {
        const notification = await prisma.notification.create({
            data: { userId, type, message, link, taskId, projectId, projectName, taskTitle }
        })
        if (io) {
            io.to(`user:${userId}`).emit('notification:new', { notification })
        }
        return notification
    } catch (err) {
        console.error('[NotificationService] Error creating notification:', err)
    }
}

/**
 * Task assigned — in-app + email + Slack
 */
export const notifyTaskAssigned = async ({ task, assignee, assignedBy, project }) => {
    await createNotification({
        userId: assignee.id,
        type: 'task_assigned',
        message: `${assignedBy.name} assigned you "${task.title}"`,
        link: buildTaskUrl(task.id),
        taskId: task.id,
        projectId: project.id,
        projectName: project.name,
        taskTitle: task.title
    })

    const prefs = await getPrefs(assignee.id)
    const payload = { taskTitle: task.title, projectName: project.name, priority: task.priority, dueDate: task.dueDate, assignedBy: assignedBy.name, taskUrl: buildTaskUrl(task.id) }

    if (prefs.emailEnabled && prefs.taskAssigned) {
        emailService.sendTaskAssigned({ to: assignee.email, userName: assignee.name, ...payload }).catch(console.error)
    }
    if (prefs.slackEnabled && prefs.taskAssigned && prefs.slackWebhookUrl) {
        slackService.taskAssigned({ webhookUrl: prefs.slackWebhookUrl, ...payload }).catch(console.error)
    }
}

/**
 * Task overdue — in-app + email + Slack
 */
export const notifyTaskOverdue = async ({ task, assignee, project }) => {
    await createNotification({
        userId: assignee.id,
        type: 'task_overdue',
        message: `Task "${task.title}" is overdue`,
        link: buildTaskUrl(task.id),
        taskId: task.id,
        projectId: project.id,
        projectName: project.name,
        taskTitle: task.title
    })

    const prefs = await getPrefs(assignee.id)
    const payload = { taskTitle: task.title, projectName: project.name, dueDate: task.dueDate, taskUrl: buildTaskUrl(task.id) }

    if (prefs.emailEnabled && prefs.taskOverdue) {
        emailService.sendTaskOverdue({ to: assignee.email, userName: assignee.name, ...payload }).catch(console.error)
    }
    if (prefs.slackEnabled && prefs.taskOverdue && prefs.slackWebhookUrl) {
        slackService.taskOverdue({ webhookUrl: prefs.slackWebhookUrl, ...payload }).catch(console.error)
    }
}

/**
 * Task due soon — in-app + email
 */
export const notifyTaskDueSoon = async ({ task, assignee, project }) => {
    await createNotification({
        userId: assignee.id,
        type: 'task_due_soon',
        message: `Task "${task.title}" is due tomorrow`,
        link: buildTaskUrl(task.id),
        taskId: task.id,
        projectId: project.id,
        projectName: project.name,
        taskTitle: task.title
    })

    const prefs = await getPrefs(assignee.id)
    if (prefs.emailEnabled && prefs.taskDueSoon) {
        const payload = { taskTitle: task.title, projectName: project.name, dueDate: task.dueDate, taskUrl: buildTaskUrl(task.id) }
        emailService.sendTaskDueSoon({ to: assignee.email, userName: assignee.name, ...payload }).catch(console.error)
    }
}

/**
 * Comment mention — in-app + email + Slack
 */
export const notifyCommentMention = async ({ task, project, mention, author, commentText }) => {
    await createNotification({
        userId: mention.id,
        type: 'comment_mention',
        message: `${author.name} mentioned you in "${task.title}"`,
        link: buildTaskUrl(task.id),
        taskId: task.id,
        projectId: project.id,
        projectName: project.name,
        taskTitle: task.title
    })

    const prefs = await getPrefs(mention.id)
    const payload = { authorName: author.name, commentText: commentText.slice(0, 200), taskTitle: task.title, projectName: project.name, taskUrl: buildTaskUrl(task.id) }

    if (prefs.emailEnabled && prefs.commentAdded) {
        emailService.sendCommentMention({ to: mention.email, userName: mention.name, ...payload }).catch(console.error)
    }
    if (prefs.slackEnabled && prefs.commentAdded && prefs.slackWebhookUrl) {
        slackService.commentMention({ webhookUrl: prefs.slackWebhookUrl, ...payload }).catch(console.error)
    }
}

/**
 * Daily digest
 */
export const sendDailyDigestForUser = async ({ user, overdueTasks, dueTodayTasks, dueThisWeekCount }) => {
    const prefs = await getPrefs(user.id)
    if (!prefs.digestEnabled) return

    const dashboardUrl = buildDashboardUrl()
    if (prefs.emailEnabled) {
        emailService.sendDailyDigest({ to: user.email, userName: user.name, overdueTasks, dueTodayTasks, dueThisWeekCount, dashboardUrl }).catch(console.error)
    }
    if (prefs.slackEnabled && prefs.slackWebhookUrl) {
        slackService.dailyDigest({ webhookUrl: prefs.slackWebhookUrl, overdueCount: overdueTasks.length, dueTodayCount: dueTodayTasks.length, dueWeekCount: dueThisWeekCount, dashboardUrl }).catch(console.error)
    }
}

export default {
    createNotification,
    setSocketIO,
    notifyTaskAssigned,
    notifyTaskOverdue,
    notifyTaskDueSoon,
    notifyCommentMention,
    sendDailyDigestForUser
}
