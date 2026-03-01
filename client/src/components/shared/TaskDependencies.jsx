import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, X, Plus, AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskService } from '../../services/taskService';
import api from '../../services/api';
import useWorkspaceStore from '../../store/workspaceStore';
import { cn } from '../../utils/helpers';

// ── Status chip ──────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
    const map = {
        done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        in_progress: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
        in_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        todo: 'bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400',
    };
    const labels = { done: 'Done', in_progress: 'In Progress', in_review: 'In Review', todo: 'To Do' };
    return (
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', map[status] || map.todo)}>
            {labels[status] || status}
        </span>
    );
};

// ── Dependency row ────────────────────────────────────────────────────────────
const DepRow = ({ task, onRemove, isRemoving, onClick }) => (
    <div
        className={cn("flex items-center gap-2 py-1.5 group/dep", onClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors")}
        onClick={() => onClick && onClick(task)}
    >
        <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 truncate">{task.project?.name}</span>
                <StatusChip status={task.status} />
            </div>
        </div>
        <button
            onClick={() => onRemove(task.depId)}
            disabled={isRemoving}
            className="opacity-0 group-hover/dep:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
        >
            {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
    </div>
);

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
            toast.success('Dependency added');
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Could not add dependency')
    });

    const removeMutation = useMutation({
        mutationFn: (depId) => taskService.removeDependency(projectId, taskId, depId),
        onMutate: (depId) => setRemovingId(depId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-deps', projectId, taskId]);
            toast.success('Dependency removed');
        },
        onError: () => toast.error('Failed to remove dependency'),
        onSettled: () => setRemovingId(null),
    });

    const blockedBy = data?.blockedBy || [];
    const blocks = data?.blocks || [];

    // Exclude tasks already linked or the task itself
    const linkedIds = new Set([taskId, ...blockedBy.map(t => t.id), ...blocks.map(t => t.id)]);
    const filteredResults = (searchResults || []).filter(t => !linkedIds.has(t.id));

    return (
        <div className="space-y-2">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <Link2 className="w-3.5 h-3.5" />
                    Dependencies
                </div>
                <button
                    onClick={() => setIsAdding(a => !a)}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    title="Add dependency"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Add picker */}
            {isAdding && (
                <div className="relative">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-colors">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search tasks to block this one…"
                            className="flex-1 text-xs bg-transparent text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none min-w-0"
                        />
                        {isSearching && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
                    </div>

                    {/* Dropdown results */}
                    {search.trim().length >= 2 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                            {filteredResults.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">
                                    {isSearching ? 'Searching…' : 'No matching tasks found'}
                                </p>
                            ) : (
                                filteredResults.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => addMutation.mutate(t.id)}
                                        disabled={addMutation.isPending}
                                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                    >
                                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{t.project?.name || 'Unknown project'}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="text-xs text-slate-400 animate-pulse py-1">Loading…</div>
            )}

            {/* Blocked By */}
            {!isLoading && blockedBy.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Blocked by
                    </p>
                    <div className="space-y-0.5 pl-1">
                        {blockedBy.map(t => (
                            <DepRow key={t.depId} task={t} onRemove={id => removeMutation.mutate(id)} isRemoving={removingId === t.depId} onClick={onTaskSelect} />
                        ))}
                    </div>
                </div>
            )}

            {/* Blocks */}
            {!isLoading && blocks.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Blocks
                    </p>
                    <div className="space-y-0.5 pl-1">
                        {blocks.map(t => (
                            <DepRow key={t.depId} task={t} onRemove={id => removeMutation.mutate(id)} isRemoving={removingId === t.depId} onClick={onTaskSelect} />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !isAdding && blockedBy.length === 0 && blocks.length === 0 && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="text-[11px] text-slate-400 hover:text-indigo-500 transition-colors"
                >
                    + Add dependency
                </button>
            )}
        </div>
    );
};

export default TaskDependencies;
