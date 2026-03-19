import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { notificationService } from '../../services/notificationService';
import { useSocket } from '../../hooks/useSocket';

const NotificationInitializer = () => {
    const { isAuthenticated, user } = useAuthStore();
    const { setNotifications, addNotification } = useNotificationStore();
    const socket = useSocket();

    // Fetch notifications on mount/auth
    const { data: notifData } = useQuery({
        queryKey: ['notifications-global'],
        queryFn: async () => {
            const res = await notificationService.getAll();
            const notifications = res.data.data.notifications;
            const unreadCount = res.data.data.unreadCount;
            setNotifications(notifications, unreadCount);
            return notifications;
        },
        enabled: isAuthenticated,
        refetchInterval: 60000, // Refresh every minute as fallback
    });

    // Listen for real-time notifications via Socket
    useEffect(() => {
        if (!socket || !isAuthenticated || !user) return;

        const onNewNotification = (notification) => {
            addNotification(notification);
        };

        socket.on('notification:new', onNewNotification);

        return () => {
            socket.off('notification:new', onNewNotification);
        };
    }, [socket, isAuthenticated, user, addNotification]);

    return null; // Purely functional component
};

export default NotificationInitializer;
