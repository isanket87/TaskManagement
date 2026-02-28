import { useState } from 'react';
import { Plus, Loader2, X, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import useWorkspaceStore from '../../store/workspaceStore';
import toast from 'react-hot-toast';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const PRIORITY_COLORS = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const QuickTaskCreate = ({ projects = [] }) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [projectId, setProjectId] = useState('');
    const [loading, setLoading] = useState(false);

    const workspace = useWorkspaceStore(s => s.workspace);
    const queryClient = useQueryClient();

    const reset = () => { setTitle(''); setPriority('medium'); setProjectId(''); setOpen(false); };

    const handleCreate = async () => {
        if (!title.trim() || !projectId) {
            toast.error('Please enter a title and select a project');
            return;
        }
        setLoading(true);
        try {
            await api.post(`/workspaces/${workspace.slug}/projects/${projectId}/tasks`, {
                title: title.trim(),
                priority,
                status: 'todo',
            });
            toast.success('Task created!');
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            reset();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            {/* Toggle button */}
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add task
            </button>

            {/* Inline form */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-8 z-30 w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quick Create Task</span>
                            <button onClick={reset} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Title */}
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="Task title..."
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />

                        {/* Project selector */}
                        <div className="relative">
                            <select
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                <option value="">— Select project —</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Priority */}
                        <div className="flex gap-1.5 flex-wrap">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPriority(p)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition ${priority === p
                                            ? PRIORITY_COLORS[p]
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* Create button */}
                        <button
                            onClick={handleCreate}
                            disabled={loading || !title.trim() || !projectId}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create Task</>}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuickTaskCreate;
