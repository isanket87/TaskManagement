import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
    isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDraggable, useDroppable, DndContext } from '@dnd-kit/core';
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
        <div ref={setNodeRef} {...listeners} {...attributes}
            className={cn('text-xs px-2 py-0.5 rounded-full truncate cursor-grab active:cursor-grabbing mb-0.5', className, isDragging && 'opacity-50')}
            style={{ maxWidth: '100%' }}
            title={task.title}
        >
            {task.title}
        </div>
    );
};

const DayCell = ({ date, tasks, currentMonth, onDrop }) => {
    const { setNodeRef, isOver } = useDroppable({ id: date.toISOString() });
    const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), date));

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'border border-gray-200 dark:border-gray-800 min-h-[100px] p-1 rounded-lg transition-colors',
                !isSameMonth(date, currentMonth) && 'opacity-40',
                isToday(date) && 'bg-primary-50 dark:bg-primary-950/30 border-primary-300 dark:border-primary-700',
                isOver && 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700',
            )}
        >
            <div className={cn('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1', isToday(date) && 'bg-primary-600 text-white')}>
                {format(date, 'd')}
            </div>
            {dayTasks.slice(0, 3).map((t) => <TaskPill key={t.id} task={t} />)}
            {dayTasks.length > 3 && <div className="text-xs text-gray-400 px-1">+{dayTasks.length - 3} more</div>}
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
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day) => (
                            <DayCell key={day.toISOString()} date={day} tasks={tasks} currentMonth={currentMonth} />
                        ))}
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
