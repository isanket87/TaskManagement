import { Calendar } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { getDueDateBadgeStyles, formatDueDate } from '../../utils/dueDateUtils';
import { useDueDateStatus } from '../../hooks/useDueDateStatus';

const DueDateBadge = ({ dueDate, hasDueTime, taskStatus, onClick, compact = false }) => {
    const status = useDueDateStatus(dueDate, taskStatus);
    const { className, icon } = getDueDateBadgeStyles(status);
    const label = formatDueDate(dueDate, hasDueTime);

    if (!dueDate && !onClick) return null;

    const Component = onClick ? 'button' : 'div';

    return (
        <Component
            onClick={onClick}
            title={onClick ? 'Click to set due date' : label}
            className={cn(
                'badge transition-all duration-200',
                onClick ? 'cursor-pointer hover:opacity-80 active:scale-95' : '',
                dueDate ? className : 'due-none',
                compact && 'text-xs'
            )}
        >
            {dueDate ? (
                <>
                    <span className={status === 'overdue' ? 'overdue-pulse' : ''}>{icon}</span>
                    {!compact && <span>{label}</span>}
                    {compact && <span className="hidden sm:inline">{label}</span>}
                </>
            ) : (
                <>
                    <Calendar className="w-3 h-3" />
                    {!compact && <span className="text-gray-400">Set date</span>}
                </>
            )}
        </Component>
    );
};

export default DueDateBadge;
