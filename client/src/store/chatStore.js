import { create } from 'zustand';

const useChatStore = create((set, get) => ({
    channels: [],
    activeChannelId: null,
    messages: {},        // channelId → Message[]
    unreadCounts: {},    // channelId → number
    typingUsers: {},     // channelId → { userId, userName }[]
    threadMessageId: null,
    onlineUsers: {},     // userId → 'online' | 'away' | 'offline'

    setChannels: (channels) => set({ channels }),
    setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
    setMessages: (channelId, messages) =>
        set(s => ({ messages: { ...s.messages, [channelId]: messages } })),

    appendMessage: (channelId, message) =>
        set(s => ({
            messages: {
                ...s.messages,
                [channelId]: [...(s.messages[channelId] || []), message],
            },
        })),

    prependMessages: (channelId, older) =>
        set(s => ({
            messages: {
                ...s.messages,
                [channelId]: [...older, ...(s.messages[channelId] || [])],
            },
        })),

    updateMessage: (channelId, updated) =>
        set(s => ({
            messages: {
                ...s.messages,
                [channelId]: (s.messages[channelId] || []).map(m =>
                    m.id === updated.id ? { ...m, ...updated } : m
                ),
            },
        })),

    removeMessage: (channelId, messageId) =>
        set(s => ({
            messages: {
                ...s.messages,
                [channelId]: (s.messages[channelId] || []).map(m =>
                    m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m
                ),
            },
        })),

    setUnreadCounts: (counts) => {
        const map = {};
        counts.forEach(c => { map[c.channelId] = c.unread; });
        set({ unreadCounts: map });
    },

    clearUnread: (channelId) =>
        set(s => ({ unreadCounts: { ...s.unreadCounts, [channelId]: 0 } })),

    setTyping: (channelId, userId, userName, isTyping) =>
        set(s => {
            const current = s.typingUsers[channelId] || [];
            const filtered = current.filter(u => u.userId !== userId);
            return {
                typingUsers: {
                    ...s.typingUsers,
                    [channelId]: isTyping ? [...filtered, { userId, userName }] : filtered,
                },
            };
        }),

    setPresence: (userId, status) =>
        set(s => ({ onlineUsers: { ...s.onlineUsers, [userId]: status } })),

    setThreadMessage: (messageId) => set({ threadMessageId: messageId }),
}));

export default useChatStore;
