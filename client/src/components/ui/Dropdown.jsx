import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

const Dropdown = ({ trigger, items, align = 'left', position = 'bottom' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className={cn(
                            'absolute z-50 min-w-[160px] card shadow-lg p-1',
                            align === 'right' ? 'right-0' : 'left-0',
                            position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                        )}
                    >
                        {items.map((item, i) => (
                            item.separator ? (
                                <div key={i} className="my-1 border-t border-gray-100 dark:border-gray-800" />
                            ) : (
                                <button
                                    key={i}
                                    onClick={() => { item.onClick?.(); setOpen(false); }}
                                    disabled={item.disabled}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                                        item.danger
                                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                                        item.disabled && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                                    {item.label}
                                </button>
                            )
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dropdown;
