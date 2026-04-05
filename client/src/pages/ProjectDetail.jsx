import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback, lazy, Suspense, useEffect } from 'react';
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    closestCorners, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, MessageCircle, MoreVertical, Trash2, X, Calendar, CalendarRange, Flag, BarChart2, BarChart3, LayoutGrid, AlignLeft, Sparkles, Check, Loader2, RefreshCw, Clock, ChevronDown, Upload, Download } from 'lucide-react';
import BoardFilterBar from '../components/shared/BoardFilterBar';
import BoardSortGroup from '../components/shared/BoardSortGroup';
import PageWrapper from '../components/layout/PageWrapper';
import DueDateBadge from '../components/due-date/DueDateBadge';
import DateTimePicker from '../components/due-date/DateTimePicker';
import BulkActionBar from '../components/shared/BulkActionBar';
import AttachmentPanel from '../components/shared/AttachmentPanel';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { TaskCardSkeleton } from '../components/ui/Skeleton';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { getAttachments } from '../services/attachmentService';
import useTaskStore from '../store/taskStore';
import useSocket from '../hooks/useSocket';
import { KANBAN_COLUMNS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/constants';
import { getPriorityBadgeClass, cn } from '../utils/helpers';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

// Lazy loaded heavy components
const WorkloadView = lazy(() => import('../components/views/WorkloadView'));
const SwimlaneView = lazy(() => import('../components/views/SwimlaneView'));
const TimelineView = lazy(() => import('../components/views/TimelineView'));
const CalendarView = lazy(() => import('../components/views/CalendarView'));
const CanvasView = lazy(() => import('../components/views/CanvasView'));
const ProjectStatsView = lazy(() => import('../components/projects/ProjectStatsView'));
const ProjectActivityView = lazy(() => import('../components/views/ProjectActivityView'));
const TaskDetailPanel = lazy(() => import('../components/shared/TaskDetailPanel'));
const ImportCsvModal = lazy(() => import('../components/shared/ImportCsvModal'));


const ViewFallback = () => (
    <div className="flex items-center justify-center h-full w-full py-24">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading view...</p>
        </div>
    </div>
);

// Task Card
const TaskCard = ({ task, projectId, onDueDateUpdate, onDelete, onSelect, isOverlay, onPriorityUpdate }) => {
    // Only use sortable hooks if NOT in overlay mode
    const sortable = useSortable({ id: task.id, disabled: isOverlay });
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
    
    const { toggleSelectTask, selectedTaskIds } = useTaskStore();
    const isSelected = selectedTaskIds.includes(task.id);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const triggerRef = useRef(null);
    const queryClient = useQueryClient();
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

    const style = isOverlay ? {
        cursor: 'grabbing',
    } : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : 1
    };

    const handleDateApply = async (date, hasDueTime) => {
        await onDueDateUpdate(task, date, hasDueTime);
        setShowDatePicker(false);
    };

    // Determine left border color based on priority
    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-orange-500';
            case 'urgent': return 'bg-red-500';
            case 'medium': return 'bg-blue-500';
            case 'low': return 'bg-slate-400';
            default: return 'bg-transparent';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelect(task)}
            className={cn(
                "group relative glass-premium border-holographic rounded-2xl p-3 cursor-pointer transition-all duration-300 flex hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.01] hover:z-[40] active:z-[40]",
                isSelected && "ring-2 ring-indigo-500/70 z-[30] shadow-[0_0_25px_rgba(99,102,241,0.25)]",
                isOverdue && !isSelected && "!border-red-400/30",
                isOverlay && "shadow-2xl ring-1 ring-indigo-500/50 rotate-2 opacity-90 z-[100]"
            )}
        >
            {/* Priority Left Border Indicator */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl opacity-90", getPriorityColor(task.priority))} />

            {/* Checkbox Overlay (Hover/Selected) */}
            <div
                className={cn(
                    "absolute top-3 left-3 transition-opacity z-10 cursor-pointer",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => { e.stopPropagation(); toggleSelectTask(task.id); }}
            >
                <div className={cn(
                    "w-4.5 h-4.5 rounded md border-2 flex items-center justify-center transition-colors shadow-sm",
                    isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                )}>
                    {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
            </div>

            <div className="flex-1 min-w-0 pl-1.5 flex flex-col h-full">
                <div className="flex items-start gap-2 mb-2">
                    {/* Drag Handle */}
                    {!isOverlay && (
                        <button
                            {...listeners}
                            {...attributes}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors hidden sm:block opacity-0 group-hover:opacity-100"
                        >
                            <GripVertical className="w-4 h-4" />
                        </button>
                    )}

                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-sm font-medium leading-snug break-words pr-5",
                            task.status === 'done' ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-100"
                        )}>
                            {task.title}
                        </p>
                    </div>

                    {/* Quick Menu */}
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                            align="right"
                            trigger={
                                <button className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            }
                            items={[
                                { icon: <Trash2 className="w-4 h-4" />, label: 'Delete task', danger: true, onClick: () => onDelete(task) }
                            ]}
                        />
                    </div>
                </div>

                {/* Tags */}
                {task.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                        {task.tags.map((tag) => (
                            <span key={tag} className="tag-premium">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                
                <div className="flex-1" />

                {/* Footer / Meta Data Row */}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <Dropdown
                                align="left"
                                position="top"
                                trigger={
                                    <button className={cn(`badge ${getPriorityBadgeClass(task.priority)} scale-90 origin-left hover:brightness-95 transition-all shadow-sm`)}>
                                        {task.priority}
                                    </button>
                                }
                                items={PRIORITY_OPTIONS.map(p => ({
                                    label: p.label,
                                    active: task.priority === p.value,
                                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />,
                                    onClick: () => onPriorityUpdate(task, p.value)
                                }))}
                            />
                            {task.isRecurring && (
                                <RefreshCw className="w-3 h-3 text-indigo-500" title="Recurring task" />
                            )}
                            {(task.description?.includes('sparkle') || task._count?.comments > 5) && (
                                <Sparkles className="w-3 h-3 text-amber-500" title="AI insights available" />
                            )}
                        </div>

                        {/* Subtask / Comment Badges */}
                        <div className="flex items-center gap-2">
                            {task._count?.subtasks > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800" title={`${task.subtasks?.filter(s => s.status === 'done')?.length || 0} of ${task._count.subtasks} subtasks completed`}>
                                    <Check className="w-2.5 h-2.5" />
                                    {task.subtasks?.filter(s => s.status === 'done')?.length || 0}/{task._count.subtasks}
                                </span>
                            )}
                            {task._count?.comments > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                    <MessageCircle className="w-3 h-3" />
                                    {task._count.comments}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()} className="relative shrink-0">
                            <div ref={triggerRef}>
                                <DueDateBadge
                                    dueDate={task.dueDate}
                                    hasDueTime={task.hasDueTime}
                                    taskStatus={task.status}
                                    compact
                                    onClick={() => setShowDatePicker((o) => !o)}
                                />
                            </div>
                            {showDatePicker && (
                                <DateTimePicker
                                    referenceRef={triggerRef}
                                    value={task.dueDate}
                                    hasDueTime={task.hasDueTime}
                                    onApply={handleDateApply}
                                    onClear={() => handleDateApply(null, false)}
                                    onClose={() => setShowDatePicker(false)}
                                />
                            )}
                        </div>
                        {task.assignee && (
                            <div className="shrink-0" title={`Assigned to ${task.assignee.name}`}>
                                <Avatar user={task.assignee} size="xs" className="ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Kanban Column
const KanbanColumn = ({ column, tasks, projectId, onDueDateUpdate, onDelete, onAddTask, onSelectTask, createMutation, onPriorityUpdate }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const queryClient = useQueryClient();

    const handleQuickAdd = () => {
        if (!quickAddTitle.trim()) {
            setIsQuickAdding(false);
            return;
        }
        createMutation.mutate({ 
            title: quickAddTitle.trim(), 
            status: column.id 
        }, {
            onSuccess: () => {
                setQuickAddTitle('');
                // Keep the input open if they used Enter, for rapid entry
                // But if they clicked away/blurred, we close it via the blur handler elsewhere
            }
        });
    };

    const handleClearDone = async () => {
        if (!window.confirm('Are you sure you want to delete all completed tasks in this column?')) return;
        try {
            const doneTasks = tasks.filter(t => t.status === 'done');
            await Promise.all(doneTasks.map(t => taskService.delete(projectId, t.id)));
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success(`Cleared ${doneTasks.length} tasks`);
        } catch (err) {
            toast.error('Failed to clear tasks');
        }
    };

    const getColumnBgTint = () => {
        const tints = {
            todo:        'rgba(148,163,184,0.04)',
            in_progress: 'rgba(59,130,246,0.06)',
            in_review:   'rgba(168,85,247,0.06)',
            done:        'rgba(16,185,129,0.05)',
        };
        return tints[column.id] || 'transparent';
    };

    return (
        <div
            className={cn(
                "flex flex-col w-[300px] sm:w-[320px] shrink-0 glass-premium rounded-2xl h-full max-h-full snap-center md:snap-align-none border transition-all duration-300",
                `cinema-glow-${column.id}`,
                isOver ? "border-indigo-500/40 scale-[1.005]" : "border-white/20 dark:border-white/5"
            )}
            style={{ backgroundColor: getColumnBgTint() }}
        >
            <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}90` }}
                    />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight">{column.title}</h3>
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-white/40 dark:border-white/10 shadow-sm">
                        {tasks.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {column.id === 'done' && tasks.length > 0 && (
                        <button
                            onClick={handleClearDone}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                            title="Clear all completed tasks"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onAddTask && (
                    <button
                        onClick={() => onAddTask(column.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Open full create modal"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    )}
                </div>
            </div>

            <div
                ref={setNodeRef}
                className="flex-1 overflow-y-auto px-3 pb-2 pt-2 space-y-3 min-h-[150px]"
            >
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            projectId={projectId}
                            onDueDateUpdate={onDueDateUpdate}
                            onDelete={onDelete}
                            onSelect={onSelectTask}
                            onPriorityUpdate={onPriorityUpdate}
                        />
                    ))}
                </SortableContext>
                
                {tasks.length === 0 && !isQuickAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-24 rounded-2xl border border-dashed border-slate-200/50 dark:border-slate-700/30 flex flex-col items-center justify-center gap-1.5"
                    >
                        <Sparkles className="w-4 h-4 text-slate-300 dark:text-slate-600 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-300 dark:text-slate-600">No tasks yet</span>
                    </motion.div>
                )}
            </div>

            {/* QUICK ADD AT THE BOTTOM */}
            <div className="p-3 pt-0">
                {isQuickAdding ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-lg border-2 border-indigo-500"
                    >
                        <input
                            autoFocus
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickAdd();
                                if (e.key === 'Escape') {
                                    setIsQuickAdding(false);
                                    setQuickAddTitle('');
                                }
                            }}
                            placeholder="Task title..."
                            className="w-full text-sm bg-transparent border-none focus:ring-0 p-1 text-slate-800 dark:text-slate-100"
                        />
                        <div className="flex justify-end gap-1 mt-1">
                            <button 
                                onClick={() => { setIsQuickAdding(false); setQuickAddTitle(''); }}
                                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handleQuickAdd}
                                disabled={createMutation.isPending || !quickAddTitle.trim()}
                                className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded shadow-sm disabled:opacity-50 transition-colors"
                            >
                                SAVE
                            </button>
                        </div>
                    </motion.div>
                ) : onAddTask ? (
                    <button
                        onClick={() => setIsQuickAdding(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-xs font-semibold">Add Task</span>
                    </button>
                ) : null}
            </div>
        </div>
    );
};

// ── MoreTabsMenu: collapsible dropdown for extra view tabs ──────────────────
const MoreTabsMenu = ({ viewMode, setViewMode, moreTabs, projectColor }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const activeMore = moreTabs.some(t => t.id === viewMode);
    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'relative flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                    activeMore
                        ? 'text-indigo-600 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
            >
                {activeMore && (
                    <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-md border"
                        style={{
                            background: 'linear-gradient(135deg, white 0%, rgba(238,240,255,0.95) 100%)',
                            borderColor: `${projectColor || '#6366f1'}20`,
                            boxShadow: `0 2px 8px ${projectColor || '#6366f1'}15, inset 0 1px 1px rgba(255,255,255,1)`
                        }}
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                    />
                )}
                <span className="relative z-20 flex items-center gap-1">
                    {activeMore ? moreTabs.find(t => t.id === viewMode)?.label ?? 'More' : 'More'}
                    <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
                </span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full mt-1.5 left-0 z-50 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 min-w-[140px] overflow-hidden p-1"
                    >
                        {moreTabs.map(({ id, icon, label }) => (
                            <button
                                key={id}
                                onClick={() => { setViewMode(id); setOpen(false); }}
                                className={cn(
                                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left',
                                    viewMode === id
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                )}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── OverflowMenu: ⋯ button for rare actions (Import/Export) ──────────────────
const OverflowMenu = ({ onImport, onExport }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div ref={ref} className="relative shrink-0">
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-lg transition-all border',
                    open
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                )}
                title="More actions"
            >
                <MoreVertical className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 min-w-[160px] overflow-hidden"
                    >
                        <div className="px-3 pt-2.5 pb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</p>
                        </div>
                        <div className="p-1">
                            <button
                                onClick={() => { onImport(); setOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                            >
                                <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                Import CSV
                            </button>
                            <button
                                onClick={() => { onExport(); setOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                Export CSV
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Main Component
const ProjectDetail = () => {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTask, setActiveTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskStatus, setNewTaskStatus] = useState('todo');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [isSuggestingPriority, setIsSuggestingPriority] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleSuggestPriority = async () => {
        if (!newTaskTitle) return toast.error('Enter a title first');
        setIsSuggestingPriority(true);
        try {
            const res = await taskService.suggestPriority({ title: newTaskTitle });
            const suggested = res.data?.data?.priority;
            if (suggested) {
                setNewTaskPriority(suggested);
                toast.success(`AI suggested "${suggested}" priority`);
            }
        } catch (err) {
            toast.error('AI suggestion failed');
        } finally {
            setIsSuggestingPriority(false);
        }
    };

    const [filter, setFilter] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskAttachments, setTaskAttachments] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'swimlane' | 'workload'
    const [focusedMemberId, setFocusedMemberId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [boardFilters, setBoardFilters] = useState({ statuses: [], priorities: [], assigneeIds: [], dueDates: [] });
    const [sortField, setSortField] = useState('none');   // 'none' | 'priority' | 'dueDate' | 'title' | 'createdAt'
    const [sortDir, setSortDir] = useState('asc');         // 'asc' | 'desc'
    const [groupBy, setGroupBy] = useState('status');       // 'status' | 'priority' | 'assignee' | 'dueDate'

    const [searchParams, setSearchParams] = useSearchParams();

    const toggleFocus = (memberId) => setFocusedMemberId(prev => prev === memberId ? null : memberId);
    const clearFocus = () => setFocusedMemberId(null);

    useSocket(projectId);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getOne(projectId),
    });

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['tasks', projectId, filter],
        queryFn: () => taskService.getAll(projectId, { limit: 500, ...(filter ? { dueDateFilter: filter } : {}) }),
    });

    const createMutation = useMutation({
        mutationFn: (data) => taskService.create(projectId, data),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); setNewTaskTitle(''); setShowAddTask(false); toast.success('Task created'); },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ taskId }) => taskService.delete(projectId, taskId),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); toast.success('Task deleted'); },
    });

    const updateDueDateMutation = useMutation({
        mutationFn: ({ taskId, dueDate, hasDueTime }) => taskService.updateDueDate(projectId, taskId, { dueDate: dueDate?.toISOString() || null, hasDueTime }),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); toast.success('Due date updated'); },
        onError: () => toast.error('Failed to update due date'),
    });

    const updatePriorityMutation = useMutation({
        mutationFn: ({ taskId, priority }) => taskService.update(projectId, taskId, { priority }),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); toast.success('Priority updated'); },
        onError: () => toast.error('Failed to update priority'),
    });

    const project = projectData?.data?.data?.project;
    const tasks = tasksData?.data?.data?.tasks || [];
    const members = project?.members || [];

    // Load attachments when a task is selected
    const handleSelectTask = async (task) => {
        setSelectedTask(task);
        try {
            const res = await getAttachments(task.id);
            const raw = res.data?.data?.attachments || [];
            setTaskAttachments(raw.map(a => ({ ...a, name: a.name.split('||')[0] })));
        } catch {
            setTaskAttachments([]);
        }
    };

    // Auto-select task from URL parameter (?task=ID)
    useEffect(() => {
        const taskId = searchParams.get('task');
        if (taskId && tasks.length > 0) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                // Clear the parameter FIRST to prevent re-triggering
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('task');
                setSearchParams(newParams, { replace: true });
                
                // Then select the task if not already selected
                if (!selectedTask || selectedTask.id !== task.id) {
                    handleSelectTask(task);
                }
            }
        }
    }, [searchParams, tasks, selectedTask]); // Re-added selectedTask to deps for precise check

    // Swimlane/Workload: also include workspace members who have tasks assigned
    // but weren't explicitly added to the project's member list
    const tasksList = Array.isArray(tasks) ? tasks : [];
    
    // Apply local filtering: search + status + priority + assignee + due date
    const filteredTasks = tasksList.filter(task => {
        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesTitle = task.title?.toLowerCase().includes(q);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(q));
            const matchesAssignee = task.assignee?.name?.toLowerCase().includes(q);
            if (!matchesTitle && !matchesTags && !matchesAssignee) return false;
        }

        // Status filter
        if (boardFilters.statuses?.length > 0 && !boardFilters.statuses.includes(task.status)) return false;

        // Priority filter
        if (boardFilters.priorities?.length > 0 && !boardFilters.priorities.includes(task.priority)) return false;

        // Assignee filter
        if (boardFilters.assigneeIds?.length > 0) {
            if (!task.assignee || !boardFilters.assigneeIds.includes(task.assignee.id)) return false;
        }

        // Due date filter (local)
        if (boardFilters.dueDates?.length > 0) {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(todayStart.getTime() + 86400000);
            const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);
            const due = task.dueDate ? new Date(task.dueDate) : null;

            const matchesDue = boardFilters.dueDates.some(df => {
                if (df === 'overdue') return due && due < todayStart && task.status !== 'done';
                if (df === 'today') return due && due >= todayStart && due < todayEnd;
                if (df === 'this_week') return due && due >= todayStart && due < weekEnd;
                if (df === 'no_date') return !due;
                return true;
            });
            if (!matchesDue) return false;
        }

        return true;
    });

    const effectiveMembers = (() => {
        const seen = new Set(members.map((m) => m.user.id));
        const extra = filteredTasks
            .filter((t) => t.assignee && !seen.has(t.assignee.id))
            .reduce((acc, t) => {
                if (!acc.find((m) => m.user.id === t.assignee.id)) {
                    acc.push({ user: t.assignee, role: 'Member', userId: t.assignee.id });
                }
                return acc;
            }, []);
        return [...members, ...extra];
    })();


    const importMutation = useMutation({
        mutationFn: (importTasks) => taskService.bulkImport(projectId, importTasks),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success('Imported successfully');
            setIsImportModalOpen(false);
        },
        onError: () => toast.error('Failed to import'),
    });

    const handleImportCSV = (file) => {
        console.log('handleImportCSV called with file:', file);
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log('CSV Parse complete. Results:', results);
                const mapped = results.data.map(row => ({
                    title: row.Title || row.title || row.TITLE,
                    description: row.Description || row.description || row.DESCRIPTION,
                    status: (row.Status || row.status || row.STATUS || 'todo').toLowerCase(),
                    priority: (row.Priority || row.priority || row.PRIORITY || 'medium').toLowerCase(),
                    dueDate: row.DueDate || row.dueDate || row['Due Date'] || null,
                })).filter(t => t.title);

                console.log('Mapped tasks:', mapped);

                if (mapped.length === 0) {
                    toast.error('No valid tasks found in CSV');
                    return;
                }
                importMutation.mutate(mapped);
            },
            error: (err) => {
                console.error('CSV Parse error:', err);
                toast.error('Failed to parse CSV');
            }
        });
    };
    const handleExportCSV = () => {
        if (!tasks.length) {
            toast.error('No tasks to export');
            return;
        }
        const exportData = tasks.map(t => ({
            Title: t.title,
            Description: t.description || '',
            Status: t.status,
            Priority: t.priority,
            DueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
        }));
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${project?.name || 'project'}-tasks.csv`;
        link.click();
    };

    const handleDueDateUpdate = (taskId, date, hasTime) => {
        updateDueDateMutation.mutate({ taskId, dueDate: date, hasDueTime: hasTime });
    };

    // ── Sort filteredTasks ─────────────────────────────────────────────────────
    const PRIORITY_RANK = { urgent: 0, critical: 0, high: 1, medium: 2, low: 3 };
    const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
        if (sortField === 'none') return 0;
        let aVal, bVal;
        if (sortField === 'priority') {
            aVal = PRIORITY_RANK[a.priority] ?? 99;
            bVal = PRIORITY_RANK[b.priority] ?? 99;
        } else if (sortField === 'dueDate') {
            aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        } else if (sortField === 'title') {
            aVal = (a.title || '').toLowerCase();
            bVal = (b.title || '').toLowerCase();
        } else if (sortField === 'createdAt') {
            aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    // ── Dynamic group columns ─────────────────────────────────────────────────
    const buildGroupColumns = () => {
        if (groupBy === 'status') {
            return KANBAN_COLUMNS.map(col => ({
                id: col.id,
                title: col.title,
                color: col.color,
                tasks: sortedFilteredTasks.filter(t => t.status === col.id),
            }));
        }
        if (groupBy === 'priority') {
            const cols = [
                { id: 'urgent',   title: '🔴 Urgent',  color: '#ef4444' },
                { id: 'high',     title: '🟠 High',    color: '#f97316' },
                { id: 'medium',   title: '🟡 Medium',  color: '#eab308' },
                { id: 'low',      title: '🟢 Low',     color: '#22c55e' },
                { id: 'none',     title: '⚪ No Priority', color: '#94a3b8' },
            ];
            return cols.map(col => ({
                ...col,
                tasks: sortedFilteredTasks.filter(t =>
                    col.id === 'none' ? !t.priority : t.priority === col.id
                ),
            })).filter(col => col.tasks.length > 0 || groupBy === 'priority');
        }
        if (groupBy === 'assignee') {
            const unassigned = sortedFilteredTasks.filter(t => !t.assignee);
            const assigneeMap = {};
            sortedFilteredTasks.filter(t => t.assignee).forEach(task => {
                const id = task.assignee.id;
                if (!assigneeMap[id]) assigneeMap[id] = { user: task.assignee, tasks: [] };
                assigneeMap[id].tasks.push(task);
            });
            const cols = Object.values(assigneeMap).map(({ user, tasks }) => ({
                id: user.id,
                title: user.name || user.email || 'Member',
                color: '#6366f1',
                tasks,
                user,
            }));
            if (unassigned.length > 0) {
                cols.unshift({ id: 'unassigned', title: 'Unassigned', color: '#94a3b8', tasks: unassigned });
            }
            return cols;
        }
        if (groupBy === 'dueDate') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(todayStart.getTime() + 86400000);
            const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);
            const cols = [
                { id: 'overdue',   title: '🔴 Overdue',   color: '#ef4444', fn: t => t.dueDate && new Date(t.dueDate) < todayStart && t.status !== 'done' },
                { id: 'today',     title: '📅 Due Today',  color: '#3b82f6', fn: t => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) < todayEnd },
                { id: 'this_week', title: '📆 This Week',  color: '#8b5cf6', fn: t => t.dueDate && new Date(t.dueDate) >= todayEnd && new Date(t.dueDate) < weekEnd },
                { id: 'later',     title: '🗓 Later',      color: '#10b981', fn: t => t.dueDate && new Date(t.dueDate) >= weekEnd },
                { id: 'no_date',   title: '⚪ No Due Date', color: '#94a3b8', fn: t => !t.dueDate },
            ];
            return cols.map(col => ({ ...col, tasks: sortedFilteredTasks.filter(col.fn) }))
                       .filter(col => col.tasks.length > 0);
        }
        return [];
    };
    const groupColumns = buildGroupColumns();

    const handleDragStart = ({ active }) => {
        const task = tasks.find((t) => t.id === active.id);
        setActiveTask(task);
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveTask(null);
        if (!over) return;
        const taskId = active.id;
        const newStatus = over.id;
        if (!KANBAN_COLUMNS.find((c) => c.id === newStatus)) return;
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status === newStatus) return;
        try {
            await taskService.updateStatus(projectId, taskId, newStatus);
            queryClient.invalidateQueries(['tasks', projectId]);
        } catch {
            toast.error('Failed to move task');
        }
    };

    return (
        <PageWrapper title={project?.name || 'Project Board'}>
            <div className="h-full flex flex-col relative w-full overflow-hidden bg-slate-50 dark:bg-gray-950">
                
                {/* ── Compact 2-Row Header ──────────────────────────── */}
                <div className="relative px-4 sm:px-6 pt-2.5 pb-2 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60 z-10 transition-colors duration-700"
                     style={{
                         backgroundColor: `${project?.color || '#6366f1'}08`,
                         backgroundImage: `linear-gradient(to bottom, ${project?.color || '#6366f1'}18, transparent)`
                     }}>

                    {/* Subtle bg glow */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-10 right-1/3 w-[300px] h-[150px] rounded-full blur-[60px] opacity-20 mix-blend-multiply dark:mix-blend-screen" style={{ backgroundColor: project?.color || '#6366f1' }} />
                    </div>

                    {/* ── Row 1: Identity + Members + New Task ── */}
                    <div className="relative flex items-center gap-2.5 mb-2">
                        {/* Project icon */}
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: 'spring', bounce: 0.4 }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/50 dark:border-white/10 relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${project?.color || '#6366f1'}40, ${project?.color || '#6366f1'}15)`,
                                color: project?.color || '#6366f1',
                                boxShadow: `0 4px 10px ${project?.color || '#6366f1'}25, inset 0 1px 1px rgba(255,255,255,0.3)`
                            }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            <LayoutGrid className="w-4 h-4 relative z-10" />
                        </motion.div>

                        {/* Title */}
                        <h1 className="text-base sm:text-lg font-extrabold hero-gradient-text truncate max-w-[180px] sm:max-w-xs">
                            {project?.name || 'Project Name'}
                        </h1>

                        {/* Task count badges */}
                        <div className="hidden sm:flex items-center gap-1">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-white/10">
                                {project?._count?.tasks || 0} tasks
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                                style={{ color: project?.color || '#6366f1', backgroundColor: `${project?.color || '#6366f1'}12`, borderColor: `${project?.color || '#6366f1'}30` }}>
                                {filteredTasks.length} visible
                            </span>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Member avatars */}
                        <div className="hidden sm:flex -space-x-1.5 items-center">
                            {members.slice(0, 4).map((m, i) => {
                                const avatarColors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'];
                                const bg = avatarColors[i % avatarColors.length];
                                return (
                                    <motion.div
                                        whileHover={{ y: -3, scale: 1.2, zIndex: 20 }}
                                        key={m.user.id}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] cursor-help"
                                        style={{ zIndex: 10 - i, backgroundColor: bg, boxShadow: `0 0 0 2px white, 0 2px 6px ${bg}40` }}
                                        title={m.user.name}
                                    >
                                        {m.user.avatarUrl
                                            ? <img src={m.user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                                            : m.user.name[0].toUpperCase()}
                                    </motion.div>
                                );
                            })}
                            {members.length > 4 && (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px]" style={{ boxShadow: '0 0 0 2px white' }}>
                                    +{members.length - 4}
                                </div>
                            )}
                        </div>

                        {/* New Task — row 1 for easy access */}
                        <Button
                            onClick={() => { setNewTaskStatus('todo'); setShowAddTask(true); }}
                            className="shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 text-xs py-1.5 px-3"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            New Task
                        </Button>
                    </div>

                    {/* ── Row 2: View tabs + Filters + ⋯ overflow ── */}
                    {/* Outer shell: scroll affordance + fade edges */}
                    <div className="relative">
                        {/* Fade-edge masks for horizontal scroll affordance */}
                        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 z-10 bg-gradient-to-r from-white/90 dark:from-slate-900/80 to-transparent rounded-l-xl" />
                        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 z-10 bg-gradient-to-l from-white/90 dark:from-slate-900/80 to-transparent rounded-r-xl" />

                        {/* Scrollable inner row */}
                        <div className="flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/70 dark:border-white/8 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] overflow-x-auto scrollbar-hide">

                            {/* Primary 4 tabs + More ▾ */}
                            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100/60 dark:bg-slate-900/50 rounded-lg border border-slate-200/40 dark:border-white/5 shrink-0 relative">
                                {[
                                    { id: 'kanban',   icon: <LayoutGrid className="w-3 h-3" />,    label: 'Kanban'   },
                                    { id: 'calendar', icon: <Calendar className="w-3 h-3" />,      label: 'Calendar' },
                                    { id: 'timeline', icon: <CalendarRange className="w-3 h-3" />, label: 'Timeline' },
                                    { id: 'stats',    icon: <BarChart3 className="w-3 h-3" />,     label: 'Stats'    },
                                ].map(({ id, icon, label }) => (
                                    <motion.button
                                        key={id}
                                        onClick={() => setViewMode(id)}
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.97 }}
                                        transition={{ type: 'spring', bounce: 0.4, duration: 0.25 }}
                                        className={cn(
                                            'relative flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap z-10',
                                            viewMode === id
                                                ? 'text-indigo-600 dark:text-white'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        )}
                                    >
                                        {viewMode === id && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 rounded-md border"
                                                style={{
                                                    background: 'linear-gradient(135deg, white 0%, rgba(238,240,255,0.95) 100%)',
                                                    borderColor: `${project?.color || '#6366f1'}20`,
                                                    boxShadow: `0 2px 8px ${project?.color || '#6366f1'}15, inset 0 1px 1px rgba(255,255,255,1)`
                                                }}
                                                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                                            />
                                        )}
                                        <span className="relative z-20 flex items-center gap-1">{icon}{label}</span>
                                    </motion.button>
                                ))}

                                {/* More ▾ for Swimlane / Workload / Canvas / Activity */}
                                <MoreTabsMenu
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    projectColor={project?.color}
                                    moreTabs={[
                                        { id: 'swimlane', icon: <AlignLeft className="w-3 h-3" />,  label: 'Swimlane' },
                                        { id: 'workload', icon: <BarChart2 className="w-3 h-3" />,  label: 'Workload' },
                                        { id: 'canvas',   icon: <Sparkles className="w-3 h-3" />,   label: 'Canvas'   },
                                        { id: 'activity', icon: <Clock className="w-3 h-3" />,       label: 'Activity' },
                                    ]}
                                />
                            </div>

                            {/* Divider */}
                            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

                            {/* Unified search + filter button */}
                            <div className="shrink-0">
                                <BoardFilterBar
                                    searchQuery={searchQuery}
                                    onSearchChange={setSearchQuery}
                                    filters={boardFilters}
                                    onFiltersChange={setBoardFilters}
                                    members={effectiveMembers}
                                    totalCount={tasksList.length}
                                    filteredCount={filteredTasks.length}
                                />
                            </div>

                            {/* Sort & Group — kanban only */}
                            {viewMode === 'kanban' && (
                                <div className="shrink-0">
                                    <BoardSortGroup
                                        sortField={sortField}
                                        sortDir={sortDir}
                                        onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
                                        groupBy={groupBy}
                                        onGroupByChange={setGroupBy}
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-[8px]" />

                            {/* ⋯ overflow: Import / Export (rare actions, hidden by default) */}
                            <div className="shrink-0">
                                <OverflowMenu
                                    onImport={() => setIsImportModalOpen(true)}
                                    onExport={handleExportCSV}
                                />
                            </div>
                        </div>
                    </div>
                </div>



                {/* Board / Workload / Swimlane area */}
                <div className={cn(
                    "flex-1 min-h-0",
                    viewMode === 'kanban' ? "overflow-x-auto overflow-y-hidden px-4 sm:px-6 pb-6 snap-x snap-mandatory hide-scrollbar" : "overflow-y-auto overflow-x-hidden h-full custom-scrollbar"
                )}>
                    <Suspense fallback={<ViewFallback />}>
                        {viewMode === 'workload' ? (
                            <WorkloadView
                                tasks={filteredTasks}
                                members={effectiveMembers}
                                projectId={projectId}
                                focusedMemberId={null}
                                onFocusChange={() => {}}
                            />
                        ) : viewMode === 'swimlane' ? (
                            <SwimlaneView
                                tasks={filteredTasks}
                                members={effectiveMembers}
                                projectId={projectId}
                                focusedMemberId={null}
                                onFocusChange={() => {}}
                            />
                        ) : viewMode === 'calendar' ? (
                            <CalendarView
                                tasks={filteredTasks}
                                onDueDateUpdate={handleDueDateUpdate}
                            />
                        ) : viewMode === 'timeline' ? (
                            <TimelineView
                                tasks={filteredTasks}
                                onFocusChange={setActiveTask}
                            />
                        ) : viewMode === 'canvas' ? (
                            <CanvasView
                                tasks={filteredTasks}
                                projectId={projectId}
                                onFocusChange={setActiveTask}
                            />
                        ) : viewMode === 'stats' ? (
                            <ProjectStatsView projectId={projectId} />
                        ) : viewMode === 'activity' ? (
                            <ProjectActivityView projectId={projectId} />
                        ) : isLoading ? (
                            <div className="flex gap-6 h-full">
                                {KANBAN_COLUMNS.map((col) => (
                                    <div key={col.id} className="w-[300px] shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 space-y-3">
                                        {[1, 2, 3].map(i => <TaskCardSkeleton key={i} />)}
                                    </div>
                                ))}
                            </div>
                        ) : filteredTasks.length === 0 && tasksList.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center w-full h-full py-24 gap-4"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl shadow-inner">
                                    🔍
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No tasks match your filters</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filter criteria</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setBoardFilters({ statuses: [], priorities: [], assigneeIds: [], dueDates: [] });
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 transition-all"
                                >
                                    Clear all filters
                                </button>
                            </motion.div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={groupBy === 'status' ? handleDragEnd : () => {}}>
                                <div className="flex gap-6 h-full items-start">
                                    {groupColumns.map((col) => (
                                        <KanbanColumn
                                            key={col.id}
                                            column={col}
                                            tasks={col.tasks}
                                            projectId={projectId}
                                            onDueDateUpdate={(task, date, hasDueTime) => updateDueDateMutation.mutate({ taskId: task.id, dueDate: date, hasDueTime })}
                                            onDelete={(task) => deleteMutation.mutate({ taskId: task.id })}
                                            onAddTask={groupBy === 'status' ? (status) => { setNewTaskStatus(status); setShowAddTask(true); } : null}
                                            onSelectTask={handleSelectTask}
                                            createMutation={createMutation}
                                            onPriorityUpdate={(task, priority) => updatePriorityMutation.mutate({ taskId: task.id, priority })}
                                        />
                                    ))}
                                </div>
                                <DragOverlay>
                                    {activeTask && (
                                        <TaskCard
                                            task={activeTask}
                                            projectId={projectId}
                                            isOverlay
                                        />
                                    )}
                                </DragOverlay>
                            </DndContext>
                        )}
                    </Suspense>
                </div>
            </div>

            {/* Add Task Modal */}
            <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="New Task">
                <div className="space-y-4">
                    <Input label="Task Title" placeholder="What needs to be done?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Status</label>
                            <select className="input" value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)}>
                                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</label>
                                <button
                                    onClick={handleSuggestPriority}
                                    disabled={isSuggestingPriority || !newTaskTitle}
                                    className="text-[10px] flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold disabled:opacity-50"
                                >
                                    <Sparkles className={cn("w-3 h-3", isSuggestingPriority && "animate-pulse")} />
                                    AI SUGGEST
                                </button>
                            </div>
                            <select className="input" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                                {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddTask(false)}>Cancel</Button>
                        <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate({ title: newTaskTitle, status: newTaskStatus, priority: newTaskPriority })} disabled={!newTaskTitle}>Add Task</Button>
                    </div>
                </div>
            </Modal>

            <BulkActionBar projectId={projectId} onComplete={() => queryClient.invalidateQueries(['tasks', projectId])} />

            {/* Task Detail Side Panel */}
            {selectedTask && (
                <Suspense fallback={null}>
                    <TaskDetailPanel
                        key={selectedTask.id}
                        task={selectedTask}
                        projectId={projectId}
                        onClose={() => setSelectedTask(null)}
                        onTaskSelect={setSelectedTask}
                    />
                </Suspense>
            )}

            {/* Import CSV Modal */}
            <Suspense fallback={null}>
                <ImportCsvModal
                    isOpen={isImportModalOpen}
                    onClose={() => { setIsImportModalOpen(false); importMutation.reset(); }}
                    onImport={handleImportCSV}
                    isImporting={importMutation.isPending}
                />
            </Suspense>
        </PageWrapper>
    );
};

export default ProjectDetail;
