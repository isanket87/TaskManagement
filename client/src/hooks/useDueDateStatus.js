import { useState, useEffect, useCallback } from 'react';
import { getDueDateStatus } from '../utils/dueDateUtils';

/**
 * Returns live-updated due date status for a task.
 * Recalculates every 60 seconds.
 */
export const useDueDateStatus = (dueDate, taskStatus) => {
    const compute = useCallback(
        () => getDueDateStatus(dueDate, taskStatus),
        [dueDate, taskStatus]
    );

    const [status, setStatus] = useState(compute);

    useEffect(() => {
        setStatus(compute());
        const interval = setInterval(() => setStatus(compute()), 60_000);
        return () => clearInterval(interval);
    }, [compute]);

    return status;
};

export default useDueDateStatus;
