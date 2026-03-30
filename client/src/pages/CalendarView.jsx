import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
    isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDraggable, useDroppable, DndContext } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import PageWrapper from '../components/layout/PageWrapper';
import { taskService } from '../services/taskService';
import { getDueDateBadgeStyles } from '../utils/dueDateUtils';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';
import useWorkspaceStore from '../store/workspaceStore';

const TaskPill = ({ task }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
    const { className } = getDueDateBadgeStyles(task.dueDateStatus || 'on_track');
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            ref={setNodeRef} {...listeners} {...attributes}
            className={cn('text-[11px] font-medium px-2 py-1 rounded-lg truncate cursor-grab active:cursor-grabbing mb-1 border shadow-sm transition-all', className, isDragging && 'opacity-50 scale-105 shadow-md z-50')}
            style={{ maxWidth: '100%' }}
            title={task.title}
        >
            {task.title}
        </motion.div>
    );
};

const DayCell = ({ date, tasks, currentMonth, onDrop }) => {
    const { setNodeRef, isOver } = useDroppable({ id: date.toISOString() });
    const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), date));

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'relative group bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 min-h-[120px] p-2 rounded-2xl transition-all overflow-hidden',
                !isSameMonth(date, currentMonth) && 'opacity-30',
                isToday(date) && 'ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
                isOver && 'bg-green-50/80 dark:bg-green-900/40 border-green-400 ring-2 ring-green-400 scale-[1.02] z-10 shadow-lg',
            )}
        >
            {/* Hover Glow */}
            {!isToday(date) && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />}
            
            <div className={cn('text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 cursor-default', 
                isToday(date) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            )}>
                {format(date, 'd')}
            </div>
            <div className="space-y-1 relative z-10 w-full">
                {dayTasks.slice(0, 3).map((t) => <TaskPill key={t.id} task={t} />)}
                {dayTasks.length > 3 && <div className="text-[10px] font-bold text-slate-400 px-1 mt-1">+{dayTasks.length - 3} more</div>}
            </div>
        </div>
    );
};

const CalendarView = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const monthKey = format(currentMonth, 'yyyy-MM');
    const workspace = useWorkspaceStore(s => s.workspace);

    const { data, refetch } = useQuery({
        queryKey: ['calendar', workspace?.slug, monthKey],
        queryFn: () => taskService.getCalendar(monthKey),
    });

    const tasks = data?.data?.data?.tasks || [];

    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }

    const handleDragEnd = async ({ active, over }) => {
        if (!over) return;
        const task = active.data.current?.task;
        if (!task || !task.projectId) return;
        const newDate = parseISO(over.id);
        try {
            await taskService.updateDueDate(task.projectId, task.id, { dueDate: newDate.toISOString(), hasDueTime: false });
            toast.success('Due date updated');
            refetch();
        } catch {
            toast.error('Failed to update due date');
        }
    };

    return (
        <PageWrapper title="Calendar">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{format(currentMonth, 'MMMM yyyy')}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="btn btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setCurrentMonth(new Date())} className="btn btn-secondary btn-sm">Today</button>
                        <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="btn btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <DndContext onDragEnd={handleDragEnd}>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-xs font-semibold text-center text-gray-500 dark:text-gray-400 py-2">{d}</div>
                        ))}
                    </div>
                    {/* Calendar grid */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-2 md:p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.1)]">
                        <div className="grid grid-cols-7 gap-2 md:gap-3">
                            {days.map((day) => (
                                <DayCell key={day.toISOString()} date={day} tasks={tasks} currentMonth={currentMonth} />
                            ))}
                        </div>
                    </div>
                </DndContext>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-200" /> Overdue</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-200" /> Today</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-200" /> Soon</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-200" /> On Track</div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default CalendarView;
