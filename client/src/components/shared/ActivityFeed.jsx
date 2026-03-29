import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, MessageSquare, CheckCircle2, Circle, ArrowRight,
    Flag, User, Calendar, Tag, AlignLeft, Clock, RefreshCw,
    Link2, Trash2, Copy, Plus, ChevronDown, ChevronUp, History
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';

// ── Humanize raw enum values embedded in backend messages ────────────────────
const LABEL_MAP = {
    // Status
    'in_progress':  'In Progress',
    'in_review':    'In Review',
    'todo':         'To Do',
    'done':         'Done',
    'cancelled':    'Cancelled',
    // Priority
    'urgent':       'Urgent',
    'high':         'High',
    'medium':       'Medium',
    'low':          'Low',
};

/** Replace any raw enum tokens in a message string with pretty labels. */
const formatMessage = (msg) => {
    if (!msg) return '';
    return msg.replace(/\b(in_progress|in_review|todo|done|cancelled|urgent|high|medium|low)\b/gi,
        (match) => LABEL_MAP[match.toLowerCase()] || match
    );
};

// ── Icon & color mapping per activity type ──────────────────────────────────
const getActivityMeta = (activity) => {
    const type = (activity?.type || '').toLowerCase();
    const field = (activity?.metadata?.field || activity?.field || '').toLowerCase();
    const message = (activity?.message || '').toLowerCase();

    // Helper: check if any of the given keywords appear in type, field, or message
    const matches = (...keywords) =>
        keywords.some(k => type.includes(k) || field.includes(k) || message.includes(k));

    if (matches('comment')) return {
        icon: MessageSquare,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
    };
    if (matches('created task', 'task_created', 'created "', "created this")) return {
        icon: Plus,
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
    };
    if (matches('deleted', 'removed task')) return {
        icon: Trash2,
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-500',
    };
    if (matches('duplicat')) return {
        icon: Copy,
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-500',
    };
    if (matches('status')) return {
        icon: CheckCircle2,
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        iconColor: 'text-indigo-500',
    };
    if (matches('priority')) return {
        icon: Flag,
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        iconColor: 'text-orange-500',
    };
    if (matches('assignee', 'assigned', 'assign')) return {
        icon: User,
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-500',
    };
    if (matches('due date', 'duedate', 'due_date')) return {
        icon: Calendar,
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
        iconColor: 'text-yellow-600',
    };
    if (matches('description')) return {
        icon: AlignLeft,
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-500',
    };
    if (matches('title', 'renamed', 'name')) return {
        icon: AlignLeft,
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-500',
    };
    if (matches('tag', 'label')) return {
        icon: Tag,
        iconBg: 'bg-pink-100 dark:bg-pink-900/30',
        iconColor: 'text-pink-500',
    };
    if (matches('recurr')) return {
        icon: RefreshCw,
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
        iconColor: 'text-cyan-500',
    };
    if (matches('depend', 'link')) return {
        icon: Link2,
        iconBg: 'bg-teal-100 dark:bg-teal-900/30',
        iconColor: 'text-teal-500',
    };
    // default
    return {
        icon: Activity,
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-400',
    };
};

// Pill for status/priority values
const ValuePill = ({ value, type }) => {
    const statusColors = {
        todo: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        in_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    const priorityColors = {
        urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    };
    const map = type === 'status' ? statusColors : type === 'priority' ? priorityColors : {};
    const cls = map[value?.toLowerCase()] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    return (
        <span className={cn('px-1.5 py-0.5 rounded text-[11px] font-semibold capitalize', cls)}>
            {value?.replace(/_/g, ' ') || '—'}
        </span>
    );
};

/**
 * Converts any metadata value into a human-readable string.
 * Handles: null, objects with .name, ISO date strings, plain strings/numbers.
 * Returns null if the value cannot be meaningfully displayed as a pill.
 */
const extractDisplayValue = (val) => {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') {
        // Detect ISO date strings like "2026-03-27T00:00:00.000Z"
        if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
            try {
                return format(new Date(val), 'MMM d, yyyy');
            } catch {
                return val;
            }
        }
        return val;
    }
    if (typeof val === 'object') {
        // User/member object
        if (val.name) return val.name;
        if (val.email) return val.email;
        if (val.title) return val.title;
        if (val.label) return val.label;
        // Can't extract a meaningful display string — skip pill
        return null;
    }
    return String(val);
};

// Single activity/comment row
const ActivityItem = ({ activity, isLast, onRestoreDescription }) => {
    const [expanded, setExpanded] = useState(false);
    const meta = getActivityMeta(activity);
    const Icon = meta.icon;

    const hasDescriptionHistory =
        activity.metadata?.before?.description !== undefined ||
        activity.metadata?.after?.description !== undefined;

    // Only show pills if we can extract readable primitive-like values from before/after
    const beforeDisplay = hasDescriptionHistory ? null : extractDisplayValue(activity.metadata?.before);
    const afterDisplay = hasDescriptionHistory ? null : extractDisplayValue(activity.metadata?.after);
    const hasValueChange =
        !hasDescriptionHistory &&
        activity.metadata?.before !== undefined &&
        activity.metadata?.after !== undefined &&
        beforeDisplay !== null &&
        afterDisplay !== null;

    const relativeTime = activity.createdAt
        ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
        : '';

    const absoluteTime = activity.createdAt
        ? format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')
        : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 group"
        >
            {/* Left: icon + line */}
            <div className="relative flex flex-col items-center shrink-0">
                <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-800 z-10',
                    meta.iconBg
                )}>
                    <Icon className={cn('w-4 h-4', meta.iconColor)} />
                </div>
                {!isLast && (
                    <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700/80 mt-1" />
                )}
            </div>

            {/* Right: content */}
            <div className={cn('flex-1 min-w-0 pb-5', isLast && 'pb-2')}>
                {/* Header row */}
                <div className="flex flex-wrap items-baseline gap-1.5 mb-0.5">
                    {activity.user && (
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {activity.user.name}
                        </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatMessage(activity.message)}
                    </span>
                    <span
                        className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto shrink-0 cursor-default"
                        title={absoluteTime}
                    >
                        {relativeTime}
                    </span>
                </div>

                {/* Value change pills: before → after */}
                {hasValueChange && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <ValuePill
                            value={beforeDisplay}
                            type={activity.metadata?.field || activity.type?.split('_')[0]}
                        />
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <ValuePill
                            value={afterDisplay}
                            type={activity.metadata?.field || activity.type?.split('_')[0]}
                        />
                    </div>
                )}

                {/* Description history expander */}
                {hasDescriptionHistory && (
                    <div className="mt-1.5">
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                        >
                            <History className="w-3 h-3" />
                            {expanded ? 'Hide changes' : 'View changes'}
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 grid grid-cols-2 gap-3 overflow-hidden"
                                >
                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                        <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Before</p>
                                        <div
                                            className="text-xs text-slate-500 line-through prose prose-slate dark:prose-invert max-w-none max-h-[120px] overflow-y-auto"
                                            dangerouslySetInnerHTML={{ __html: activity.metadata?.before?.description || '<em>empty</em>' }}
                                        />
                                    </div>
                                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase">After</p>
                                            {onRestoreDescription && (
                                                <button
                                                    onClick={() => onRestoreDescription(activity.metadata?.before?.description)}
                                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                                                >
                                                    Restore previous
                                                </button>
                                            )}
                                        </div>
                                        <div
                                            className="text-xs text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none max-h-[120px] overflow-y-auto"
                                            dangerouslySetInnerHTML={{ __html: activity.metadata?.after?.description || '<em>empty</em>' }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Skeleton loader
const ActivitySkeleton = () => (
    <div className="space-y-5 animate-pulse">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="flex gap-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-40" />
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                </div>
            </div>
        ))}
    </div>
);

/**
 * ActivityFeed
 *
 * Props:
 *  - activities: array
 *  - isLoading: bool
 *  - onRestoreDescription: (desc: string) => void
 */
const ActivityFeed = ({ activities = [], isLoading = false, onRestoreDescription }) => {
    const [showAll, setShowAll] = useState(false);
    const INITIAL_COUNT = 10;
    const displayed = showAll ? activities : activities.slice(0, INITIAL_COUNT);

    if (isLoading) {
        return (
            <div className="p-2">
                <ActivitySkeleton />
            </div>
        );
    }

    if (!activities.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shadow-inner">
                    <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No activity yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[180px] mx-auto">
                        Changes to this task will be recorded here automatically.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {displayed.map((activity, index) => (
                <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === displayed.length - 1 && (showAll || activities.length <= INITIAL_COUNT)}
                    onRestoreDescription={onRestoreDescription}
                />
            ))}

            {activities.length > INITIAL_COUNT && (
                <div className="pt-2">
                    <button
                        onClick={() => setShowAll(s => !s)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-100 dark:border-slate-800"
                    >
                        {showAll ? (
                            <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                        ) : (
                            <><ChevronDown className="w-3.5 h-3.5" /> Show {activities.length - INITIAL_COUNT} more</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityFeed;
