// Tracks userId -> { lastSeen: Date }
const presence = new Map();

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;   // 5 min
const AWAY_THRESHOLD_MS = 30 * 60 * 1000;    // 30 min

const presenceService = {
    setOnline(userId) {
        presence.set(userId, { lastSeen: new Date() });
    },

    getStatus(userId) {
        const entry = presence.get(userId);
        if (!entry) return 'offline';
        const elapsed = Date.now() - entry.lastSeen.getTime();
        if (elapsed < ONLINE_THRESHOLD_MS) return 'online';
        if (elapsed < AWAY_THRESHOLD_MS) return 'away';
        return 'offline';
    },

    getOnlineUsers() {
        const result = {};
        for (const [userId, { lastSeen }] of presence) {
            const elapsed = Date.now() - lastSeen.getTime();
            if (elapsed < AWAY_THRESHOLD_MS) {
                result[userId] = elapsed < ONLINE_THRESHOLD_MS ? 'online' : 'away';
            }
        }
        return result;
    },

    startOfflineTimer(userId, callback) {
        // Give 30s grace period (reconnects shouldn't show as offline)
        setTimeout(() => {
            const status = this.getStatus(userId);
            if (status === 'offline') callback();
        }, 30000);
    },
};

module.exports = presenceService;
