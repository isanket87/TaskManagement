import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../store/workspaceStore';
import * as timeService from '../../services/timeService';
import { projectService } from '../../services/projectService';
import toast from 'react-hot-toast';

const pad = (n) => String(Math.floor(n)).padStart(2, '0');

const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const GlobalTimerBar = () => {
    const queryClient = useQueryClient();

    const [showStart, setShowStart] = useState(false);
    const [desc, setDesc] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const { workspace } = useWorkspaceStore();

    // Use the same query key as the Projects page so React Query serves cached data — no duplicate fetch
    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspace?.slug],
        queryFn: async () => {
            const res = await projectService.getAll();
            return res.data;
        },
        enabled: !!workspace?.slug,
        staleTime: 2 * 60 * 1000,
    });
    const projects = projectsData?.data?.projects || [];

    // Fetch active timer globally
    const activeTimerQuery = useQuery({
        queryKey: ['active-timer', workspace?.id],
        queryFn: async () => {
            const res = await timeService.getActive();
            return res.data.data.entry || null;
        },
        refetchInterval: 60000, // Refresh every minute
        enabled: !!workspace?.id // Only fetch if we have an active workspace loaded
    });

    const activeEntry = activeTimerQuery.data;

    useEffect(() => {
        let interval;
        if (activeEntry) {
            // Calculate elapsed based on startTime
            const startTime = new Date(activeEntry.startTime).getTime();
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [activeEntry]);

    const startMutation = useMutation({
        mutationFn: (data) => timeService.createEntry(data),
        onSuccess: (res) => {
            queryClient.setQueryData(['active-timer', workspace?.id], res.data.data.entry);
            setShowStart(false);
            setDesc('');
            toast.success('Timer started');
            // If viewing a task's time log, invalidate it
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['time-summary'] });
        },
        onError: () => toast.error('Failed to start timer')
    });

    const stopMutation = useMutation({
        mutationFn: () => timeService.stopTimer(activeEntry.id),
        onSuccess: () => {
            toast.success(`Stopped — ${formatTime(elapsedSeconds)}`);
            queryClient.setQueryData(['active-timer', workspace?.id], null);
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['time-summary'] });
            // The task-specific time entries will be invalidated if they are mounted
            if (activeEntry?.taskId) {
                queryClient.invalidateQueries({ queryKey: ['task', activeEntry.projectId, activeEntry.taskId, 'time-entries'] });
            }
        },
        onError: () => toast.error('Failed to stop timer')
    });

    const loading = startMutation.isPending || stopMutation.isPending;

    const handleStart = (e) => {
        e.preventDefault();
        if (!selectedProject) { toast.error('Select a project first'); return; }
        startMutation.mutate({ description: desc, projectId: selectedProject });
    };

    const handleStop = () => {
        if (!activeEntry) return;
        stopMutation.mutate();
    };

    return (
        <>
            {/* Active Timer Bar */}
            <AnimatePresence>
                {activeEntry && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-slate-950 border border-slate-700 h-14 rounded-2xl px-4 flex items-center gap-4 shadow-2xl min-w-[320px] sm:min-w-[400px]"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex items-center justify-center w-3 h-3">
                                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-white font-mono font-medium tracking-tight text-lg">{formatTime(elapsedSeconds)}</span>

                            <div className="flex-1 min-w-0 border-l border-slate-700 pl-3 ml-1 flex flex-col justify-center">
                                <span className="text-slate-300 text-sm font-medium truncate leading-tight">
                                    {activeEntry.description || 'No description'}
                                </span>
                                {activeEntry.projectName && (
                                    <span className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                                        {activeEntry.projectName}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleStop}
                            disabled={loading}
                            className="flex items-center justify-center w-8 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                            title="Stop Timer"
                        >
                            <Square size={14} fill="currentColor" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating start button when no timer running */}
            {!activeEntry && (
                <button
                    id="global-timer-start-btn"
                    onClick={() => setShowStart(s => !s)}
                    className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
                    title="Start Timer"
                >
                    <Play size={24} fill="currentColor" className="ml-1 pointer-events-none" />
                </button>
            )}

            {/* Quick start popover */}
            <AnimatePresence>
                {showStart && !activeEntry && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed bottom-24 right-6 z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5"
                    >
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-600 dark:text-indigo-400 pointer-events-none" />
                            New Time Entry
                        </h4>
                        <form onSubmit={handleStart} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">What are you working on?</label>
                                <input
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Task description..."
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Project</label>
                                <select
                                    value={selectedProject}
                                    onChange={e => setSelectedProject(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                >
                                    <option value="">Select project…</option>
                                    {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 mt-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Play size={16} fill="currentColor" />
                                Start Timer
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default GlobalTimerBar;
