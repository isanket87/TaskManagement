import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, Suspense, lazy, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
    isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths, startOfDay
} from 'date-fns';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, 
    Clock, ListTodo, Plus, Search, Filter, MoreHorizontal, X, AlertCircle,
    CheckCircle2, Circle, Layout, Target, ArrowRight, Kanban, PanelRight, GripVertical
} from 'lucide-react';
import { useDraggable, useDroppable, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/layout/PageWrapper';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { getDueDateBadgeStyles } from '../utils/dueDateUtils';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';
import useWorkspaceStore from '../store/workspaceStore';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const TaskDetailPanel = lazy(() => import('../components/shared/TaskDetailPanel'));

// ─── Skeleton Loader ────────────────────────────────────────────────────────
const CalendarSkeleton = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-pulse">
        <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="h-8 mx-1 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[100px] md:min-h-[140px] rounded-2xl bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-2 flex flex-col gap-1.5">
                    <div className="w-6 h-4 rounded-md bg-slate-200/70 dark:bg-slate-700/60" />
                    {i % 3 === 0 && <div className="h-5 rounded-lg bg-slate-200/60 dark:bg-slate-700/50 mt-1" />}
                    {i % 5 === 0 && <div className="h-5 rounded-lg bg-slate-200/40 dark:bg-slate-700/30" />}
                </div>
            ))}
        </div>
    </div>
);

// ─── Task Pill ────────────────────────────────────────────────────────────────
const TaskPill = ({ task, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
        id: task.id, 
        data: { task } 
    });
    
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100
    } : undefined;

    const taskDate = task.dueDate ? (typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate)) : null;
    const isCompleted = task.status === 'done';
    const isOverdue = taskDate && taskDate < new Date() && !isCompleted;

    const pillBg = isCompleted
        ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400'
        : isOverdue
        ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/30 text-red-700 dark:text-red-400'
        : task.priority === 'urgent'
        ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200/40 dark:border-red-800/20 text-slate-700 dark:text-slate-300'
        : task.priority === 'high'
        ? 'bg-orange-50/60 dark:bg-orange-900/10 border-orange-200/40 dark:border-orange-800/20 text-slate-700 dark:text-slate-300'
        : 'bg-white/80 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/40 text-slate-700 dark:text-slate-300';

    return (
        <motion.div 
            layoutId={`task-${task.id}`}
            ref={setNodeRef} {...listeners} {...attributes}
            style={style}
            onClick={(e) => { e.stopPropagation(); onClick(task); }}
            className={cn(
                'group relative text-[10px] font-bold px-1.5 py-1 rounded-lg truncate cursor-grab active:cursor-grabbing mb-0.5 border shadow-sm transition-all flex items-center gap-1 overflow-hidden select-none hover:scale-[1.02] hover:shadow-md', 
                pillBg,
                isDragging && 'opacity-50 scale-105 shadow-2xl z-[100] ring-2 ring-indigo-500 border-transparent'
            )}
        >
            <div 
                className="w-[3px] h-3 rounded-full shrink-0" 
                style={{ backgroundColor: task.project?.color || '#6366f1' }}
            />
            <span className={cn('flex-1 truncate uppercase tracking-tighter', isCompleted && 'line-through opacity-60')}>
                {task.title}
            </span>
            <GripVertical className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" />
        </motion.div>
    );
};

// ─── Day Cell ─────────────────────────────────────────────────────────────────
const DayCell = ({ date, tasks, currentMonth, onTaskClick, isSelected, onSelectDay }) => {
    const { setNodeRef, isOver } = useDroppable({ id: date.toISOString() });
    
    const dayTasks = useMemo(() => {
        const cellDate = startOfDay(date);
        return tasks.filter((t) => {
            if (!t.dueDate) return false;
            const d = startOfDay(typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate));
            return isSameDay(d, cellDate);
        });
    }, [tasks, date]);

    const completedCount = dayTasks.filter(t => t.status === 'done').length;
    const completionPct = dayTasks.length > 0 ? (completedCount / dayTasks.length) * 100 : 0;

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
        <div
            ref={setNodeRef}
            onClick={() => onSelectDay(date)}
            className={cn(
                'relative group min-h-[100px] md:min-h-[140px] p-2 rounded-2xl transition-all duration-200 overflow-hidden flex flex-col h-full cursor-pointer border',
                // Base glass style
                'bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl',
                // Out-of-month fade
                !isSameMonth(date, currentMonth) && 'opacity-20 grayscale-[0.6] pointer-events-none',
                // Weekend subtle tint
                isWeekend && isSameMonth(date, currentMonth) && !isSelected && !isToday(date) && 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/40 dark:border-slate-800/40',
                // Default border
                !isWeekend && !isSelected && !isToday(date) && 'border-slate-200/50 dark:border-slate-800/50',
                // Today
                isToday(date) && 'ring-2 ring-indigo-500/60 bg-indigo-50/30 dark:bg-indigo-900/15 border-indigo-300/50 dark:border-indigo-700/50 shadow-[0_0_20px_rgba(99,102,241,0.12)]',
                // Selected
                isSelected && 'bg-indigo-50/90 dark:bg-indigo-900/30 border-indigo-400/70 ring-2 ring-indigo-400/60 z-[5] shadow-lg',
                // Drop zone
                isOver && 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500 scale-[1.02] z-[6] shadow-2xl',
                // Hover
                !isSelected && !isOver && isSameMonth(date, currentMonth) && 'hover:bg-white dark:hover:bg-slate-800/70 hover:border-indigo-300/60 dark:hover:border-indigo-800/60 hover:shadow-md hover:scale-[1.005]'
            )}
        >
            {/* Date Number */}
            <div className="flex items-center justify-between mb-1.5">
                <div className={cn(
                    'text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-all', 
                    isToday(date) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : 
                    isSelected ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200' :
                    'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                )}>
                    {format(date, 'd')}
                </div>
                {dayTasks.length > 0 && (
                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">
                        {dayTasks.length}
                    </div>
                )}
            </div>
            
            {/* Task Pills */}
            <div className="flex-1 space-y-0.5 relative z-10 w-full min-h-0">
                {dayTasks.slice(0, 5).map((t) => (
                    <TaskPill key={t.id} task={t} onClick={onTaskClick} />
                ))}
                {dayTasks.length > 5 && (
                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 px-1 mt-1 uppercase tracking-widest">
                        + {dayTasks.length - 5} more
                    </div>
                )}
            </div>

            {/* Completion Progress Bar */}
            {dayTasks.length > 0 && (
                <div className="mt-1.5 w-full h-[2px] rounded-full bg-slate-200/60 dark:bg-slate-700/40 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={cn(
                            'h-full rounded-full',
                            completionPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                        )}
                    />
                </div>
            )}
        </div>
    );
};

// ─── Priority badge config ────────────────────────────────────────────────────
const priorityConfig = {
    urgent: { label: 'Urgent', active: 'bg-red-600 border-red-600 text-white shadow-red-600/30', inactive: 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50 text-red-500 hover:border-red-500' },
    high:   { label: 'High',   active: 'bg-orange-500 border-orange-500 text-white shadow-orange-500/30', inactive: 'bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-900/50 text-orange-500 hover:border-orange-500' },
    medium: { label: 'Medium', active: 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-600/20', inactive: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-500' },
    low:    { label: 'Low',    active: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20', inactive: 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 hover:border-emerald-500' },
};

// ─── Main Component ────────────────────────────────────────────────────────────
const CalendarView = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isAgendaOpen, setIsAgendaOpen] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskProjectId, setNewTaskProjectId] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    
    const queryClient = useQueryClient();
    const monthKey = format(currentMonth, 'yyyy-MM');
    const { workspace } = useWorkspaceStore();

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const { data, isLoading } = useQuery({
        queryKey: ['calendar', workspace?.slug, monthKey],
        queryFn: async () => {
            const res = await taskService.getCalendar(monthKey);
            const tasksData = res.data?.data?.tasks || [];
            return tasksData;
        },
        enabled: !!workspace?.slug
    });

    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectService.getAll(),
        enabled: showCreateModal
    });

    const projects = projectsData?.data?.data?.projects || [];
    const tasks = data || [];
    
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return tasks;
        const q = searchQuery.toLowerCase();
        return tasks.filter(t => 
            t.title.toLowerCase().includes(q) || 
            t.project?.name?.toLowerCase().includes(q) ||
            t.tags?.some(tag => tag.toLowerCase().includes(q))
        );
    }, [tasks, searchQuery]);

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        const arr = [];
        let d = start;
        while (d <= end) { arr.push(d); d = addDays(d, 1); }
        return arr;
    }, [currentMonth]);

    const { pendingDayTasks, completedDayTasks } = useMemo(() => {
        const selDate = startOfDay(selectedDate);
        const dayTasks = filteredTasks.filter(t => {
            if (!t.dueDate) return false;
            const d = startOfDay(typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate));
            return isSameDay(d, selDate);
        });
        return {
            pendingDayTasks: dayTasks.filter(t => t.status !== 'done'),
            completedDayTasks: dayTasks.filter(t => t.status === 'done')
        };
    }, [filteredTasks, selectedDate]);

    const totalDayTasks = pendingDayTasks.length + completedDayTasks.length;
    const agendaCompletionPct = totalDayTasks > 0 ? Math.round((completedDayTasks.length / totalDayTasks) * 100) : 0;

    const createMutation = useMutation({
        mutationFn: (data) => taskService.create(data.projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['calendar', workspace?.slug, monthKey]);
            setShowCreateModal(false);
            setNewTaskTitle('');
            toast.success('Task scheduled');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create task');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ projectId, taskId, status }) => taskService.updateStatus(projectId, taskId, status),
        onSuccess: () => {
            queryClient.invalidateQueries(['calendar', workspace?.slug, monthKey]);
        }
    });

    const handleCreateTask = () => {
        if (!newTaskTitle.trim()) return toast.error('Enter a title');
        if (!newTaskProjectId) return toast.error('Select a project');
        
        createMutation.mutate({
            title: newTaskTitle.trim(),
            projectId: newTaskProjectId,
            priority: newTaskPriority,
            dueDate: selectedDate.toISOString(),
            status: 'todo'
        });
    };

    const handleToggleStatus = (e, task) => {
        e.stopPropagation();
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        updateStatusMutation.mutate({ 
            projectId: task.projectId, 
            taskId: task.id, 
            status: newStatus 
        });
    };

    const handleDragEnd = async ({ active, over }) => {
        if (!over) return;
        const task = active.data.current?.task;
        if (!task || !task.projectId) return;
        const newDate = parseISO(over.id);
        const oldDate = startOfDay(typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate));
        if (isSameDay(oldDate, startOfDay(newDate))) return;

        try {
            await taskService.updateDueDate(task.projectId, task.id, { 
                dueDate: newDate.toISOString(), 
                hasDueTime: task.hasDueTime 
            });
            toast.success('Task rescheduled');
            queryClient.invalidateQueries(['calendar', workspace?.slug, monthKey]);
            queryClient.invalidateQueries(['tasks', task.projectId]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rescheduling failed');
        }
    };

    return (
        <PageWrapper title="Schedule">
            <div className="h-full flex flex-col md:flex-row bg-slate-50/50 dark:bg-slate-950/20 overflow-hidden">
                
                {/* ── Main Calendar (Left) ─────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* Cinematic Header */}
                    <div className="relative px-4 md:px-6 py-5 overflow-hidden border-b border-slate-200/40 dark:border-slate-800/40">
                        {/* Gradient background mesh */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white/40 to-violet-50/60 dark:from-indigo-950/30 dark:via-slate-900/50 dark:to-violet-950/20 pointer-events-none" />
                        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-indigo-400/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-violet-400/10 dark:bg-violet-500/10 blur-3xl pointer-events-none" />

                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className="relative group">
                                    <div className="absolute inset-0 rounded-2xl bg-indigo-500/30 blur-lg group-hover:blur-xl transition-all duration-500" />
                                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <CalendarIcon className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                <div>
                                    <motion.h2 
                                        key={monthKey}
                                        initial={{ y: -8, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-2xl font-black hero-gradient-text tracking-tighter uppercase leading-none"
                                    >
                                        {format(currentMonth, 'MMMM yyyy')}
                                    </motion.h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                            {tasks.length} Tasks
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Search schedule..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-44 backdrop-blur"
                                    />
                                </div>

                                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/60 backdrop-blur p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <button 
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all hover:text-indigo-600"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setCurrentMonth(new Date())} 
                                        className="px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                                    >
                                        Today
                                    </button>
                                    <button 
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all hover:text-indigo-600"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                <button 
                                    onClick={() => setIsAgendaOpen(!isAgendaOpen)}
                                    className={cn(
                                        "p-2 rounded-xl border transition-all",
                                        isAgendaOpen 
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 shadow-sm" 
                                            : "bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                                    )}
                                    title={isAgendaOpen ? "Close Agenda" : "Open Agenda"}
                                >
                                    <PanelRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0 overflow-hidden">
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                {/* Day-of-week labels */}
                                <div className="grid grid-cols-7 mb-3">
                                    {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                                        <div 
                                            key={d} 
                                            className={cn(
                                                'text-[10px] font-black text-center uppercase tracking-[0.15em] py-2 transition-colors',
                                                (i === 0 || i === 6) 
                                                    ? 'text-indigo-400/70 dark:text-indigo-500/70' 
                                                    : 'text-slate-400 dark:text-slate-600'
                                            )}
                                        >
                                            {window.innerWidth < 768 ? d.slice(0, 3) : d}
                                        </div>
                                    ))}
                                </div>

                                {/* Day cells */}
                                {isLoading ? (
                                    <CalendarSkeleton />
                                ) : (
                                    <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto custom-scrollbar pr-1">
                                        {days.map((day) => (
                                            <DayCell 
                                                key={day.toISOString()} 
                                                date={day} 
                                                tasks={filteredTasks} 
                                                currentMonth={currentMonth} 
                                                onTaskClick={setSelectedTask}
                                                isSelected={isSameDay(startOfDay(day), startOfDay(selectedDate))}
                                                onSelectDay={setSelectedDate}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </DndContext>
                    </div>
                </div>

                {/* ── Agenda Sidebar (Right) ────────────────────────── */}
                <AnimatePresence>
                    {isAgendaOpen && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0, x: 20 }}
                            animate={{ width: window.innerWidth < 768 ? '100%' : 380, opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-2xl z-10"
                        >
                            {/* Sidebar Header — Cinematic */}
                            <div className="relative p-6 border-b border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                                {/* Gradient bg */}
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-900/80 dark:via-indigo-950/20 dark:to-slate-900/80 pointer-events-none" />
                                <div className="absolute -top-6 right-0 w-32 h-32 rounded-full bg-indigo-400/10 dark:bg-indigo-500/8 blur-3xl pointer-events-none" />

                                <button 
                                    onClick={() => setIsAgendaOpen(false)}
                                    className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors z-10"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="relative">
                                    {/* Label row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600" />
                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Agenda</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mr-6">
                                            {format(selectedDate, 'MMM d, yyyy')}
                                        </span>
                                    </div>

                                    {/* Day name */}
                                    <motion.h3 
                                        key={selectedDate.toDateString()}
                                        initial={{ y: -6, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-2xl font-black hero-gradient-text uppercase tracking-tighter mb-3"
                                    >
                                        {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                                    </motion.h3>

                                    {/* Completion progress bar */}
                                    {totalDayTasks > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                                                <span className={cn(
                                                    "text-[10px] font-black",
                                                    agendaCompletionPct === 100 ? 'text-emerald-600' : 'text-indigo-600'
                                                )}>
                                                    {agendaCompletionPct}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-slate-700/40 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${agendaCompletionPct}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        agendaCompletionPct === 100 
                                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                                            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Mini Stats */}
                                    <div className="flex gap-2">
                                        <div className="flex-1 glass-inset p-2.5 rounded-xl">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active</div>
                                            <div className="text-lg font-black text-orange-500 leading-none">{pendingDayTasks.length}</div>
                                        </div>
                                        <div className="flex-1 glass-inset p-2.5 rounded-xl">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Done</div>
                                            <div className="text-lg font-black text-emerald-600 leading-none">{completedDayTasks.length}</div>
                                        </div>
                                        <div className="flex-1 glass-inset p-2.5 rounded-xl">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</div>
                                            <div className="text-lg font-black text-slate-700 dark:text-slate-300 leading-none">{totalDayTasks}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Task List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                                {/* Pending Section */}
                                {pendingDayTasks.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                            <Target className="w-3 h-3 text-orange-500" /> 
                                            <span>In Progress</span>
                                            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-[9px]">{pendingDayTasks.length}</span>
                                        </h4>
                                        {pendingDayTasks.map(task => (
                                            <motion.div
                                                key={task.id}
                                                layoutId={`agenda-task-${task.id}`}
                                                onClick={() => setSelectedTask(task)}
                                                className="group relative p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 hover:border-indigo-400/50 dark:hover:border-indigo-700/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:shadow-indigo-500/5 overflow-hidden border-holographic"
                                            >
                                                {/* Project color left stripe */}
                                                <div 
                                                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-70" 
                                                    style={{ backgroundColor: task.project?.color || '#6366f1' }} 
                                                />
                                                <div className="flex items-start gap-3 pl-2">
                                                    <button 
                                                        onClick={(e) => handleToggleStatus(e, task)}
                                                        className="mt-0.5 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                                                    >
                                                        <Circle className="w-5 h-5" />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.project?.color || '#6366f1' }} />
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                                                                    {task.project?.name}
                                                                </span>
                                                            </div>
                                                            {task.assignee && <Avatar user={task.assignee} size="xs" />}
                                                        </div>
                                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {task.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                                <Clock className="w-3 h-3" />
                                                                {task.hasDueTime ? format(parseISO(task.dueDate), 'h:mm a') : 'Anytime'}
                                                            </div>
                                                            <div className={cn(
                                                                "badge",
                                                                task.priority === 'urgent' ? 'priority-urgent' :
                                                                task.priority === 'high'   ? 'priority-high' :
                                                                task.priority === 'low'    ? 'priority-low' : 'priority-medium'
                                                            )}>
                                                                {task.priority}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Completed Section */}
                                {completedDayTasks.length > 0 && (
                                    <div className="space-y-2 opacity-60 hover:opacity-80 transition-opacity">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 
                                            <span>Completed</span>
                                            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-[9px]">{completedDayTasks.length}</span>
                                        </h4>
                                        {completedDayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTask(task)}
                                                className="group p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/20 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => handleToggleStatus(e, task)}
                                                        className="text-emerald-500 hover:text-emerald-600 transition-colors shrink-0"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 line-through truncate">
                                                            {task.title}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty State */}
                                {pendingDayTasks.length === 0 && completedDayTasks.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                        <motion.div
                                            animate={{ y: [0, -8, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                            className="w-20 h-20 rounded-3xl glass-inset flex items-center justify-center mb-4"
                                        >
                                            <Sparkles className="w-10 h-10 text-indigo-300 dark:text-indigo-600" />
                                        </motion.div>
                                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Free Day</h4>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">No tasks scheduled</p>
                                        <button 
                                            onClick={() => setShowCreateModal(true)}
                                            className="mt-4 text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                                        >
                                            + Add a task
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Bottom CTA */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
                                <button 
                                    onClick={() => setShowCreateModal(true)}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> 
                                    Add Task for {format(selectedDate, 'MMM d')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Quick Create Modal ─────────────────────────────── */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={`Schedule Task`}>
                <div className="space-y-4">
                    {/* Selected date pill */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-800/40">
                        <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </span>
                    </div>

                    <Input 
                        label="Task Title" 
                        placeholder="e.g. Weekly Review" 
                        value={newTaskTitle} 
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        autoFocus
                    />
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</label>
                        <select 
                            value={newTaskProjectId} 
                            onChange={(e) => setNewTaskProjectId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        >
                            <option value="">Select a project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['low', 'medium', 'high', 'urgent'].map(p => {
                                const cfg = priorityConfig[p];
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setNewTaskPriority(p)}
                                        className={cn(
                                            "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm hover:scale-105 active:scale-95",
                                            newTaskPriority === p ? cfg.active : cfg.inactive
                                        )}
                                    >
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" fullWidth onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button 
                            fullWidth 
                            isLoading={createMutation.isPending} 
                            disabled={!newTaskTitle || !newTaskProjectId}
                            onClick={handleCreateTask}
                        >
                            Schedule Task
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── Task Detail Panel ─────────────────────────────── */}
            <AnimatePresence>
                {selectedTask && (
                    <Suspense fallback={null}>
                        <TaskDetailPanel
                            task={selectedTask}
                            projectId={selectedTask.projectId}
                            onClose={() => setSelectedTask(null)}
                            onTaskSelect={setSelectedTask}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
        </PageWrapper>
    );
};

export default CalendarView;
