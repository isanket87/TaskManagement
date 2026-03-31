import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2, Circle, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { notificationService } from '../services/notificationService';
import useNotificationStore from '../store/notificationStore';
import useWorkspaceStore from '../store/workspaceStore';
import toast from 'react-hot-toast';
import { cn } from '../utils/helpers';

// ── Notification type config ──────────────────────────────────────────────────
const NOTIF_CONFIG = {
    due_date: { emoji: '📅', label: 'Due Date', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    overdue: { emoji: '🔴', label: 'Overdue', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-500 dark:text-red-400' },
    comment: { emoji: '💬', label: 'Comment', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
    task_assigned: { emoji: '📌', label: 'Assigned', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
    task_completed: { emoji: '✅', label: 'Completed', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    invite: { emoji: '✉️', label: 'Invite', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
    mention: { emoji: '🔔', label: 'Mention', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    default: { emoji: '🔔', label: 'Notification', bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-500 dark:text-slate-400' },
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
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, paddingBottom: 0, paddingTop: 0, overflow: 'hidden' }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={cn(
                'group relative flex items-start gap-4 p-5 rounded-[20px] border transition-all cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)]',
                notif.read
                    ? 'bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 hover:bg-white/80 dark:hover:bg-slate-900/80 backdrop-blur-md'
                    : 'bg-white/90 dark:bg-slate-800/90 border-indigo-200/80 dark:border-indigo-500/30 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/60 backdrop-blur-xl shrink-0'
            )}
            onClick={() => !notif.read && onMarkRead(notif.id)}
        >
            {/* Soft Ambient Background for unread */}
            {!notif.read && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-[20px] pointer-events-none" />
            )}

            {/* Icon/Avatar */}
            <div className={cn('relative w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-lg border border-white/40 dark:border-white/5 shadow-sm', config.bg)}>
                {notif.actorUser ? (
                    <Avatar user={notif.actorUser} size="md" className="rounded-[14px]" />
                ) : (
                    <span>{config.emoji}</span>
                )}
            </div>

            {/* Unread Indicator Glow Layer (Subtle) */}
            {!notif.read && (
                <div className="absolute left-[-1px] top-4 bottom-4 w-[4px] rounded-r-lg bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn('text-[15px] leading-snug', notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-50 font-semibold')}>
                    {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-2">
                    <span className={cn('text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5', config.bg, config.text)}>
                        {config.label}
                    </span>
                    <span className="text-[12px] font-medium text-slate-400">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 relative z-10">
                {!notif.read && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
                        title="Mark as read"
                        className="p-2 rounded-[12px] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-500 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5"
                    >
                        <Check className="w-4 h-4 stroke-[3px]" />
                    </motion.button>
                )}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                    title="Delete"
                    className="p-2 rounded-[12px] hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5"
                >
                    <Trash2 className="w-4 h-4 stroke-[2px]" />
                </motion.button>
            </div>
        </motion.div>
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
        onSuccess: () => { markAllRead(); toast.success('Cleared the deck!'); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => notificationService.delete(id),
        onSuccess: (_, id) => removeNotification(id),
    });

    const unread = notifications.filter(n => !n.read).length;
    const grouped = groupByDate(notifications);
    const hasNotifications = notifications.length > 0;

    return (
        <PageWrapper title="Notifications">
            {/* Cinematic Background Wrapper */}
            <div className="relative min-h-[calc(100vh-4rem)] p-4 sm:p-8">
                {/* Ambient Blurred Orbs fixed to screen */}
                <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[160px] pointer-events-none -z-0" />
                <div className="fixed bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-[160px] pointer-events-none -z-0" />
                
                {/* Central Content */}
                <div className="relative z-10 max-w-3xl mx-auto pt-6 pb-24">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Active Signals</h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                {unread > 0 ? (
                                    <span className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{unread} unread</span> alerts requiring your attention
                                    </span>
                                ) : (
                                    '🎉 Your inbox is beautifully clear.'
                                )}
                            </p>
                        </div>
                        {unread > 0 && (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="!rounded-[14px] bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform font-bold text-slate-700 dark:text-slate-300"
                                isLoading={markAllMutation.isPending}
                                onClick={() => markAllMutation.mutate()}
                            >
                                <CheckCheck className="w-4 h-4 mr-2 text-indigo-500" />
                                Mark all as read
                            </Button>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 rounded-[20px] bg-slate-200/50 dark:bg-slate-800/50 animate-pulse border border-white/40 dark:border-white/5" />
                            ))}
                        </div>
                    )}

                    {/* Empty State Showcase */}
                    {!isLoading && !hasNotifications && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <motion.div 
                                animate={{ y: [0, -15, 0] }} 
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="w-24 h-24 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center mb-8 relative"
                            >
                                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-indigo-400 delay-1000" style={{ animationDuration: '3s' }} />
                                <Bell className="w-10 h-10 text-indigo-500 stroke-[1.5px]" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No active signals</h3>
                            <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm leading-relaxed">
                                You are completely caught up! We will send an alert your way when the team needs your expertise.
                            </p>
                        </motion.div>
                    )}

                    {/* Grouped List Frame */}
                    {!isLoading && hasNotifications && (
                        <div className="space-y-10">
                            {Object.entries(grouped).map(([label, items]) => {
                                if (!items.length) return null;
                                return (
                                    <div key={label}>
                                        {/* Cinematic Group Header */}
                                        <div className="flex items-center gap-4 mb-5">
                                            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                                {label}
                                            </span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800 dark:to-transparent" />
                                            <span className="text-[10px] font-bold text-slate-400 py-1 px-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
                                                {items.length}
                                            </span>
                                        </div>

                                        {/* Animated Cards Container */}
                                        <motion.div layout className="space-y-3">
                                            <AnimatePresence initial={false}>
                                                {items.map(notif => (
                                                    <NotifCard
                                                        key={notif.id}
                                                        notif={notif}
                                                        onMarkRead={(id) => markReadMutation.mutate(id)}
                                                        onDelete={(id) => deleteMutation.mutate(id)}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
};

export default Notifications;
