import { IncomingWebhook } from '@slack/webhook'

export const slackService = {
    async send(webhookUrl, blocks) {
        if (!webhookUrl) return
        try {
            const webhook = new IncomingWebhook(webhookUrl)
            await webhook.send({ blocks })
        } catch (err) {
            console.error('[Slack] Send failed:', err.message)
        }
    },

    taskAssigned({ webhookUrl, taskTitle, projectName, priority, dueDate, assignedBy, taskUrl }) {
        const priorityEmoji = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[priority] || '⚪'
        return this.send(webhookUrl, [
            {
                type: 'header',
                text: { type: 'plain_text', text: '🔔 Task Assigned to You' }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${taskTitle}*\nProject: ${projectName}  ${priorityEmoji} ${priority}${dueDate ? `\nDue: ${new Date(dueDate).toLocaleDateString()}` : ''}\nAssigned by: ${assignedBy}` },
                ...(taskUrl ? { accessory: { type: 'button', text: { type: 'plain_text', text: 'View Task →' }, url: taskUrl } } : {})
            }
        ])
    },

    taskOverdue({ webhookUrl, taskTitle, projectName, dueDate, taskUrl }) {
        return this.send(webhookUrl, [
            {
                type: 'header',
                text: { type: 'plain_text', text: '🔴 Overdue Task Alert' }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${taskTitle}*\nWas due: ${new Date(dueDate).toLocaleDateString()}\nProject: ${projectName}` },
                ...(taskUrl ? { accessory: { type: 'button', text: { type: 'plain_text', text: 'View Task →' }, url: taskUrl } } : {})
            }
        ])
    },

    commentMention({ webhookUrl, authorName, commentText, taskTitle, projectName, taskUrl }) {
        return this.send(webhookUrl, [
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `💬 *${authorName} mentioned you*\n_"${commentText}"_\nTask: *${taskTitle}* · ${projectName}` },
                ...(taskUrl ? { accessory: { type: 'button', text: { type: 'plain_text', text: 'View Comment →' }, url: taskUrl } } : {})
            }
        ])
    },

    dailyDigest({ webhookUrl, overdueCount, dueTodayCount, dueWeekCount, dashboardUrl }) {
        return this.send(webhookUrl, [
            {
                type: 'header',
                text: { type: 'plain_text', text: '📋 Your Daily Summary' }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `🔴 Overdue: *${overdueCount}* tasks\n⏰ Due Today: *${dueTodayCount}* tasks\n📅 Due This Week: *${dueWeekCount}* tasks` },
                ...(dashboardUrl ? { accessory: { type: 'button', text: { type: 'plain_text', text: 'Open Dashboard →' }, url: dashboardUrl } } : {})
            }
        ])
    }
}
