export const cn = (...classes) => classes.filter(Boolean).join(' ');

export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const truncate = (str, n) => (str?.length > n ? str.slice(0, n) + '…' : str);

export const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getPriorityColor = (priority) => {
    const map = {
        critical: 'text-red-600 dark:text-red-400',
        high: 'text-orange-500 dark:text-orange-400',
        medium: 'text-yellow-500 dark:text-yellow-400',
        low: 'text-green-500 dark:text-green-400',
    };
    return map[priority] || map.medium;
};

export const getPriorityBadgeClass = (priority) => {
    const map = {
        critical: 'priority-critical',
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low',
    };
    return map[priority] || map.medium;
};
