import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

let socket = null;

export const useSocket = (projectId = null) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { addNotification, setDueDateSummary } = useNotificationStore();

    useEffect(() => {
        if (!user) return;

        if (!socket) {
            const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
            socket = io(socketUrl, { path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'] });
        }

        socket.emit('join:user', user.id);
        if (projectId) socket.emit('join:project', projectId);

        const updateTaskCache = (updater) => {
            if (!projectId) return;
            queryClient.setQueriesData({ queryKey: ['tasks', projectId] }, (old) => {
                if (!old?.data?.tasks) return old;
                return { ...old, data: { ...old.data, tasks: updater(old.data.tasks) } };
            });
        };

        // Task events
        socket.on('task:created', ({ task }) => {
            if (task.projectId === projectId) updateTaskCache(tasks => [...tasks, task]);
        });
        socket.on('task:updated', ({ task }) => {
            if (task.projectId === projectId) updateTaskCache(tasks => tasks.map(t => t.id === task.id ? { ...t, ...task } : t));
        });
        socket.on('task:deleted', ({ taskId }) => {
            updateTaskCache(tasks => tasks.filter(t => t.id !== taskId));
        });
        socket.on('task:moved', ({ taskId, status, position }) => {
            updateTaskCache(tasks => tasks.map(t => t.id === taskId ? { ...t, ...(status && { status }), ...(position !== undefined && { position }) } : t));
        });
        socket.on('task:dueDateUpdated', ({ taskId, dueDate, dueDateStatus }) => {
            updateTaskCache(tasks => tasks.map(t => t.id === taskId ? { ...t, dueDate, dueDateStatus } : t));
        });

        // Notification events
        socket.on('notification:new', ({ notification }) => addNotification(notification));
        socket.on('dueDateSummary:updated', (summary) => setDueDateSummary(summary));

        return () => {
            if (projectId) socket.emit('leave:project', projectId);
            socket.off('task:created');
            socket.off('task:updated');
            socket.off('task:deleted');
            socket.off('task:moved');
            socket.off('task:dueDateUpdated');
            socket.off('notification:new');
            socket.off('dueDateSummary:updated');
        };
    }, [user, projectId]);

    return socket;
};

export default useSocket;
