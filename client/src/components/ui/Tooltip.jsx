import { useState } from 'react';
import { cn } from '../../utils/helpers';

const Tooltip = ({ children, content, position = 'top' }) => {
    const [show, setShow] = useState(false);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && content && (
                <div
                    className={cn(
                        'absolute z-50 px-2 py-1 text-xs font-medium rounded bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 whitespace-nowrap pointer-events-none',
                        positions[position]
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export default Tooltip;
