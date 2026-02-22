import { useState, useEffect } from 'react';
import { getRelativeTimeLabel } from '../../utils/dueDateUtils';
import { Clock } from 'lucide-react';

const DueDateCountdown = ({ dueDate, className }) => {
    const [label, setLabel] = useState(() => getRelativeTimeLabel(dueDate));

    useEffect(() => {
        if (!dueDate) return;
        setLabel(getRelativeTimeLabel(dueDate));
        const interval = setInterval(() => setLabel(getRelativeTimeLabel(dueDate)), 60_000);
        return () => clearInterval(interval);
    }, [dueDate]);

    if (!dueDate) return null;

    return (
        <div className={`flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 ${className || ''}`}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>{label}</span>
        </div>
    );
};

export default DueDateCountdown;
