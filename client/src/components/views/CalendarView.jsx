import { useState, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
    isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useDraggable, useDroppable, DndContext } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { getDueDateBadgeStyles } from '../../utils/dueDateUtils';
import { cn } from '../../utils/helpers';
import EmptyState from '../ui/EmptyState';

const TaskPill = ({ task }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
        id: task.id, 
        data: { task } 
    });
    
    const status = task.status === 'done' ? 'completed' : 
                   (task.dueDate && parseISO(task.dueDate) < new Date()) ? 'overdue' : 'on_track';
    const { className } = getDueDateBadgeStyles(status);

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            ref={setNodeRef} {...listeners} {...attributes}
            className={cn(
                'text-[10px] font-bold px-2 py-1 rounded-lg truncate cursor-grab active:cursor-grabbing mb-1 border shadow-sm transition-all uppercase tracking-tight', 
                className, 
                isDragging && 'opacity-50 scale-105 shadow-md z-50'
            )}
            style={{ maxWidth: '100%' }}
            title={task.title}
        >
            {task.title}
        </motion.div>
    );
};

const DayCell = ({ date, tasks, currentMonth }) => {
    const { setNodeRef, isOver } = useDroppable({ id: date.toISOString() });
    const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), date));

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'relative group bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 min-h-[100px] md:min-h-[140px] p-2 rounded-2xl transition-all overflow-hidden',
                !isSameMonth(date, currentMonth) && 'opacity-25 bg-slate-50 dark:bg-slate-950',
                isToday(date) && 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800',
                isOver && 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 ring-2 ring-indigo-400 scale-[1.01] z-10 shadow-lg',
            )}
        >
            <div className={cn('text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full mb-1 cursor-default tracking-tighter', 
                isToday(date) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            )}>
                {format(date, 'd')}
            </div>
            <div className="space-y-1 relative z-10 w-full">
                {dayTasks.slice(0, 4).map((t) => <TaskPill key={t.id} task={t} />)}
                {dayTasks.length > 4 && (
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 px-1 mt-1 uppercase tracking-widest">
                        +{dayTasks.length - 4} more
                    </div>
                )}
            </div>
        </div>
    );
};

const CalendarView = ({ tasks = [], onDueDateUpdate }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

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
        
        onDueDateUpdate?.(task, newDate, task.hasDueTime);
    };

    if (tasks.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <EmptyState icon={CalendarIcon} title="No tasks for calendar" description="Tasks with due dates will appear here." />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col pt-2">
            {/* Header / Controls */}
            <div className="flex items-center justify-between mb-4 px-1">
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
                        className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600"
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

            <DndContext onDragEnd={handleDragEnd}>
                <div className="flex-1 min-h-0 flex flex-col">
                    {/* Day labels */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-[10px] font-black text-center text-slate-400 uppercase tracking-widest py-1">
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
                            />
                        ))}
                    </div>
                </div>
            </DndContext>
        </div>
    );
};

export default CalendarView;
