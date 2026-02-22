export const PRIORITY_OPTIONS = [
    { value: 'critical', label: 'Critical', color: '#ef4444' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'medium', label: 'Medium', color: '#eab308' },
    { value: 'low', label: 'Low', color: '#22c55e' },
];

export const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'in_review', label: 'In Review' },
    { value: 'done', label: 'Done' },
];

export const KANBAN_COLUMNS = [
    { id: 'todo', title: 'To Do', color: '#6b7280' },
    { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
    { id: 'in_review', title: 'In Review', color: '#8b5cf6' },
    { id: 'done', title: 'Done', color: '#10b981' },
];

export const PROJECT_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#10b981',
    '#06b6d4', '#3b82f6',
];

export const SNOOZE_OPTIONS = [
    { value: '1h', label: '1 hour' },
    { value: '3h', label: '3 hours' },
    { value: 'tomorrow', label: 'Tomorrow morning' },
    { value: 'next_week', label: 'Next week' },
];

export const DUE_DATE_FILTER_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Due Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'no_date', label: 'No Date' },
];
