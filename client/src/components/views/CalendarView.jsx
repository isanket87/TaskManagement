import { useState, useMemo, Suspense, lazy } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
    isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { useDraggable, useDroppable, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { getDueDateBadgeStyles } from '../../utils/dueDateUtils';
import { cn } from '../../utils/helpers';
import EmptyState from '../ui/EmptyState';
import Avatar from '../ui/Avatar';

const TaskDetailPanel = lazy(() => import('../shared/TaskDetailPanel'));

const TaskPill = ({ task, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
        id: task.id, 
        data: { task } 
    });
    
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const status = task.status === 'done' ? 'completed' : 
                   (task.dueDate && parseISO(task.dueDate) < new Date()) ? 'overdue' : 'on_track';
    const { className } = getDueDateBadgeStyles(status);

    return (
        <motion.div 
            layoutId={`task-project-${task.id}`}
            ref={setNodeRef} {...listeners} {...attributes}
            style={style}
            onClick={(e) => { e.stopPropagation(); onClick(task); }}
            className={cn(
                'group relative text-[9px] font-bold px-1.5 py-1 rounded-lg truncate cursor-grab active:cursor-grabbing mb-0.5 border shadow-sm transition-all flex items-center gap-1.5 overflow-hidden uppercase tracking-tighter', 
                className, 
                isDragging && 'opacity-50 scale-105 shadow-2xl z-[100] ring-2 ring-indigo-500 border-transparent'
            )}
            title={task.title}
        >
            <div className={cn("w-0.5 h-2.5 rounded-full shrink-0", 
                task.priority === 'urgent' ? 'bg-red-500' : 
                task.priority === 'high' ? 'bg-orange-500' : 
                task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
            )} />
            <span className="flex-1 truncate">{task.title}</span>
        </motion.div>
    );
};

const DayCell = ({ date, tasks, currentMonth, onTaskClick }) => {
    const { setNodeRef, isOver } = useDroppable({ id: date.toISOString() });
    const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), date));

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'relative group bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 min-h-[100px] md:min-h-[140px] p-1.5 rounded-2xl transition-all overflow-hidden flex flex-col',
                !isSameMonth(date, currentMonth) && 'opacity-25 bg-slate-50 dark:bg-slate-950',
                isToday(date) && 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800',
                isOver && 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 ring-2 ring-indigo-400 scale-[1.01] z-10 shadow-lg',
            )}
        >
            <div className={cn('text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full mb-1 cursor-default tracking-tighter', 
                isToday(date) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600'
            )}>
                {format(date, 'd')}
            </div>
            <div className="flex-1 space-y-0.5 relative z-10 w-full min-h-0">
                {dayTasks.map((t) => (
                    <TaskPill key={t.id} task={t} onClick={onTaskClick} />
                ))}
            </div>
        </div>
    );
};

const CalendarView = ({ tasks = [], onDueDateUpdate, projectId }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        const arr = [];
        let d = start;
        while (d <= end) { arr.push(d); d = addDays(d, 1); }
        return arr;
    }, [currentMonth]);

    const handleDragEnd = ({ active, over }) => {
        if (!over) return;
        const task = active.data.current?.task;
        if (!task) return;
        const newDate = parseISO(over.id);
        if (isSameDay(parseISO(task.dueDate), newDate)) return;
        
        onDueDateUpdate?.(task.id, newDate, task.hasDueTime);
    };

    if (tasks.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <EmptyState icon={CalendarIcon} title="No tasks for calendar" description="Tasks with due dates will appear here." />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col pt-2 gap-4">
            {/* Header / Controls */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <button 
                        onClick={() => setCurrentMonth(m => subMonths(m, 1))} 
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setCurrentMonth(new Date())} 
                        className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                        Today
                    </button>
                    <button 
                        onClick={() => setCurrentMonth(m => addMonths(m, 1))} 
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex-1 min-h-0 flex flex-col">
                    {/* Day labels */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-[10px] font-black text-center text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1">
                                {d}
                            </div>
                        ))}
                    </div>
                    {/* Grid */}
                    <div className="flex-1 min-h-0 grid grid-cols-7 gap-2 pb-4 overflow-y-auto custom-scrollbar">
                        {days.map((day) => (
                            <DayCell 
                                key={day.toISOString()} 
                                date={day} 
                                tasks={tasks} 
                                currentMonth={currentMonth} 
                                onTaskClick={setSelectedTask}
                            />
                        ))}
                    </div>
                </div>
            </DndContext>

            <AnimatePresence>
                {selectedTask && (
                    <Suspense fallback={null}>
                        <TaskDetailPanel
                            task={selectedTask}
                            projectId={projectId || selectedTask.projectId}
                            onClose={() => setSelectedTask(null)}
                            onTaskSelect={setSelectedTask}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarView;
