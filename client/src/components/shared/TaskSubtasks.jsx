import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, MoreVertical, Loader2, ChevronRight, Hash, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taskService } from '../../services/taskService';
import { cn } from '../../utils/helpers';
import Avatar from '../ui/Avatar';
import useWorkspaceStore from '../../store/workspaceStore';
import { motion, AnimatePresence } from 'framer-motion';

const TaskSubtasks = ({ parentTaskId, projectId, subtasks = [], onTaskSelect }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { workspace } = useWorkspaceStore();
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
            queryClient.invalidateQueries(['tasks', projectId]);
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

    const deleteMutation = useMutation({
        mutationFn: (taskId) => taskService.delete(projectId, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', projectId, parentTaskId]);
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success('Subtask removed');
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
        <div className="space-y-6">
            {/* Header & Progress Briefing */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Operational Milestones</h3>
                        {subtasks.length > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 border border-indigo-500/20">
                                {completedCount}/{subtasks.length}
                            </span>
                        )}
                    </div>

                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:scale-110 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {subtasks.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Mission Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5 p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={cn(
                                    "h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-700 ease-out",
                                    progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                )}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* List Canvas */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {subtasks.map(task => {
                        const isDone = task.status === 'done';
                        const hasDeepSubtasks = task._count?.subtasks > 0;

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={task.id}
                                className={cn(
                                    "group flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border border-transparent",
                                    isDone 
                                        ? "bg-slate-50/50 dark:bg-white/[0.02] opacity-60" 
                                        : "bg-white dark:bg-white/[0.03] shadow-sm hover:shadow-md hover:border-slate-200/50 dark:hover:border-white/10 hover:translate-x-1"
                                )}
                                onClick={() => onTaskSelect ? onTaskSelect(task) : navigate(`/workspace/${workspace?.slug}/projects/${projectId}/tasks/${task.id}`)}
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ taskId: task.id, currentStatus: task.status }); }}
                                        className={cn(
                                            "shrink-0 transition-all transform hover:scale-110 p-1 rounded-lg",
                                            isDone ? "text-emerald-500 bg-emerald-500/10" : "text-slate-300 hover:text-indigo-500 dark:text-slate-600"
                                        )}
                                    >
                                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>

                                    <div className="flex flex-col min-w-0">
                                        <span className={cn(
                                            "text-sm font-bold truncate transition-all tracking-tight",
                                            isDone ? "text-slate-400 line-through dark:text-slate-500 font-medium" : "text-slate-800 dark:text-slate-100"
                                        )}>
                                            {task.title}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-40">
                                            ID: {task.id.slice(0,8)}
                                        </span>
                                    </div>

                                    {hasDeepSubtasks && (
                                        <span className="shrink-0 flex items-center gap-1 text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
                                            <Hash className="w-2.5 h-2.5" />
                                            {task._count.subtasks} DEPTH
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all pl-6">
                                    {task.assignee && (
                                        <Avatar user={task.assignee} size="xs" className="ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                                    )}
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}
                                            className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 rounded-xl text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Tactical Adder */}
                <AnimatePresence>
                    {isAdding ? (
                        <motion.form 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            onSubmit={handleSubmit} 
                            className="pt-2"
                        >
                            <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] p-2 rounded-2xl border-2 border-indigo-500/30 shadow-lg ring-4 ring-indigo-500/5">
                                <div className="p-2 text-indigo-500"><Plus className="w-5 h-5" /></div>
                                <input
                                    autoFocus
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onBlur={() => !title.trim() && setIsAdding(false)}
                                    onKeyDown={e => e.key === 'Escape' && setIsAdding(false)}
                                    placeholder="Enter strategic milestone..."
                                    className="flex-1 text-sm font-bold bg-transparent border-none outline-none focus:ring-0 p-2 text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-medium"
                                    disabled={createMutation.isPending}
                                />
                                {createMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mr-3" />
                                ) : (
                                    <button 
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all mr-1 shadow-md shadow-indigo-600/20"
                                    >
                                        Deploy
                                    </button>
                                )}
                            </div>
                        </motion.form>
                    ) : (
                        subtasks.length === 0 && (
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="w-full py-8 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition-all flex flex-col items-center justify-center gap-2 group"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Initiate Sub-Mission</span>
                            </button>
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TaskSubtasks;
