import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: 'Urgent', color: '#ef4444' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'medium', label: 'Medium', color: '#3b82f6' },
    { value: 'low', label: 'Low', color: '#22c55e' },
];

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do', color: '#6b7280' },
    { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { value: 'in_review', label: 'In Review', color: '#8b5cf6' },
    { value: 'done', label: 'Done', color: '#10b981' },
];

const DUE_OPTIONS = [
    { value: 'overdue', label: '🔴 Overdue' },
    { value: 'today', label: '🔵 Today' },
    { value: 'this_week', label: '🟡 This Week' },
    { value: 'no_date', label: '⚪ No Date' },
];

// Generic multi-select dropdown
const FilterDropdown = ({ label, icon, options, selected, onToggle, onClear, colorDot }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const count = selected.length;
    const isActive = count > 0;

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap',
                    isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700'
                )}
            >
                {icon}
                <span>{label}</span>
                {isActive && (
                    <span className="bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                        {count}
                    </span>
                )}
                <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full mt-1.5 left-0 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 min-w-[160px] overflow-hidden"
                    >
                        <div className="p-1.5 space-y-0.5">
                            {options.map(opt => {
                                const isSelected = selected.includes(opt.value);
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => onToggle(opt.value)}
                                        className={cn(
                                            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left',
                                            isSelected
                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        )}
                                    >
                                        {colorDot && opt.color && (
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                                        )}
                                        <span className="flex-1">{opt.label}</span>
                                        {isSelected && (
                                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                <svg viewBox="0 0 12 12" fill="none" className="w-2 h-2 text-white">
                                                    <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {isActive && (
                            <div className="border-t border-slate-100 dark:border-slate-700 p-1.5">
                                <button
                                    onClick={() => { onClear(); setOpen(false); }}
                                    className="w-full text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-1 rounded-lg transition-colors"
                                >
                                    Clear filter
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Assignee filter dropdown
const AssigneeFilter = ({ members, selected, onToggle, onClear }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const count = selected.length;
    const isActive = count > 0;

    if (!members?.length) return null;

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                )}
            >
                <span>Assignee</span>
                {isActive && (
                    <span className="bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                        {count}
                    </span>
                )}
                <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full mt-1.5 left-0 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 min-w-[180px] overflow-hidden"
                    >
                        <div className="p-1.5 space-y-0.5">
                            {members.map(m => {
                                const isSelected = selected.includes(m.user.id);
                                return (
                                    <button
                                        key={m.user.id}
                                        onClick={() => onToggle(m.user.id)}
                                        className={cn(
                                            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left',
                                            isSelected
                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        )}
                                    >
                                        <Avatar user={m.user} size="xs" />
                                        <span className="flex-1 truncate">{m.user.name}</span>
                                        {isSelected && (
                                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                                <svg viewBox="0 0 12 12" fill="none" className="w-2 h-2 text-white">
                                                    <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {isActive && (
                            <div className="border-t border-slate-100 dark:border-slate-700 p-1.5">
                                <button
                                    onClick={() => { onClear(); setOpen(false); }}
                                    className="w-full text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-1 rounded-lg transition-colors"
                                >
                                    Clear filter
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * BoardFilterBar
 *
 * Props:
 *  - searchQuery: string
 *  - onSearchChange: (val: string) => void
 *  - filters: { statuses: string[], priorities: string[], assigneeIds: string[], dueDates: string[] }
 *  - onFiltersChange: (filters) => void
 *  - members: array of { user: { id, name, avatarUrl } }
 *  - totalCount: number   — total tasks before filtering
 *  - filteredCount: number — tasks after filtering
 */
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
    const debounceRef = useRef(null);

    // Debounce search (300ms)
    const handleSearchInput = useCallback((val) => {
        setLocalSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onSearchChange(val);
        }, 300);
    }, [onSearchChange]);

    // Sync external searchQuery
    useEffect(() => {
        setLocalSearch(searchQuery || '');
    }, [searchQuery]);

    const toggleFilter = (key, value) => {
        const current = filters[key] || [];
        const next = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        onFiltersChange({ ...filters, [key]: next });
    };

    const clearFilter = (key) => {
        onFiltersChange({ ...filters, [key]: [] });
    };

    const totalActiveFilters =
        (filters.statuses?.length || 0) +
        (filters.priorities?.length || 0) +
        (filters.assigneeIds?.length || 0) +
        (filters.dueDates?.length || 0);

    const hasAnyFilter = totalActiveFilters > 0 || localSearch.trim().length > 0;

    const clearAll = () => {
        setLocalSearch('');
        onSearchChange('');
        onFiltersChange({ statuses: [], priorities: [], assigneeIds: [], dueDates: [] });
    };

    const isFiltered = filteredCount < totalCount;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex items-center group shrink-0">
                <Search className={cn(
                    'w-3.5 h-3.5 absolute left-3 transition-colors pointer-events-none',
                    localSearch ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'
                )} />
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={localSearch}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className={cn(
                        'pl-8 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-600 w-40 sm:w-52 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200',
                        localSearch && 'bg-white dark:bg-slate-700 shadow-sm border-slate-200 dark:border-slate-600'
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

            {/* Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden sm:block" />

            {/* Filter icon + label */}
            <div className="flex items-center gap-1 text-slate-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Filter</span>
            </div>

            {/* Status Filter */}
            <FilterDropdown
                label="Status"
                options={STATUS_OPTIONS}
                selected={filters.statuses || []}
                onToggle={(v) => toggleFilter('statuses', v)}
                onClear={() => clearFilter('statuses')}
                colorDot
                icon={<span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />}
            />

            {/* Priority Filter */}
            <FilterDropdown
                label="Priority"
                options={PRIORITY_OPTIONS}
                selected={filters.priorities || []}
                onToggle={(v) => toggleFilter('priorities', v)}
                onClear={() => clearFilter('priorities')}
                colorDot
                icon={<span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />}
            />

            {/* Due Date Filter */}
            <FilterDropdown
                label="Due Date"
                options={DUE_OPTIONS}
                selected={filters.dueDates || []}
                onToggle={(v) => toggleFilter('dueDates', v)}
                onClear={() => clearFilter('dueDates')}
                colorDot={false}
                icon={<span className="text-slate-400 text-[11px]">📅</span>}
            />

            {/* Assignee Filter */}
            {members.length > 0 && (
                <AssigneeFilter
                    members={members}
                    selected={filters.assigneeIds || []}
                    onToggle={(v) => toggleFilter('assigneeIds', v)}
                    onClear={() => clearFilter('assigneeIds')}
                />
            )}

            {/* Active filters badge + clear all */}
            <AnimatePresence>
                {hasAnyFilter && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="flex items-center gap-1.5"
                    >
                        {totalActiveFilters > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                                <SlidersHorizontal className="w-3 h-3" />
                                {totalActiveFilters} active
                            </span>
                        )}
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all"
                        >
                            <X className="w-3 h-3" />
                            Clear all
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result count */}
            <AnimatePresence>
                {isFiltered && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] font-medium text-slate-400 dark:text-slate-500 ml-1 hidden sm:block"
                    >
                        {filteredCount} of {totalCount} tasks
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BoardFilterBar;
