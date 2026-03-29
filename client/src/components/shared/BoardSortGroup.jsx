import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUpDown, ChevronDown, ArrowUp, ArrowDown,
    Layers, CheckCircle2, Flag, User, Calendar, X
} from 'lucide-react';
import { cn } from '../../utils/helpers';

// ── Sort options ──────────────────────────────────────────────────────────────
export const SORT_FIELDS = [
    { value: 'none',      label: 'Default order',   icon: ArrowUpDown },
    { value: 'priority',  label: 'Priority',         icon: Flag },
    { value: 'dueDate',   label: 'Due Date',         icon: Calendar },
    { value: 'title',     label: 'Title',            icon: null },
    { value: 'createdAt', label: 'Created Date',     icon: null },
];

// ── Group By options ──────────────────────────────────────────────────────────
export const GROUP_BY_OPTIONS = [
    { value: 'status',   label: 'Status',   icon: CheckCircle2 },
    { value: 'priority', label: 'Priority', icon: Flag },
    { value: 'assignee', label: 'Assignee', icon: User },
    { value: 'dueDate',  label: 'Due Date', icon: Calendar },
];

// Small popover dropdown
const PopoverMenu = ({ isOpen, onClose, children, align = 'left' }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className={cn(
                        'absolute top-full mt-1.5 z-50 min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ── Sort Control ──────────────────────────────────────────────────────────────
const SortControl = ({ sortField, sortDir, onChange }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const current = SORT_FIELDS.find(f => f.value === sortField) || SORT_FIELDS[0];
    const isActive = sortField !== 'none';

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative" ref={wrapRef}>
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    isActive
                        ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30'
                        : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200'
                )}
            >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort{isActive ? `: ${current.label}` : ''}</span>
                {isActive && (
                    <span
                        onClick={(e) => { e.stopPropagation(); onChange('none', 'asc'); }}
                        className="ml-0.5 p-0.5 rounded hover:bg-violet-200 dark:hover:bg-violet-500/20 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </span>
                )}
                {!isActive && <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />}
            </button>

            <PopoverMenu isOpen={open} onClose={() => setOpen(false)}>
                <div className="p-1.5 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase px-2 pb-1">Sort by</p>
                    {SORT_FIELDS.filter(f => f.value !== 'none').map(field => (
                        <button
                            key={field.value}
                            onClick={() => {
                                if (sortField === field.value) {
                                    onChange(field.value, sortDir === 'asc' ? 'desc' : 'asc');
                                } else {
                                    onChange(field.value, 'asc');
                                }
                                setOpen(false);
                            }}
                            className={cn(
                                'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                                sortField === field.value
                                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            )}
                        >
                            <span>{field.label}</span>
                            {sortField === field.value && (
                                sortDir === 'asc'
                                    ? <ArrowUp className="w-3 h-3" />
                                    : <ArrowDown className="w-3 h-3" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Direction toggle — only shown when a field is selected */}
                {sortField !== 'none' && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase px-2 pb-1">Direction</p>
                        <div className="flex gap-1">
                            {[
                                { value: 'asc', label: 'Ascending', icon: ArrowUp },
                                { value: 'desc', label: 'Descending', icon: ArrowDown },
                            ].map(dir => (
                                <button
                                    key={dir.value}
                                    onClick={() => { onChange(sortField, dir.value); setOpen(false); }}
                                    className={cn(
                                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                        sortDir === dir.value
                                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    )}
                                >
                                    <dir.icon className="w-3 h-3" />
                                    {dir.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </PopoverMenu>
        </div>
    );
};

// ── Group By Control ──────────────────────────────────────────────────────────
const GroupByControl = ({ groupBy, onChange }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const current = GROUP_BY_OPTIONS.find(g => g.value === groupBy) || GROUP_BY_OPTIONS[0];
    const isCustom = groupBy !== 'status';

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative" ref={wrapRef}>
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    isCustom
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                        : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200'
                )}
            >
                <Layers className="w-3.5 h-3.5" />
                <span>Group: <span className="font-bold">{current.label}</span></span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
            </button>

            <PopoverMenu isOpen={open} onClose={() => setOpen(false)} align="right">
                <div className="p-1.5 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase px-2 pb-1">Group by</p>
                    {GROUP_BY_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={cn(
                                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                                    groupBy === opt.value
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{opt.label}</span>
                                {groupBy === opt.value && (
                                    <span className="ml-auto text-emerald-500 dark:text-emerald-400">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </PopoverMenu>
        </div>
    );
};

// ── Main Export ───────────────────────────────────────────────────────────────
const BoardSortGroup = ({ sortField, sortDir, onSortChange, groupBy, onGroupByChange }) => {
    return (
        <div className="flex items-center gap-1.5">
            <SortControl
                sortField={sortField}
                sortDir={sortDir}
                onChange={onSortChange}
            />
            <GroupByControl
                groupBy={groupBy}
                onChange={onGroupByChange}
            />
        </div>
    );
};

export default BoardSortGroup;
