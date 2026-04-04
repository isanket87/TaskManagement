import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, Suspense, lazy, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
    isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths, startOfDay
} from 'date-fns';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, 
    Clock, ListTodo, Plus, Search, Filter, MoreHorizontal, X, AlertCircle,
    CheckCircle2, Circle, Layout, Target, ArrowRight, Kanban, PanelRight
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
    const status = task.status === 'done' ? 'completed' : 
                   (taskDate && taskDate < new Date()) ? 'overdue' : 'on_track';
    const { className } = getDueDateBadgeStyles(status);

    return (
        <motion.div 
            layoutId={`task-${task.id}`}
            ref={setNodeRef} {...listeners} {...attributes}
            style={style}
            onClick={(e) => { e.stopPropagation(); onClick(task); }}
            className={cn(
                'group relative text-[9px] font-bold px-1.5 py-1 rounded-lg truncate cursor-grab active:cursor-grabbing mb-0.5 border shadow-sm transition-all flex items-center gap-1 overflow-hidden select-none', 
                className, 
                isDragging && 'opacity-50 scale-105 shadow-2xl z-[100] ring-2 ring-indigo-500 border-transparent'
            )}
        >
            <div 
                className="w-0.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: task.project?.color || '#6366f1' }}
            />
            <span className="flex-1 truncate uppercase tracking-tighter">{task.title}</span>
        </motion.div>
    );
};

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

    return (
        <div
            ref={setNodeRef}
            onClick={() => onSelectDay(date)}
            className={cn(
                'relative group bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 min-h-[100px] md:min-h-[140px] p-2 rounded-2xl transition-all overflow-hidden flex flex-col h-full cursor-pointer',
                !isSameMonth(date, currentMonth) && 'opacity-20 grayscale-[0.5]',
                isToday(date) && 'ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-800/50',
                isSelected && 'bg-indigo-50/80 dark:bg-indigo-900/30 border-indigo-400 ring-2 ring-indigo-400 z-[5]',
                isOver && 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-500 ring-2 ring-indigo-500 scale-[1.01] z-[6] shadow-2xl',
                !isSelected && !isOver && 'hover:bg-white dark:hover:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-900/50'
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={cn('text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-all', 
                    isToday(date) ? 'bg-indigo-600 text-white shadow-lg' : 
                    isSelected ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200' :
                    'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600'
                )}>
                    {format(date, 'd')}
                </div>
                {dayTasks.length > 0 && (
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                    </div>
                )}
            </div>
            
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
        </div>
    );
};

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
                {/* Main Calendar View (Left) */}
                <div className="flex-1 p-4 md:p-6 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <CalendarIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                                    {format(currentMonth, 'MMMM yyyy')}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                        {tasks.length} Active Tasks
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search schedule..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-48"
                                />
                            </div>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600">Today</button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                            <button 
                                onClick={() => setIsAgendaOpen(!isAgendaOpen)}
                                className={cn(
                                    "p-2 rounded-xl border transition-all",
                                    isAgendaOpen 
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600" 
                                        : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-500"
                                )}
                                title={isAgendaOpen ? "Close Agenda" : "Open Agenda"}
                            >
                                <PanelRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="grid grid-cols-7 mb-2">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                                    <div key={d} className="text-[10px] font-black text-center text-slate-400 dark:text-slate-600 uppercase tracking-widest py-2">
                                        {window.innerWidth < 768 ? d.slice(0, 3) : d}
                                    </div>
                                ))}
                            </div>
                            
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
                        </div>
                    </DndContext>
                </div>

                {/* Side Bar Detail Panel (Right, Closable) */}
                <AnimatePresence>
                    {isAgendaOpen && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0, x: 20 }}
                            animate={{ width: window.innerWidth < 768 ? '100%' : 380, opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-2xl z-10"
                        >
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md relative">
                                <button 
                                    onClick={() => setIsAgendaOpen(false)}
                                    className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Kanban className="w-4 h-4 text-indigo-600" />
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Agenda</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mr-6">{format(selectedDate, 'MMM d, yyyy')}</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                                </h3>

                                {/* Mini Stats */}
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active</div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{pendingDayTasks.length}</div>
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Done</div>
                                        <div className="text-lg font-black text-emerald-600 leading-none">{completedDayTasks.length}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                                {/* Pending Section */}
                                {pendingDayTasks.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                            <Target className="w-3 h-3" /> In Progress
                                        </h4>
                                        {pendingDayTasks.map(task => (
                                            <motion.div
                                                key={task.id}
                                                layoutId={`agenda-task-${task.id}`}
                                                onClick={() => setSelectedTask(task)}
                                                className="group p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <button 
                                                        onClick={(e) => handleToggleStatus(e, task)}
                                                        className="mt-0.5 text-slate-300 hover:text-indigo-600 transition-colors"
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
                                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">
                                                            {task.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                                <Clock className="w-3 h-3" />
                                                                {task.hasDueTime ? format(parseISO(task.dueDate), 'h:mm a') : 'Anytime'}
                                                            </div>
                                                            <div className={cn(
                                                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                                                task.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                                                                task.priority === 'high' ? 'bg-orange-50 text-orange-600' :
                                                                'bg-slate-100 text-slate-500'
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
                                    <div className="space-y-3 opacity-60">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Completed</h4>
                                        {completedDayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTask(task)}
                                                className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-800/20 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => handleToggleStatus(e, task)}
                                                        className="text-emerald-500"
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

                                {pendingDayTasks.length === 0 && completedDayTasks.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50 grayscale">
                                        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                            <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Free Day</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No tasks for this date</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                                <button 
                                    onClick={() => setShowCreateModal(true)}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Task for {format(selectedDate, 'MMM d')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick Create Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={`Schedule Task for ${format(selectedDate, 'MMM d')}`}>
                <div className="space-y-4">
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

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['low', 'medium', 'high', 'urgent'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setNewTaskPriority(p)}
                                    className={cn(
                                        "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                                        newTaskPriority === p 
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-500"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
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
