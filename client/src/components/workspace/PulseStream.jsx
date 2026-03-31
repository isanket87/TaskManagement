import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Activity, X, Maximize2, Minimize2, CheckCircle2, MessageSquare, PlusCircle, MoveRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import useWorkspaceStore from '../../store/workspaceStore';
import { workspaceService } from '../../services/workspaceService';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';

export default function PulseStream() {
    const { workspace } = useWorkspaceStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasNew, setHasNew] = useState(false);
    const [lastViewedAt, setLastViewedAt] = useState(Date.now());

    // Only run if we have an active workspace
    const { data: activities = [], refetch } = useQuery({
        queryKey: ['workspace-pulse', workspace?.slug],
        queryFn: async () => {
            const res = await workspaceService.getActivities(workspace?.slug);
            return res.data.data.activities || [];
        },
        enabled: !!workspace?.slug,
        refetchInterval: 15000, // Poll every 15 seconds
    });

    useEffect(() => {
        if (activities.length > 0) {
            const latestTimestamp = new Date(activities[0].createdAt).getTime();
            if (latestTimestamp > lastViewedAt && !isExpanded) {
                setHasNew(true);
            }
        }
    }, [activities, lastViewedAt, isExpanded]);

    if (!workspace) return null;

    const toggleExpand = () => {
        if (!isExpanded) {
            setHasNew(false);
            setLastViewedAt(Date.now());
        }
        setIsExpanded(!isExpanded);
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'create_task': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
            case 'complete_task': return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
            case 'comment_task': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'move_task': return <MoveRight className="w-4 h-4 text-amber-500" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="fixed bottom-6 right-28 z-[60] flex flex-col items-end pointer-events-none">
            
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl w-80 md:w-96 mb-4 flex flex-col overflow-hidden"
                        style={{ maxHeight: 'calc(100vh - 120px)' }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Live Pulse</span>
                            </div>
                            <button
                                onClick={toggleExpand}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                            {activities.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No recent activity.</p>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {activities.map((activity, idx) => (
                                        <motion.div
                                            key={activity.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            layout
                                            className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3"
                                        >
                                            <div className="mt-1 flex-shrink-0 relative">
                                                <Avatar user={activity.user} size="sm" />
                                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-[2px]">
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {activity.user.name}
                                                    </span>{' '}
                                                    {activity.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[11px] text-slate-400">
                                                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                                    </span>
                                                    {activity.project && (
                                                        <>
                                                            <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                                            <span className="text-[11px] font-medium" style={{ color: activity.project.color }}>
                                                                {activity.project.name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Float Badge Trigger */}
            <motion.button
                layout
                onClick={toggleExpand}
                className={cn(
                    "pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full shadow-lg backdrop-blur-xl transition-all border",
                    isExpanded
                        ? "bg-slate-800 text-white border-slate-700 dark:bg-slate-800 dark:border-slate-700"
                        : "bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:shadow-xl"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className="relative flex items-center justify-center">
                    {hasNew && !isExpanded && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                    )}
                    <Activity className={cn("w-5 h-5", hasNew ? "text-indigo-500" : "")} />
                </div>
                {!isExpanded && <span className="font-semibold text-sm">Pulse</span>}
            </motion.button>
        </div>
    );
}
