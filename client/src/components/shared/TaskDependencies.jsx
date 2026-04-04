import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, X, Plus, AlertCircle, CheckCircle2, Loader2, Search, Zap, Hash, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskService } from '../../services/taskService';
import api from '../../services/api';
import useWorkspaceStore from '../../store/workspaceStore';
import { cn } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

// ── Status chip ──────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
    const map = {
        done: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400',
        in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
        in_review: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400',
        todo: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400',
    };
    const labels = { done: 'Done', in_progress: 'In Progress', in_review: 'In Review', todo: 'To Do' };
    return (
        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border', map[status] || map.todo)}>
            {labels[status] || status}
        </span>
    );
};

// ── Dependency row ────────────────────────────────────────────────────────────
const DepRow = ({ task, onRemove, isRemoving, onClick }) => (
    <div
        className={cn(
            "flex items-center gap-4 p-4 rounded-2xl transition-all group/dep border border-transparent", 
            onClick && "cursor-pointer bg-white dark:bg-white/[0.03] shadow-sm hover:shadow-md hover:border-slate-200/50 dark:hover:border-white/10 hover:translate-x-1"
        )}
        onClick={() => onClick && onClick(task)}
    >
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 text-slate-400 group-hover/dep:text-indigo-500 transition-colors">
            <Target className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">{task.title}</p>
            <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                    <Hash className="w-2.5 h-2.5" />
                    {task.project?.name || 'Cross-Project'}
                </span>
                <StatusChip status={task.status} />
            </div>
        </div>
        <button
            onClick={(e) => { e.stopPropagation(); onRemove(task.depId); }}
            disabled={isRemoving}
            className="opacity-0 group-hover/dep:opacity-100 p-2.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
        >
            {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
    </div>
);

import { Trash2 } from 'lucide-react';

// ── Main component ────────────────────────────────────────────────────────────
const TaskDependencies = ({ taskId, projectId, onTaskSelect }) => {
    const queryClient = useQueryClient();
    const { workspace } = useWorkspaceStore();
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [removingId, setRemovingId] = useState(null);

    // Fetch this task's dependencies
    const { data, isLoading } = useQuery({
        queryKey: ['task-deps', projectId, taskId],
        queryFn: async () => {
            const res = await taskService.getDependencies(projectId, taskId);
            return res.data.data;
        },
        enabled: !!taskId && !!projectId,
    });

    // Search all tasks in workspace (for the add picker)
    const { data: searchResults, isFetching: isSearching } = useQuery({
        queryKey: ['task-search', workspace?.slug, search],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspace.slug}/search`, { params: { q: search, type: 'tasks' } });
            return res.data.data?.tasks || [];
        },
        enabled: isAdding && search.trim().length >= 2,
        staleTime: 5000,
    });

    const addMutation = useMutation({
        mutationFn: (blockingTaskId) => taskService.addDependency(projectId, taskId, blockingTaskId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-deps', projectId, taskId]);
            setSearch('');
            setIsAdding(false);
            toast.success('Strategy Linked');
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Operational Error')
    });

    const removeMutation = useMutation({
        mutationFn: (depId) => taskService.removeDependency(projectId, taskId, depId),
        onMutate: (depId) => setRemovingId(depId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-deps', projectId, taskId]);
            toast.success('Link Dissolved');
        },
        onError: () => toast.error('Operational Error'),
        onSettled: () => setRemovingId(null),
    });

    const blockedBy = data?.blockedBy || [];
    const blocks = data?.blocks || [];

    const linkedIds = new Set([taskId, ...blockedBy.map(t => t.id), ...blocks.map(t => t.id)]);
    const filteredResults = (searchResults || []).filter(t => !linkedIds.has(t.id));

    return (
        <div className="space-y-6">
            {/* Header Canvas */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Operational Network</h3>
                    {(blockedBy.length > 0 || blocks.length > 0) && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 border border-indigo-500/20">
                            {blockedBy.length + blocks.length} LINKS
                        </span>
                    )}
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:scale-110 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm"
                    >
                        <Link2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Tactical Linker (Add Picker) */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="relative z-30"
                    >
                        <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] p-2 rounded-2xl border-2 border-indigo-500/30 shadow-lg ring-4 ring-indigo-500/5">
                            <div className="p-2 text-indigo-500"><Search className="w-5 h-5" /></div>
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search objective to link..."
                                className="flex-1 text-sm font-bold bg-transparent border-none outline-none focus:ring-0 p-2 text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-medium"
                            />
                            {isSearching ? (
                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mr-3" />
                            ) : (
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 mr-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Search Deployment Area */}
                        {search.trim().length >= 2 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute z-50 top-full left-0 right-0 mt-3 glass-premium bg-white/95 dark:bg-slate-900/95 rounded-[2rem] border border-slate-200/50 dark:border-white/10 shadow-ultra overflow-hidden max-h-72 overflow-y-auto custom-scrollbar backdrop-blur-3xl"
                            >
                                {filteredResults.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 px-6 opacity-40 italic">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                                            {isSearching ? 'Scanning Network…' : 'No Objectives Detected'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-1">
                                        {filteredResults.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => addMutation.mutate(t.id)}
                                                disabled={addMutation.isPending}
                                                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all group flex items-center justify-between"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-500 transition-colors tracking-tight">{t.title}</p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                                                            <Hash className="w-2.5 h-2.5" />
                                                            {t.project?.name || 'External Sector'}
                                                        </span>
                                                        <StatusChip status={t.status} />
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Network Visualization */}
            <div className="space-y-6">
                {/* Blocked By Stream */}
                {blockedBy.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                            <Zap className="w-3 h-3 fill-current" /> Tactical Blockers
                        </p>
                        <div className="space-y-2">
                            {blockedBy.map(t => (
                                <DepRow key={t.depId} task={t} onRemove={id => removeMutation.mutate(id)} isRemoving={removingId === t.depId} onClick={onTaskSelect} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Blocks Stream */}
                {blocks.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                            <Target className="w-3 h-3 fill-current" /> Mission Pre-Requisite For
                        </p>
                        <div className="space-y-2">
                            {blocks.map(t => (
                                <DepRow key={t.depId} task={t} onRemove={id => removeMutation.mutate(id)} isRemoving={removingId === t.depId} onClick={onTaskSelect} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantum Vacancy (Empty State) */}
                {!isLoading && !isAdding && blockedBy.length === 0 && blocks.length === 0 && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full py-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="w-12 h-12 rounded-[1.25rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                            <Link2 className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors block">Link Strategic Dependents</span>
                            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter block mt-1">Map operational dependencies for clear execution</span>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TaskDependencies;
