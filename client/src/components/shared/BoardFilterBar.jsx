import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal, CheckCircle2, Flag, CalendarDays, User2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: 'Urgent',   color: '#ef4444' },
    { value: 'high',   label: 'High',     color: '#f97316' },
    { value: 'medium', label: 'Medium',   color: '#3b82f6' },
    { value: 'low',    label: 'Low',      color: '#22c55e' },
];

const STATUS_OPTIONS = [
    { value: 'todo',        label: 'To Do',       color: '#6b7280' },
    { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { value: 'in_review',   label: 'In Review',   color: '#8b5cf6' },
    { value: 'done',        label: 'Done',        color: '#10b981' },
];

const DUE_OPTIONS = [
    { value: 'overdue',   label: 'Overdue',   emoji: '🔴' },
    { value: 'today',     label: 'Today',     emoji: '🔵' },
    { value: 'this_week', label: 'This Week', emoji: '🟡' },
    { value: 'no_date',   label: 'No Date',   emoji: '⚪' },
];

// Chip-style multi-select row inside the panel
const ChipRow = ({ options, selected, onToggle, colorDot = false, emoji = false }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
                <button
                    key={opt.value}
                    onClick={() => onToggle(opt.value)}
                    className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all',
                        isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-400/40 dark:text-indigo-300'
                            : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                >
                    {colorDot && opt.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
                    {emoji && opt.emoji && <span className="text-[10px]">{opt.emoji}</span>}
                    {opt.label}
                    {isSelected && <X className="w-2 h-2 ml-0.5 opacity-50" />}
                </button>
            );
        })}
    </div>
);

// --- Unified Filters Popover ---
const UnifiedFiltersButton = ({ filters, onFiltersChange, members }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const totalActive =
        (filters.statuses?.length    || 0) +
        (filters.priorities?.length  || 0) +
        (filters.assigneeIds?.length || 0) +
        (filters.dueDates?.length    || 0);
    const isActive = totalActive > 0;

    const toggle = (key, value) => {
        const current = filters[key] || [];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        onFiltersChange({ ...filters, [key]: next });
    };

    const clearAll = () => {
        onFiltersChange({ statuses: [], priorities: [], assigneeIds: [], dueDates: [] });
    };

    return (
        <div ref={ref} className="relative shrink-0">
            <motion.button
                onClick={() => setOpen(o => !o)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.2 }}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800'
                )}
            >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                <AnimatePresence mode="wait">
                    {isActive ? (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', bounce: 0.55, duration: 0.35 }}
                            className="bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold leading-none"
                        >{totalActive}</motion.span>
                    ) : (
                        <motion.span key="chevron" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.13 }}
                        className="absolute top-full mt-2 left-0 z-[60] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 w-[300px] overflow-hidden"
                    >
                        <div className="px-4 pt-3 pb-0.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filter Tasks</span>
                        </div>

                        <div className="p-3 space-y-4">
                            {/* Status */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                                </div>
                                <ChipRow options={STATUS_OPTIONS} selected={filters.statuses || []} onToggle={v => toggle('statuses', v)} colorDot />
                            </div>

                            {/* Priority */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Flag className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</span>
                                </div>
                                <ChipRow options={PRIORITY_OPTIONS} selected={filters.priorities || []} onToggle={v => toggle('priorities', v)} colorDot />
                            </div>

                            {/* Due Date */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</span>
                                </div>
                                <ChipRow options={DUE_OPTIONS} selected={filters.dueDates || []} onToggle={v => toggle('dueDates', v)} emoji />
                            </div>

                            {/* Assignee */}
                            {members?.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <User2 className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignee</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {members.map(m => {
                                            const isSelected = (filters.assigneeIds || []).includes(m.user.id);
                                            return (
                                                <button
                                                    key={m.user.id}
                                                    onClick={() => toggle('assigneeIds', m.user.id)}
                                                    className={cn(
                                                        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all',
                                                        isSelected
                                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-400/40 dark:text-indigo-300'
                                                            : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    <Avatar user={m.user} size="xs" />
                                                    <span className="truncate max-w-[70px]">{m.user.name}</span>
                                                    {isSelected && <X className="w-2 h-2 ml-0.5 opacity-50" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                            {isActive
                                ? (
                                    <button
                                        onClick={clearAll}
                                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                        Clear all ({totalActive})
                                    </button>
                                )
                                : <span className="text-xs text-slate-400">No filters applied</span>
                            }
                            <button onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                                Done
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Main BoardFilterBar ---
const BoardFilterBar = ({
    searchQuery,
    onSearchChange,
    filters,
    onFiltersChange,
    members = [],
    totalCount = 0,
    filteredCount = 0,
}) => {
    const [localSearch, setLocalSearch] = useState(searchQuery || '');
    const [searchFocused, setSearchFocused] = useState(false);
    const debounceRef = useRef(null);

    const handleSearchInput = useCallback((val) => {
        setLocalSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onSearchChange(val);
        }, 300);
    }, [onSearchChange]);

    useEffect(() => {
        setLocalSearch(searchQuery || '');
    }, [searchQuery]);

    const isFiltered = filteredCount < totalCount;

    return (
        <div className="flex items-center gap-2">
            {/* Search — expands smoothly on focus */}
            <div className="relative flex items-center group shrink-0">
                <Search className={cn(
                    'w-3.5 h-3.5 absolute left-2.5 transition-colors pointer-events-none z-10',
                    localSearch || searchFocused ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'
                )} />
                <motion.input
                    type="text"
                    placeholder="Search tasks..."
                    value={localSearch}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    animate={{ width: searchFocused || localSearch ? 176 : 144 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    className={cn(
                        'pl-7 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-600 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200',
                        (localSearch || searchFocused) && 'bg-white dark:bg-slate-700 shadow-sm border-slate-200 dark:border-slate-600'
                    )}
                />
                {localSearch && (
                    <button
                        onClick={() => handleSearchInput('')}
                        className="absolute right-2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Unified Filters */}
            <UnifiedFiltersButton
                filters={filters}
                onFiltersChange={onFiltersChange}
                members={members}
            />

            {/* Result count — only when filtered */}
            <AnimatePresence>
                {isFiltered && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block"
                    >
                        {filteredCount}/{totalCount}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BoardFilterBar;
