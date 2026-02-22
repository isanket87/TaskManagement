import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    dueDateSummary: { overdue: 0, dueToday: 0, dueSoon: 0, upcoming: 0 },

    setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        })),

    markRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, state.unreadCount - 1),
        })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        })),

    removeNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),

    setDueDateSummary: (summary) => set({ dueDateSummary: summary }),
}));

export default useNotificationStore;
