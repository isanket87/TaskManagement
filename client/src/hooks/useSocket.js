import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';
import useNotificationStore from '../store/notificationStore';

let socket = null;

export const useSocket = (projectId = null) => {
    const { user } = useAuthStore();
    const { updateTask, addTask, removeTask } = useTaskStore();
    const { addNotification, setDueDateSummary } = useNotificationStore();

    useEffect(() => {
        if (!user) return;

        if (!socket) {
            const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
            socket = io(socketUrl, { path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'] });
        }

        socket.emit('join:user', user.id);
        if (projectId) socket.emit('join:project', projectId);

        // Task events
        socket.on('task:created', ({ task }) => addTask(task.projectId, task));
        socket.on('task:updated', ({ task }) => updateTask(task.projectId, task));
        socket.on('task:deleted', ({ taskId, projectId: pid }) => removeTask(pid || projectId, taskId));
        socket.on('task:moved', ({ taskId, status, position }) => {
            if (projectId) updateTask(projectId, { id: taskId, status, position });
        });
        socket.on('task:dueDateUpdated', ({ taskId, dueDate, dueDateStatus }) => {
            if (projectId) updateTask(projectId, { id: taskId, dueDate, dueDateStatus });
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
