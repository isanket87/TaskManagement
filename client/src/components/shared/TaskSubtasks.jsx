import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, MoreVertical, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taskService } from '../../services/taskService';
import { cn } from '../../utils/helpers';
import Avatar from '../ui/Avatar';

const TaskSubtasks = ({ parentTaskId, projectId, subtasks = [], onTaskSelect }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const createMutation = useMutation({
        mutationFn: (newTitle) => taskService.create(projectId, {
            title: newTitle,
            parentTaskId,
            status: 'todo'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', projectId, parentTaskId]);
            queryClient.invalidateQueries(['tasks', projectId]); // Update board counts
            setTitle('');
            setIsAdding(false);
            toast.success('Subtask created');
        },
        onError: () => toast.error('Failed to create subtask')
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ taskId, currentStatus }) =>
            taskService.updateStatus(projectId, taskId, currentStatus === 'done' ? 'todo' : 'done'),
        onMutate: async ({ taskId, currentStatus }) => {
            // Optimistic update
            await queryClient.cancelQueries(['task', projectId, parentTaskId]);
            const prev = queryClient.getQueryData(['task', projectId, parentTaskId]);
            if (prev) {
                const newStatus = currentStatus === 'done' ? 'todo' : 'done';
                queryClient.setQueryData(['task', projectId, parentTaskId], {
                    ...prev,
                    data: {
                        ...prev.data,
                        task: {
                            ...prev.data.task,
                            subtasks: prev.data.task.subtasks.map(s =>
                                s.id === taskId ? { ...s, status: newStatus } : s
                            )
                        }
                    }
                });
            }
            return { prev };
        },
        onError: (err, vars, ctx) => {
            queryClient.setQueryData(['task', projectId, parentTaskId], ctx.prev);
            toast.error('Failed to update status');
        },
        onSettled: () => {
            queryClient.invalidateQueries(['task', projectId, parentTaskId]);
            queryClient.invalidateQueries(['tasks', projectId]);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return setIsAdding(false);
        createMutation.mutate(title.trim());
    };

    const completedCount = subtasks.filter(s => s.status === 'done').length;
    const progress = subtasks.length === 0 ? 0 : Math.round((completedCount / subtasks.length) * 100);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Subtasks</h3>
                    {subtasks.length > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {completedCount}/{subtasks.length}
                        </span>
                    )}
                </div>

                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            {subtasks.length > 0 && (
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* List */}
            <div className="space-y-1">
                {subtasks.map(task => {
                    const isDone = task.status === 'done';
                    const hasDeepSubtasks = task._count?.subtasks > 0;

                    return (
                        <div
                            key={task.id}
                            className="group flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => onTaskSelect ? onTaskSelect(task) : navigate(`/workspace/projects/${projectId}/tasks/${task.id}`)}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ taskId: task.id, currentStatus: task.status }); }}
                                    className={cn(
                                        "shrink-0 transition-colors",
                                        isDone ? "text-emerald-500" : "text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500"
                                    )}
                                >
                                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                </button>

                                <span className={cn(
                                    "text-sm truncate transition-all",
                                    isDone ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-700 dark:text-slate-200"
                                )}>
                                    {task.title}
                                </span>

                                {/* Visual indicator if THIS subtask has its own subtasks */}
                                {hasDeepSubtasks && (
                                    <span className="shrink-0 text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                                        {task._count.subtasks} sub
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pl-4">
                                {task.assignee && (
                                    <Avatar src={task.assignee.avatar} name={task.assignee.name} size="xs" />
                                )}
                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Inline adder */}
                {isAdding && (
                    <form onSubmit={handleSubmit} className="pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                onBlur={() => !title.trim() && setIsAdding(false)}
                                onKeyDown={e => e.key === 'Escape' && setIsAdding(false)}
                                placeholder="What needs to be done?"
                                className="flex-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                disabled={createMutation.isPending}
                            />
                            {createMutation.isPending && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default TaskSubtasks;
