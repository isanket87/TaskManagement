import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { notificationService } from '../services/notificationService';
import useNotificationStore from '../store/notificationStore';
import useWorkspaceStore from '../store/workspaceStore';
import toast from 'react-hot-toast';
import { cn } from '../utils/helpers';

const NOTIF_ICONS = {
    due_date: '📅',
    overdue: '🔴',
    comment: '💬',
    task_assigned: '📌',
    task_completed: '✅',
    default: '🔔',
};

const Notifications = () => {
    const { notifications, markRead, markAllRead, removeNotification } = useNotificationStore();
    const queryClient = useQueryClient();
    const workspace = useWorkspaceStore(s => s.workspace);

    const { isLoading, data } = useQuery({
        queryKey: ['notifications', workspace?.slug],
        queryFn: () => notificationService.getAll(),
    });

    useEffect(() => {
        if (data?.data?.data) {
            useNotificationStore.getState().setNotifications(data.data.data.notifications, data.data.data.unreadCount);
        }
    }, [data]);

    const markReadMutation = useMutation({
        mutationFn: (id) => notificationService.markRead(id),
        onSuccess: (_, id) => markRead(id),
    });

    const markAllMutation = useMutation({
        mutationFn: () => notificationService.markAllRead(),
        onSuccess: () => { markAllRead(); toast.success('All marked as read'); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => notificationService.delete(id),
        onSuccess: (_, id) => removeNotification(id),
    });

    const unread = notifications.filter((n) => !n.read).length;

    return (
        <PageWrapper title="Notifications">
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-gray-500">{unread > 0 ? `${unread} unread` : 'All caught up!'}</p>
                    {unread > 0 && (
                        <Button variant="secondary" size="sm" isLoading={markAllMutation.isPending} onClick={() => markAllMutation.mutate()}>
                            <CheckCheck className="w-4 h-4" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-gray-100 dark:bg-gray-800" />)}</div>
                ) : notifications.length === 0 ? (
                    <EmptyState icon={Bell} title="No notifications" description="You're all caught up! We'll notify you when something needs your attention." />
                ) : (
                    <div className="space-y-1">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={cn('card p-4 flex items-start gap-3 transition-colors', !notif.read && 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800')}
                                onClick={() => !notif.read && markReadMutation.mutate(notif.id)}
                            >
                                <span className="text-xl shrink-0">{NOTIF_ICONS[notif.type] || NOTIF_ICONS.default}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!notif.read && (
                                        <button onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }} className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500" title="Mark as read">
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }} className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {!notif.read && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};

export default Notifications;
