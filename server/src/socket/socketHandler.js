const presenceService = require('../services/presenceService');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        let currentUserId = null;

        // Join user-specific room
        socket.on('join:user', (userId) => {
            currentUserId = userId;
            socket.join(`user:${userId}`);
            presenceService.setOnline(userId);
            io.emit('presence:update', { userId, status: 'online' });
        });

        // Join project room
        socket.on('join:project', (projectId) => {
            socket.join(`project:${projectId}`);
        });

        // Leave project room
        socket.on('leave:project', (projectId) => {
            socket.leave(`project:${projectId}`);
        });

        // ─── Chat Rooms ───────────────────────────────────────────
        socket.on('join:channel', (channelId) => {
            socket.join(`channel:${channelId}`);
        });

        socket.on('leave:channel', (channelId) => {
            socket.leave(`channel:${channelId}`);
        });

        // ─── Typing Indicators ────────────────────────────────────
        socket.on('typing:start', ({ channelId, userId, userName }) => {
            socket.to(`channel:${channelId}`).emit('typing:start', { userId, userName, channelId });
        });

        socket.on('typing:stop', ({ channelId, userId }) => {
            socket.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId });
        });

        // ─── Message Events (broadcast after REST API creates them) ─
        socket.on('message:broadcast', ({ channelId, message }) => {
            socket.to(`channel:${channelId}`).emit('message:new', { message, channelId });
        });

        socket.on('message:updated:broadcast', ({ channelId, message }) => {
            socket.to(`channel:${channelId}`).emit('message:updated', { message });
        });

        socket.on('message:deleted:broadcast', ({ channelId, messageId }) => {
            socket.to(`channel:${channelId}`).emit('message:deleted', { messageId });
        });

        socket.on('message:reaction:broadcast', ({ channelId, messageId, emoji, userId, action }) => {
            socket.to(`channel:${channelId}`).emit('message:reaction', { messageId, emoji, userId, action });
        });

        // ─── Presence heartbeat ───────────────────────────────────
        socket.on('presence:heartbeat', (userId) => {
            presenceService.setOnline(userId);
        });

        // ─── Timer events ─────────────────────────────────────────
        socket.on('timer:broadcast', ({ userId, timeEntry, action }) => {
            socket.to(`user:${userId}`).emit(`timer:${action}`, { timeEntry });
        });

        // ─── Disconnect ───────────────────────────────────────────
        socket.on('disconnect', () => {
            if (currentUserId) {
                presenceService.startOfflineTimer(currentUserId, () => {
                    io.emit('presence:update', { userId: currentUserId, status: 'offline' });
                });
            }
        });
    });
};

module.exports = socketHandler;
