import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    format, addDays, startOfToday, differenceInDays, isSameDay, startOfWeek, endOfWeek, isBefore,
} from 'date-fns';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';
import EmptyState from '../ui/EmptyState';
import { CalendarRange } from 'lucide-react';

const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case 'high': return 'bg-orange-500 border-orange-600 text-orange-50';
        case 'urgent': return 'bg-red-500 border-red-600 text-red-50';
        case 'medium': return 'bg-blue-500 border-blue-600 text-blue-50';
        case 'low': return 'bg-slate-400 border-slate-500 text-slate-50';
        default: return 'bg-indigo-500 border-indigo-600 text-indigo-50';
    }
};

const TimelineView = ({ tasks = [], onFocusChange }) => {
    const scrollContainerRef = useRef(null);
    const today = startOfToday();

    // 1. Separate scheduled and unscheduled tasks
    const { scheduled, unscheduled } = useMemo(() => {
        const sch = [];
        const unsch = [];
        tasks.forEach(t => {
            if (t.dueDate) sch.push(t);
            else unsch.push(t);
        });
        // Sort scheduled primarily by start (createdAt) then dueDate
        sch.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return { scheduled: sch, unscheduled: unsch };
    }, [tasks]);

    // 2. Compute date boundaries
    const dateRange = useMemo(() => {
        if (scheduled.length === 0) {
            // Default range: 1 week before today, 3 weeks after
            return {
                start: addDays(today, -7),
                end: addDays(today, 21),
                days: 29
            };
        }

        let minDate = today;
        let maxDate = today;

        scheduled.forEach(t => {
            const start = new Date(t.createdAt);
            const end = new Date(t.dueDate);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });

        // Add buffers (7 days before, 14 days after current min/max)
        const timelineStart = addDays(minDate, -7);
        const timelineEnd = addDays(maxDate, 14);
        
        return {
            start: timelineStart,
            end: timelineEnd,
            days: differenceInDays(timelineEnd, timelineStart) + 1
        };
    }, [scheduled, today]);

    // 3. Generate Timeline Dates Array
    const timelineDays = useMemo(() => {
        const arr = [];
        for (let i = 0; i < dateRange.days; i++) {
            arr.push(addDays(dateRange.start, i));
        }
        return arr;
    }, [dateRange]);

    // Auto-scroll to today
    useEffect(() => {
        if (scrollContainerRef.current && timelineDays.length > 0) {
            const todayIndex = timelineDays.findIndex(d => isSameDay(d, today));
            if (todayIndex !== -1) {
                const dayWidth = 48; // px width per day
                const offset = todayIndex * dayWidth - (window.innerWidth / 2) + (dayWidth / 2);
                scrollContainerRef.current.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
            }
        }
    }, [timelineDays, today]);

    if (tasks.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <EmptyState icon={CalendarRange} title="No tasks for timeline" description="Add tasks with due dates to see them rendered here." />
            </div>
        );
    }

    const DAY_WIDTH = 48; // Define day cell width strictly

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
            
            {/* Scrollable Timeline Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto relative hide-scrollbar p-6">
                <div style={{ width: `${timelineDays.length * DAY_WIDTH}px`, position: 'relative' }}>
                    
                    {/* Background Grid & Header */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700/50 pb-2">
                        {timelineDays.map((day, i) => (
                            <div 
                                key={i} 
                                style={{ width: DAY_WIDTH }} 
                                className={cn(
                                    "flex flex-col items-center justify-end shrink-0 py-2 border-l border-slate-100 dark:border-slate-800/50 h-16",
                                    isSameDay(day, today) && "bg-indigo-50/50 dark:bg-indigo-900/20"
                                )}
                            >
                                <span className={cn("text-[10px] uppercase font-bold text-slate-400", isSameDay(day, today) && "text-indigo-500")}>
                                    {format(day, 'E')}
                                </span>
                                <span className={cn(
                                    "text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full",
                                    isSameDay(day, today) 
                                        ? "bg-indigo-500 text-white shadow-md" 
                                        : "text-slate-600 dark:text-slate-300"
                                )}>
                                    {format(day, 'd')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Today Line Indicator */}
                    {(() => {
                        const todayIndex = timelineDays.findIndex(d => isSameDay(d, today));
                        if (todayIndex > -1) {
                            return (
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/50 z-20 pointer-events-none"
                                    style={{ left: `${todayIndex * DAY_WIDTH + (DAY_WIDTH / 2)}px` }}
                                >
                                    <div className="absolute top-[68px] -left-1 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                </div>
                            );
                        }
                    })()}

                    {/* Timeline Tracks (Tasks) */}
                    <div className="mt-4 space-y-3 relative z-10 pb-12">
                        {scheduled.map((task, rowIndex) => {
                            const taskStart = new Date(task.createdAt);
                            const taskEnd = new Date(task.dueDate);
                            
                            // Bounds checking for rendering
                            const renderStart = isBefore(taskStart, dateRange.start) ? dateRange.start : taskStart;
                            
                            // Calculate position offsets
                            const startOffsetDays = differenceInDays(renderStart, dateRange.start);
                            const spanDays = Math.max(1, differenceInDays(taskEnd, renderStart)); // Minimum 1 day span
                            
                            const leftPos = startOffsetDays * DAY_WIDTH + (DAY_WIDTH / 4);
                            const widthPos = spanDays * DAY_WIDTH - (DAY_WIDTH / 2);

                            return (
                                <div key={task.id} className="relative h-10 w-full group">
                                    {/* Track line visual guidance */}
                                    <div className="absolute inset-0 border-b border-dashed border-slate-200/50 dark:border-slate-800 pointer-events-none" />
                                    
                                    {/* Task Gantt Bar */}
                                    <motion.div
                                        whileHover={{ scaleY: 1.05, filter: "brightness(1.1)" }}
                                        onClick={() => onFocusChange?.(task)}
                                        className={cn(
                                            "absolute top-1 bottom-1 rounded-xl shadow-sm border px-3 py-1 flex items-center justify-between cursor-pointer overflow-hidden transition-all",
                                            getPriorityColor(task.priority),
                                            task.status === 'done' && "opacity-50 saturate-50"
                                        )}
                                        style={{ 
                                            left: `${leftPos}px`, 
                                            width: `${widthPos}px`,
                                            minWidth: '100px' 
                                        }}
                                    >
                                        <div className="truncate text-xs font-semibold whitespace-nowrap">
                                            {task.title}
                                        </div>

                                        {task.assignee && (
                                            <div className="shrink-0 ml-2" title={task.assignee.name}>
                                                <Avatar user={task.assignee} size="xs" className="w-5 h-5 ring-2 ring-black/10" />
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            );
                        })}

                        {scheduled.length === 0 && (
                            <div className="text-center py-10 text-sm text-slate-500 italic">
                                No scheduled tasks to display on timeline.
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Unscheduled Tasks Dock */}
            {unscheduled.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-2xl rounded-2xl p-3 flex gap-4 max-w-full overflow-x-auto z-30">
                    <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unscheduled</span>
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">{unscheduled.length}</span>
                    </div>
                    {unscheduled.slice(0, 5).map(task => (
                        <div key={task.id} onClick={() => onFocusChange?.(task)} className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_OPTIONS.find(s => s.value === task.status)?.color || '#94a3b8' }} />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{task.title}</span>
                        </div>
                    ))}
                    {unscheduled.length > 5 && (
                        <div className="shrink-0 flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer">
                            +{unscheduled.length - 5} more
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TimelineView;
