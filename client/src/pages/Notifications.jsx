import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2, Circle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { notificationService } from '../services/notificationService';
import useNotificationStore from '../store/notificationStore';
import useWorkspaceStore from '../store/workspaceStore';
import toast from 'react-hot-toast';
import { cn } from '../utils/helpers';

// ── Notification type config ──────────────────────────────────────────────────
const NOTIF_CONFIG = {
    due_date: { emoji: '📅', label: 'Due Date', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600' },
    overdue: { emoji: '🔴', label: 'Overdue', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600' },
    comment: { emoji: '💬', label: 'Comment', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600' },
    task_assigned: { emoji: '📌', label: 'Assigned', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600' },
    task_completed: { emoji: '✅', label: 'Completed', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600' },
    invite: { emoji: '✉️', label: 'Invite', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600' },
    mention: { emoji: '🔔', label: 'Mention', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600' },
    default: { emoji: '🔔', label: 'Notification', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500' },
};

// ── Group notifications by date ───────────────────────────────────────────────
const groupByDate = (notifications) => {
    const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
    for (const n of notifications) {
        const d = new Date(n.createdAt);
        if (isToday(d)) groups['Today'].push(n);
        else if (isYesterday(d)) groups['Yesterday'].push(n);
        else if (isThisWeek(d)) groups['This Week'].push(n);
        else groups['Older'].push(n);
    }
    return groups;
};

// ── Single notification card ──────────────────────────────────────────────────
const NotifCard = ({ notif, onMarkRead, onDelete }) => {
    const config = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.default;
    return (
        <div
            className={cn(
                'group flex items-start gap-3.5 p-4 rounded-xl border transition-all',
                notif.read
                    ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                    : 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50'
            )}
            onClick={() => !notif.read && onMarkRead(notif.id)}
        >
            {/* Icon */}
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base', config.bg)}>
                {notif.actorUser
                    ? <Avatar user={notif.actorUser} size="sm" />
                    : <span>{config.emoji}</span>
                }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn('text-sm leading-snug', notif.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium')}>
                    {notif.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', config.bg, config.text)}>
                        {config.label}
                    </span>
                    <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                </div>
            </div>

            {/* Actions — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                {!notif.read && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
                        title="Mark as read"
                        className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500 transition-colors"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Unread dot */}
            {!notif.read && (
                <Circle className="w-2 h-2 fill-indigo-500 text-indigo-500 shrink-0 mt-2" />
            )}
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const Notifications = () => {
    const { notifications, markRead, markAllRead, removeNotification } = useNotificationStore();
    const workspace = useWorkspaceStore(s => s.workspace);

    const { isLoading, data } = useQuery({
        queryKey: ['notifications', workspace?.slug],
        queryFn: () => notificationService.getAll(),
    });

    useEffect(() => {
        if (data?.data?.data) {
            useNotificationStore.getState().setNotifications(
                data.data.data.notifications,
                data.data.data.unreadCount
            );
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

    const unread = notifications.filter(n => !n.read).length;
    const grouped = groupByDate(notifications);

    return (
        <PageWrapper title="Notifications">
            <div className="p-6 max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {unread > 0 ? <><span className="text-indigo-600 font-medium">{unread} unread</span> — click to mark as read</> : '🎉 All caught up!'}
                        </p>
                    </div>
                    {unread > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            isLoading={markAllMutation.isPending}
                            onClick={() => markAllMutation.mutate()}
                        >
                            <CheckCheck className="w-4 h-4" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!isLoading && notifications.length === 0 && (
                    <EmptyState
                        icon={Bell}
                        title="No notifications"
                        description="You're all caught up! We'll notify you when something needs your attention."
                    />
                )}

                {/* Grouped list */}
                {!isLoading && notifications.length > 0 && (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([label, items]) => {
                            if (!items.length) return null;
                            return (
                                <div key={label}>
                                    {/* Group header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                            {label}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                                        <span className="text-xs text-gray-400">{items.length}</span>
                                    </div>

                                    {/* Notification cards */}
                                    <div className="space-y-2">
                                        {items.map(notif => (
                                            <NotifCard
                                                key={notif.id}
                                                notif={notif}
                                                onMarkRead={(id) => markReadMutation.mutate(id)}
                                                onDelete={(id) => deleteMutation.mutate(id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};

export default Notifications;
