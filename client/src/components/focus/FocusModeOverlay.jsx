import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Target, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import useFocusStore from '../../store/focusStore';
import useWorkspaceStore from '../../store/workspaceStore';
import * as timeService from '../../services/timeService';
import { getPriorityBadgeClass, cn } from '../../utils/helpers';
import RichTextEditor from '../ui/RichTextEditor';
import { marked } from 'marked';

const isHtml = (str) => str && /<[a-z][\s\S]*>/i.test(str);
const normalizeDescription = (desc) => {
    if (!desc) return '';
    if (isHtml(desc)) return desc;
    return marked.parse(desc);
};

const pad = (n) => String(Math.floor(n)).padStart(2, '0');
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default function FocusModeOverlay() {
    const { isFocusModeOpen, focusTask, exitFocusMode } = useFocusStore();
    const { workspace } = useWorkspaceStore();
    const queryClient = useQueryClient();

    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Global active timer query
    const activeTimerQuery = useQuery({
        queryKey: ['active-timer', workspace?.id],
        queryFn: async () => {
            const res = await timeService.getActive();
            return res.data.data.entry || null;
        },
        enabled: isFocusModeOpen && !!workspace?.id,
        refetchInterval: 60000,
    });

    const activeEntry = activeTimerQuery.data;

    // Timer Tick
    useEffect(() => {
        let interval;
        if (activeEntry && activeEntry.taskId === focusTask?.id) {
            const startTime = new Date(activeEntry.startTime).getTime();
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [activeEntry, focusTask?.id]);

    const startMutation = useMutation({
        mutationFn: () => timeService.createEntry({
            description: `Focus Session: ${focusTask?.title}`,
            projectId: focusTask?.projectId,
            taskId: focusTask?.id
        }),
        onSuccess: (res) => {
            queryClient.setQueryData(['active-timer', workspace?.id], res.data.data.entry);
            toast.success('Focus session started');
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
        onError: () => toast.error('Failed to start focus session')
    });

    const stopMutation = useMutation({
        mutationFn: () => timeService.stopTimer(activeEntry.id),
        onSuccess: () => {
            toast.success(`Session logged — ${formatTime(elapsedSeconds)}`);
            queryClient.setQueryData(['active-timer', workspace?.id], null);
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            if (activeEntry?.taskId) {
                queryClient.invalidateQueries({ queryKey: ['task', activeEntry.projectId, activeEntry.taskId, 'time-entries'] });
            }
        },
        onError: () => toast.error('Failed to stop session')
    });

    const isTimerLoading = startMutation.isPending || stopMutation.isPending;

    // Don't render if not open or no task provided
    if (!isFocusModeOpen || !focusTask) return null;

    const isTimerRunning = activeEntry && activeEntry.taskId === focusTask.id;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden"
            >
                {/* ── Cinematic Ambient Background ── */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.3, 0.4, 0.3],
                            rotate: [0, 5, 0]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-500/20 dark:bg-indigo-900/30 blur-[120px]"
                    />
                    <motion.div
                        animate={{
                            scale: [1, 1.08, 1],
                            opacity: [0.2, 0.3, 0.2],
                            rotate: [0, -5, 0]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                        className="absolute top-[40%] -right-[20%] w-[80vw] h-[80vw] rounded-full bg-violet-500/20 dark:bg-violet-900/30 blur-[120px]"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[100px]" />
                </div>

                {/* ── Header Toolbar ── */}
                <div className="relative z-10 flex items-center justify-between p-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 dark:bg-slate-800/50 backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                            <Target className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Focus Engine</h2>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Deep Zen Mode</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={exitFocusMode}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-slate-700/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 font-medium text-sm transition-all shadow-sm"
                    >
                        <X className="w-4 h-4" />
                        Exit Focus
                    </button>
                </div>

                {/* ── Main Canvas ── */}
                <div className="relative z-10 flex-1 flex items-center justify-center p-6 h-full min-h-0">
                    <div className="w-full max-w-4xl h-full flex flex-col items-center">
                        
                        {/* Task Card */}
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.1 }}
                            className="w-full bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 rounded-[32px] p-10 md:p-14 shadow-2xl flex-1 flex flex-col relative overflow-hidden"
                        >
                            {/* Inner ambient glow */}
                            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 blur-[80px] pointer-events-none rounded-full" />
                            
                            <div className="mb-8 flex items-center gap-4 relative z-10">
                                <span className={cn(`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider`, getPriorityBadgeClass(focusTask.priority))}>
                                    {focusTask.priority}
                                </span>
                                <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" />
                                    {focusTask.taskKey || `Task #${focusTask.id.substring(0,6)}`}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8 relative z-10">
                                {focusTask.title}
                            </h1>

                            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                                {focusTask.description ? (
                                    <div 
                                        className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: normalizeDescription(focusTask.description) }}
                                    />
                                ) : (
                                    <p className="text-slate-400 dark:text-slate-500 italic text-lg">No description provided for this task.</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Pomodoro Timer Engine */}
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.2 }}
                            className="mt-8 flex flex-col items-center"
                        >
                            <div className="flex items-center gap-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 rounded-full p-4 pl-8 shadow-xl">
                                
                                <div className="flex items-center gap-4 flex-1">
                                    {isTimerRunning && (
                                        <div className="relative flex items-center justify-center w-4 h-4 mr-2">
                                            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                            <span className="relative inline-flex rounded-full w-3 h-3 bg-emerald-500" />
                                        </div>
                                    )}
                                    <span className={cn(
                                        "font-mono text-5xl font-bold tracking-tight",
                                        isTimerRunning ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                                    )}>
                                        {formatTime(elapsedSeconds)}
                                    </span>
                                </div>

                                <div className="h-12 w-px bg-slate-200/50 dark:bg-slate-700/50 mx-2" />

                                {isTimerRunning ? (
                                    <button
                                        onClick={() => stopMutation.mutate()}
                                        disabled={isTimerLoading}
                                        className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shadow-sm disabled:opacity-50"
                                        title="Stop Session"
                                    >
                                        <Square fill="currentColor" className="w-6 h-6" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => startMutation.mutate()}
                                        disabled={isTimerLoading}
                                        className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-1 disabled:opacity-50"
                                        title="Start Deep Work"
                                    >
                                        <Play fill="currentColor" className="w-8 h-8 ml-1" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
