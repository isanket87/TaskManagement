import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
    Clock, CheckCircle2, MessageSquare, UserPlus, 
    ArrowRight, Edit3, Trash2, Tag, Calendar, 
    AlertCircle, Sparkles, Layout, History
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { projectService } from '../../services/projectService';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';
import { Loader2 } from 'lucide-react';

const LABEL_MAP = {
    'in_progress': 'In Progress',
    'in_review': 'In Review',
    'todo': 'To Do',
    'done': 'Done',
    'cancelled': 'Cancelled',
    'urgent': 'Urgent',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
};

const formatActivityMessage = (msg) => {
    if (!msg) return '';
    return msg.replace(/\b(in_progress|in_review|todo|done|cancelled|urgent|high|medium|low)\b/gi,
        (match) => LABEL_MAP[match.toLowerCase()] || match
    );
};

const getActivityIcon = (type, message) => {
    const act = (type || message || '').toLowerCase();
    if (act.includes('created')) return <PlusIcon className="w-4 h-4 text-emerald-500" />;
    if (act.includes('status')) return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    if (act.includes('assigned') || act.includes('member')) return <UserPlus className="w-4 h-4 text-indigo-500" />;
    if (act.includes('comment')) return <MessageSquare className="w-4 h-4 text-amber-500" />;
    if (act.includes('moved')) return <ArrowRight className="w-4 h-4 text-purple-500" />;
    if (act.includes('updated') || act.includes('rename') || act.includes('edit')) return <Edit3 className="w-4 h-4 text-sky-500" />;
    if (act.includes('deleted') || act.includes('remove')) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (act.includes('tag') || act.includes('label')) return <Tag className="w-4 h-4 text-pink-500" />;
    if (act.includes('due')) return <Calendar className="w-4 h-4 text-orange-500" />;
    if (act.includes('ai')) return <Sparkles className="w-4 h-4 text-violet-500" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
};

const PlusIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const ActivityGroup = ({ date, activities }) => (
    <div className="space-y-4">
        <div className="sticky top-0 z-10 py-2 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {isToday(new Date(date)) ? 'Today' : isYesterday(new Date(date)) ? 'Yesterday' : format(new Date(date), 'MMMM d, yyyy')}
            </h3>
        </div>
        <div className="space-y-6 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
            {activities.map((activity, idx) => (
                <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative group"
                >
                    {/* Timeline Dot */}
                    <div className="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm group-hover:border-indigo-400 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-400 transition-colors" />
                    </div>

                    <div className="flex gap-4">
                        <div className="shrink-0 pt-0.5">
                            <Avatar user={activity.user} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {activity.user?.name || 'Someone'}
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                                    {getActivityIcon(activity.type, activity.message)}
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-tight">
                                        {(activity.type || 'Action').replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-400 font-medium ml-auto">
                                    {format(new Date(activity.createdAt), 'h:mm a')}
                                </span>
                            </div>
                            
                            <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:shadow-md group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30 transition-all">
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    {formatActivityMessage(activity.message)}
                                </p>
                                {activity.taskId && (
                                    <div className="mt-2 flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 w-fit">
                                        <Layout className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">View Task</span>
                                    </div>
                                )}
                            </div>
                            <p className="mt-1.5 text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
);

const ProjectActivityView = ({ projectId }) => {
    const { data: activities, isLoading, error } = useQuery({
        queryKey: ['project', projectId, 'activity'],
        queryFn: async () => {
            const res = await projectService.getActivity(projectId);
            return res.data?.data?.activities || [];
        },
        refetchInterval: 30000, // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Scanning history...</p>
            </div>
        );
    }

    if (error || !activities) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Connection Error</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-1">We couldn't retrieve the activity log. Please try refreshing the page.</p>
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-6 text-center">
                <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center rotate-6">
                        <History className="w-12 h-12 text-indigo-500 -rotate-6" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">The project has begun</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2">Activities will appear here as soon as your team starts making moves.</p>
                </div>
            </div>
        );
    }

    // Group activities by date
    const groups = activities.reduce((acc, activity) => {
        const date = activity.createdAt.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(activity);
        return acc;
    }, {});

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    return (
        <div className="max-w-4xl mx-auto w-full px-6 py-8">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Project Activity</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">A real-time record of all project transformations.</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Live Feed</span>
                </div>
            </div>

            <div className="space-y-12">
                {sortedDates.map(date => (
                    <ActivityGroup key={date} date={date} activities={groups[date]} />
                ))}
            </div>
            
            <div className="mt-20 py-10 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Layout className="w-3 h-3" /> 
                    End of recent activity
                </p>
            </div>
        </div>
    );
};

export default ProjectActivityView;
