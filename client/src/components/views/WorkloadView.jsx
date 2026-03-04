import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, AlertTriangle, CheckCircle, Minus, GripVertical, ArrowRight } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { taskService } from '../../services/taskService';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#6b7280' };
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };

// ── AI Insight Card ────────────────────────────────────────────────
const AiInsightCard = ({ overloaded, light, onAutoRebalance, onDismiss }) => (
    <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative rounded-2xl p-5 mb-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #111318 0%, #1e2128 100%)' }}
    >
        <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#C4714A' }}>
                <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: '#D4896A', letterSpacing: '0.12em' }}>
                    ✦ AI Workload Insight
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    <strong className="text-white">{overloaded.user.name}</strong> has{' '}
                    <strong className="text-white">{overloaded.active} active tasks</strong> —{' '}
                    {Math.round((overloaded.active / overloaded.avgActive - 1) * 100)}% above team average.{' '}
                    <strong className="text-white">{light.user.name}</strong> has capacity with only{' '}
                    <strong className="text-white">{light.active}</strong> active tasks.
                </p>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={onAutoRebalance}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: '#C4714A' }}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Auto-rebalance
                    </button>
                    <button
                        onClick={onDismiss}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
            <button onClick={onDismiss} className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5">
                <X className="w-4 h-4" />
            </button>
        </div>
    </motion.div>
);

// ── Workload Bar ───────────────────────────────────────────────────
const WorkloadBar = ({ pct, color }) => (
    <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
        <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
    </div>
);

// ── Task Pill ──────────────────────────────────────────────────────
const TaskPill = ({ task, onDragStart, onDragEnd }) => (
    <div
        draggable
        onDragStart={(e) => {
            e.dataTransfer.setData('taskId', task.id);
            e.dataTransfer.setData('fromMemberId', task.assignee?.id || '');
            e.currentTarget.style.opacity = '0.4';
            onDragStart?.();
        }}
        onDragEnd={(e) => {
            e.currentTarget.style.opacity = '1';
            onDragEnd?.();
        }}
        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none
            bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700
            hover:border-orange-300 hover:bg-orange-50 dark:hover:border-orange-700 dark:hover:bg-orange-900/20
            hover:-translate-y-0.5 hover:shadow-sm"
    >
        <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#6b7280' }}
        />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
            {task.title}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
            {STATUS_LABELS[task.status] || task.status}
        </span>
    </div>
);

// ── Member Row ─────────────────────────────────────────────────────
const MemberRow = ({ member, activeTasks, doneCount, totalCount, pct, loadStatus, color, onDrop, projectId, dimmed = false, focused = false, onFocusClick }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData('taskId');
        const fromMemberId = e.dataTransfer.getData('fromMemberId');
        if (taskId && fromMemberId !== member.user.id) {
            onDrop(taskId, member.user.id, member.user.name);
        }
    };

    const AlertBadge = () => {
        if (loadStatus === 'heavy') return (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: '#FDEAEA', color: '#C73B3B', borderColor: '#F0C0C0' }}>
                <AlertTriangle className="w-3 h-3" /> Overloaded
            </span>
        );
        if (loadStatus === 'light') return (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: '#FDF6E3', color: '#B8922A', borderColor: '#E8D5A0' }}>
                <Minus className="w-3 h-3" /> Has capacity
            </span>
        );
        return (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: '#EBF5EE', color: '#4A8C5C', borderColor: '#C0DEC8' }}>
                <CheckCircle className="w-3 h-3" /> Balanced
            </span>
        );
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "bg-white dark:bg-slate-800/60 border rounded-2xl p-5 transition-all duration-200",
                isDragOver
                    ? "border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md shadow-orange-100 dark:shadow-orange-900/20"
                    : focused
                        ? "border-orange-300 dark:border-orange-700 ring-2 ring-orange-100 dark:ring-orange-900/40"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm",
                dimmed && "opacity-30 scale-[0.99] saturate-50"
            )}
        >
            {/* Member header */}
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onFocusClick} title={`Focus: ${member.user.name}`} className="shrink-0">
                    <Avatar user={member.user} size="md" className={cn(
                        'ring-2 shadow-sm transition-all',
                        focused ? 'ring-orange-400 scale-110' : 'ring-white dark:ring-slate-800 hover:ring-orange-300'
                    )} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {member.user.name}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                        {member.role}
                    </div>
                </div>
                <div className="flex items-center gap-4 mr-2">
                    <div className="text-center">
                        <div className="text-xl font-bold leading-none" style={{ color }}>
                            {activeTasks.length}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                            Active
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold leading-none text-green-600 dark:text-green-400">
                            {doneCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                            Done
                        </div>
                    </div>
                </div>
                <AlertBadge />
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Workload
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {activeTasks.length} of {totalCount} tasks active
                    </span>
                </div>
                <WorkloadBar pct={pct} color={color} />
            </div>

            {/* Task pills */}
            {activeTasks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {activeTasks.map((task) => (
                        <TaskPill key={task.id} task={task} />
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <span className="text-xs font-medium text-slate-400">No active tasks — drop one here</span>
                </div>
            )}

            {/* Drop hint */}
            {isDragOver && (
                <div className="mt-3 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-xl bg-orange-50/50 dark:bg-orange-900/20">
                    <ArrowRight className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        Assign to {member.user.name}
                    </span>
                </div>
            )}
        </div>
    );
};

// ── Main WorkloadView ──────────────────────────────────────────────
const WorkloadView = ({ tasks = [], members = [], projectId, focusedMemberId = null, onFocusChange }) => {
    const queryClient = useQueryClient();
    const [dismissedInsight, setDismissedInsight] = useState(false);

    const updateAssigneeMutation = useMutation({
        mutationFn: ({ taskId, assigneeId }) =>
            taskService.update(projectId, taskId, { assigneeId }),
        onSuccess: (_, { toName }) => {
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success(`Task reassigned to ${toName}`);
        },
        onError: () => toast.error('Failed to reassign task'),
    });

    const handleDrop = (taskId, toUserId, toName) => {
        updateAssigneeMutation.mutate({ taskId, assigneeId: toUserId, toName });
    };

    // Build per-member workload data
    const memberData = members.map((member) => {
        const memberTasks = tasks.filter((t) => t.assignee?.id === member.user.id);
        const activeTasks = memberTasks.filter((t) => t.status !== 'done');
        const doneCount = memberTasks.filter((t) => t.status === 'done').length;
        return { ...member, memberTasks, activeTasks, doneCount };
    });

    const avgActive = memberData.length > 0
        ? memberData.reduce((s, m) => s + m.activeTasks.length, 0) / memberData.length
        : 1;
    const maxActive = Math.max(...memberData.map((m) => m.activeTasks.length), 1);

    const overloaded = memberData.find((m) => m.activeTasks.length > avgActive * 1.5);
    const light = memberData.find(
        (m) => m.activeTasks.length < avgActive * 0.5 && m !== overloaded
    );

    const showInsight = !dismissedInsight && !!overloaded && !!light;

    const handleAutoRebalance = () => {
        if (!overloaded || !light) return;
        // Move the lowest-priority active task from overloaded to light
        const priorityRank = { low: 0, medium: 1, high: 2, urgent: 3 };
        const sorted = [...overloaded.activeTasks].sort(
            (a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1)
        );
        const taskToMove = sorted[0];
        if (taskToMove) {
            handleDrop(taskToMove.id, light.user.id, light.user.name);
            setDismissedInsight(true);
        }
    };

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No members yet</h3>
                <p className="text-sm text-slate-400">Add members to this project to see workload distribution.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto px-6 py-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        Team Workload
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Drag tasks between members to rebalance.{' '}
                        Team avg: <span className="font-semibold">{avgActive.toFixed(1)}</span> active tasks.
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {[
                        { color: '#C73B3B', label: 'Overloaded' },
                        { color: '#4A8C5C', label: 'Balanced' },
                        { color: '#B8922A', label: 'Light' },
                    ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Insight */}
            <AnimatePresence>
                {showInsight && (
                    <AiInsightCard
                        overloaded={{ ...overloaded, avgActive }}
                        light={light}
                        onAutoRebalance={handleAutoRebalance}
                        onDismiss={() => setDismissedInsight(true)}
                    />
                )}
            </AnimatePresence>

            {/* Member rows */}
            <div className="flex flex-col gap-4">
                {memberData.map((member) => {
                    const isHeavy = member.activeTasks.length > avgActive * 1.5;
                    const isLight = member.activeTasks.length < avgActive * 0.5 && member.activeTasks.length > 0;
                    const barColor = isHeavy ? '#C73B3B' : isLight ? '#B8922A' : '#4A8C5C';
                    const pct = (member.activeTasks.length / maxActive) * 100;
                    const loadStatus = isHeavy ? 'heavy' : isLight ? 'light' : 'balanced';

                    return (
                        <MemberRow
                            key={member.user.id}
                            member={member}
                            activeTasks={member.activeTasks}
                            doneCount={member.doneCount}
                            totalCount={member.memberTasks.length}
                            pct={pct}
                            loadStatus={loadStatus}
                            color={barColor}
                            onDrop={handleDrop}
                            projectId={projectId}
                            dimmed={focusedMemberId ? focusedMemberId !== member.user.id : false}
                            focused={focusedMemberId === member.user.id}
                            onFocusClick={() => onFocusChange?.(member.user.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default WorkloadView;
