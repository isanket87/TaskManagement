const { isAfter, isBefore, addHours, startOfDay, endOfDay } = require('date-fns');

/**
 * Computes the due date status for a task
 * @param {Date|null} dueDate
 * @param {string} taskStatus
 * @returns {string} status
 */
const computeDueDateStatus = (dueDate, taskStatus) => {
    if (taskStatus === 'done') return 'completed';
    if (!dueDate) return 'none';

    const now = new Date();
    const due = new Date(dueDate);

    if (isBefore(due, now)) return 'overdue';

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    if (due >= todayStart && due <= todayEnd) return 'due_today';

    const threeDaysFromNow = addHours(now, 72);
    if (isBefore(due, threeDaysFromNow)) return 'due_soon';

    return 'on_track';
};

/**
 * Determines if a specific reminder should be sent for a task
 * @param {object} task
 * @param {string} reminderType - 'overdue' | 'due_24h' | 'due_1h' | 'due_today'
 * @returns {boolean}
 */
const shouldSendReminder = (task, reminderType) => {
    if (!task.dueDate) return false;
    if (task.remindersSent && task.remindersSent.includes(reminderType)) return false;
    if (task.status === 'done') return false;

    const now = new Date();
    const due = new Date(task.dueDate);

    // Check snooze
    if (task.snoozedUntil && new Date(task.snoozedUntil) > now) return false;

    switch (reminderType) {
        case 'overdue':
            return isBefore(due, now);
        case 'due_24h': {
            const h23 = addHours(now, 23);
            const h25 = addHours(now, 25);
            return due >= h23 && due <= h25;
        }
        case 'due_1h': {
            const m45 = addHours(now, 0.75);
            const m75 = addHours(now, 1.25);
            return due >= m45 && due <= m75;
        }
        case 'due_today': {
            const todayStart = startOfDay(now);
            const todayEnd = endOfDay(now);
            return due >= todayStart && due <= todayEnd;
        }
        default:
            return false;
    }
};

module.exports = { computeDueDateStatus, shouldSendReminder };
