import {
    format, formatDistanceToNow, isToday, isTomorrow, isPast, isWithinInterval,
    addHours, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek,
    differenceInMinutes, differenceInHours, differenceInDays,
} from 'date-fns';

/**
 * Computes due date status for a task
 */
export const getDueDateStatus = (dueDate, taskStatus) => {
    if (taskStatus === 'done') return 'completed';
    if (!dueDate) return 'none';

    const due = new Date(dueDate);
    const now = new Date();

    if (isPast(due)) return 'overdue';
    if (isToday(due)) return 'due_today';
    if (isWithinInterval(due, { start: now, end: addDays(now, 3) })) return 'due_soon';
    return 'on_track';
};

/**
 * Formats due date for display
 */
export const formatDueDate = (dueDate, hasDueTime = false) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);

    if (isToday(due)) return hasDueTime ? `Today at ${format(due, 'h:mm a')}` : 'Today';
    if (isTomorrow(due)) return hasDueTime ? `Tomorrow at ${format(due, 'h:mm a')}` : 'Tomorrow';

    const year = due.getFullYear();
    const nowYear = new Date().getFullYear();
    if (hasDueTime) {
        return year !== nowYear ? format(due, 'MMM d, yyyy h:mm a') : format(due, 'MMM d, h:mm a');
    }
    return year !== nowYear ? format(due, 'MMM d, yyyy') : format(due, 'MMM d');
};

/**
 * Returns a relative time label for due dates
 */
export const getRelativeTimeLabel = (dueDate) => {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const now = new Date();

    if (due < now) {
        const minutesAgo = differenceInMinutes(now, due);
        const hoursAgo = differenceInHours(now, due);
        const daysAgo = differenceInDays(now, due);

        if (minutesAgo < 60) return `Overdue by ${minutesAgo}m`;
        if (hoursAgo < 24) return `Overdue by ${hoursAgo}h`;
        if (daysAgo === 1) return 'Overdue by 1 day';
        if (daysAgo < 7) return `Overdue by ${daysAgo} days`;
        if (daysAgo < 30) return `Overdue by ${Math.round(daysAgo / 7)} weeks`;
        return `Overdue by ${Math.round(daysAgo / 30)} months`;
    }

    const minutesLeft = differenceInMinutes(due, now);
    const hoursLeft = differenceInHours(due, now);
    const daysLeft = differenceInDays(due, now);

    if (minutesLeft < 60) return `Due in ${minutesLeft}m`;
    if (hoursLeft < 24 && isToday(due)) {
        return `Due today at ${format(due, 'h:mm a')}`;
    }
    if (isTomorrow(due)) return `Due tomorrow at ${format(due, 'h:mm a')}`;
    if (daysLeft < 7) return `Due in ${daysLeft} days`;
    return `Due ${format(due, 'MMM d')}`;
};

/**
 * Returns Tailwind class names for a due date status badge
 */
export const getDueDateBadgeStyles = (status) => {
    switch (status) {
        case 'overdue':
            return { className: 'due-overdue overdue-pulse', icon: '🔴' };
        case 'due_today':
            return { className: 'due-today', icon: '🔵' };
        case 'due_soon':
            return { className: 'due-soon', icon: '🟡' };
        case 'on_track':
            return { className: 'due-on-track', icon: '🟢' };
        case 'completed':
            return { className: 'due-completed', icon: '✅' };
        default:
            return { className: 'due-none', icon: '⚪' };
    }
};

/**
 * Groups tasks by due date category
 */
export const groupTasksByDueDate = (tasks) => {
    const now = new Date();
    const result = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [], none: [] };

    tasks.forEach((task) => {
        if (!task.dueDate) {
            result.none.push(task);
            return;
        }
        const due = new Date(task.dueDate);
        if (task.status === 'done') return; // skip done tasks
        if (isPast(due)) result.overdue.push(task);
        else if (isToday(due)) result.today.push(task);
        else if (isTomorrow(due)) result.tomorrow.push(task);
        else if (isWithinInterval(due, { start: now, end: endOfWeek(now) })) result.thisWeek.push(task);
        else result.later.push(task);
    });

    return result;
};

/**
 * Sorts tasks by due date
 */
export const sortTasksByDueDate = (tasks, direction = 'asc') => {
    return [...tasks].sort((a, b) => {
        if (direction === 'overdue_first') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            const aStatus = getDueDateStatus(a.dueDate, a.status);
            const bStatus = getDueDateStatus(b.dueDate, b.status);
            if (aStatus === 'overdue' && bStatus !== 'overdue') return -1;
            if (bStatus === 'overdue' && aStatus !== 'overdue') return 1;
        }
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const diff = new Date(a.dueDate) - new Date(b.dueDate);
        return direction === 'desc' ? -diff : diff;
    });
};

/**
 * Returns a Date object for a snooze option
 */
export const getSnoozeTimestamp = (option) => {
    const now = new Date();
    switch (option) {
        case '1h': return addHours(now, 1);
        case '3h': return addHours(now, 3);
        case 'tomorrow': {
            const tomorrow = addDays(startOfDay(now), 1);
            tomorrow.setHours(9, 0, 0, 0);
            return tomorrow;
        }
        case 'next_week': {
            const nextWeek = addDays(startOfWeek(now), 8);
            nextWeek.setHours(9, 0, 0, 0);
            return nextWeek;
        }
        default: return addHours(now, 1);
    }
};
