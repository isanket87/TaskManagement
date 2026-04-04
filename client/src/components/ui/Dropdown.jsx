import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

const Dropdown = ({ trigger, items, align = 'left', position = 'bottom', className, fullWidth = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { 
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false); 
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className={cn('relative', fullWidth ? 'w-full' : 'inline-block', className)}>
            <div 
                className={cn('cursor-pointer', fullWidth && 'w-full')}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setOpen((o) => !o);
                }}
            >
                {trigger}
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={cn(
                            'absolute z-[1000] min-w-[220px] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-ultra rounded-2xl p-2 backdrop-blur-xl',
                            align === 'right' ? 'right-0' : 'left-0',
                            position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'
                        )}
                    >
                        {items.map((item, i) => (
                            item.separator ? (
                                <div key={i} className="my-1.5 border-t border-slate-100 dark:border-white/5" />
                            ) : (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        item.onClick?.(); 
                                        setOpen(false); 
                                    }}
                                    disabled={item.disabled}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all',
                                        item.danger
                                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white',
                                        item.disabled && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                                    <span className="flex-1 text-left">{item.label}</span>
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
