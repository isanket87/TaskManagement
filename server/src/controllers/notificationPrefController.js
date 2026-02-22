const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/notification-preferences
const getPrefs = async (req, res, next) => {
    try {
        let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user.id } });
        if (!prefs) {
            prefs = await prisma.notificationPreference.create({ data: { userId: req.user.id } });
        }
        return successResponse(res, { prefs });
    } catch (err) { next(err); }
};

// PUT /api/notification-preferences
const updatePrefs = async (req, res, next) => {
    try {
        const data = req.body;
        // Whitelist allowed fields
        const allowed = [
            'emailEnabled', 'slackEnabled', 'slackWebhookUrl', 'slackUserId',
            'digestEnabled', 'digestFrequency', 'taskAssigned', 'taskDueSoon',
            'taskOverdue', 'commentAdded', 'mentionedInChat', 'projectUpdates',
        ];
        const clean = {};
        for (const key of allowed) {
            if (data[key] !== undefined) clean[key] = data[key];
        }

        const prefs = await prisma.notificationPreference.upsert({
            where: { userId: req.user.id },
            update: clean,
            create: { userId: req.user.id, ...clean },
        });
        return successResponse(res, { prefs }, 'Preferences updated');
    } catch (err) { next(err); }
};

// POST /api/notification-preferences/test-slack
const testSlack = async (req, res, next) => {
    try {
        const { slackWebhookUrl } = req.body;
        if (!slackWebhookUrl) return errorResponse(res, 'Webhook URL required', 400);

        const { IncomingWebhook } = require('@slack/webhook');
        const webhook = new IncomingWebhook(slackWebhookUrl);
        await webhook.send({
            blocks: [{
                type: 'section',
                text: { type: 'mrkdwn', text: '✅ *TaskFlow Slack Integration Test*\nYour webhook is configured correctly!' },
            }],
        });

        return successResponse(res, null, 'Test message sent');
    } catch (err) {
        return errorResponse(res, `Slack test failed: ${err.message}`, 400);
    }
};

// POST /api/notification-preferences/test-email
const testEmail = async (req, res, next) => {
    try {
        const { emailService } = require('../services/emailService');
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true } });
        await emailService.sendRaw({
            to: user.email,
            subject: 'TaskFlow Email Test ✅',
            html: `<p>Hi ${user.name},</p><p>Your email notifications are working correctly!</p>`,
        });
        return successResponse(res, null, 'Test email sent');
    } catch (err) {
        return errorResponse(res, `Email test failed: ${err.message}`, 400);
    }
};

module.exports = { getPrefs, updatePrefs, testSlack, testEmail };
