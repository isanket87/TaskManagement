const prisma = require('../utils/prisma');
const { successResponse } = require('../utils/helpers');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma.notification.count({
                where: { userId, read: false },
            }),
        ]);
        return successResponse(res, { notifications, unreadCount });
    } catch (err) {
        next(err);
    }
};

const markRead = async (req, res, next) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true },
        });
        return successResponse(res, null, 'Marked as read');
    } catch (err) {
        next(err);
    }
};

const markAllRead = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true },
        });
        return successResponse(res, null, 'All marked as read');
    } catch (err) {
        next(err);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        await prisma.notification.delete({ where: { id: req.params.id } });
        return successResponse(res, null, 'Notification deleted');
    } catch (err) {
        next(err);
    }
};

module.exports = { getNotifications, markRead, markAllRead, deleteNotification };
