import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    X, Calendar, Clock, User, Tag, Paperclip, MessageSquare, 
    MoreVertical, Trash2, CheckCircle2, CircleDashed, AlertTriangle, 
    Hash, History, Layout, Timer, ChevronRight, ArrowLeft, Maximize2, 
    Minimize2, Send, Activity, Sparkles, RefreshCw, Flag, Repeat, Target, Copy, ExternalLink, Plus, AlignLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import * as timeService from '../../services/timeService';
import useWorkspaceStore from '../../store/workspaceStore';
import useFocusStore from '../../store/focusStore';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import RichTextEditor from '../ui/RichTextEditor';
import DueDateBadge from '../due-date/DueDateBadge';
import DateTimePicker from '../due-date/DateTimePicker';
import AttachmentPanel from './AttachmentPanel';
import TaskSubtasks from './TaskSubtasks';
import TaskDependencies from './TaskDependencies';
import ActivityFeed from './ActivityFeed';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/constants';
import { getPriorityBadgeClass, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CentricProperty = ({ icon: Icon, label, value, onClick, children, className }) => (
    <div 
        className={cn(
            "flex items-center gap-2.5 p-2 rounded-lg transition-all border border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer group/prop relative",
            className
        )} 
        onClick={onClick}
    >
        <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 opacity-60 group-hover/prop:opacity-100 transition-opacity">
            <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">{label}</span>
            <div className="truncate">
                {children || <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{value || 'None'}</span>}
            </div>
        </div>
    </div>
);

const TaskDetailPanel = ({ task, projectId, onClose, onTaskSelect }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('details');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagValue, setNewTagValue] = useState('');
    const [aiSummary, setAiSummary] = useState(null);
    const [isAddingTimeSession, setIsAddingTimeSession] = useState(false);
    const [timeSessionHours, setTimeSessionHours] = useState('');
    const [timeSessionDesc, setTimeSessionDesc] = useState('');
    const dueDateRef = useRef(null);
    const descriptionTimeoutRef = useRef(null);

    const enterFocusMode = useFocusStore(state => state.enterFocusMode);

    const { data: detailedTask, isLoading } = useQuery({
        queryKey: ['task', projectId, task?.id],
        queryFn: async () => {
            const res = await taskService.getOne(projectId, task.id);
            return res.data.data.task;
        },
        enabled: !!task?.id,
        placeholderData: task
    });

    const attachmentsQuery = useQuery({
        queryKey: ['task', projectId, task?.id, 'attachments'],
        queryFn: async () => {
            const res = await taskService.getAttachments(task.id);
            return res.data.data.attachments;
        },
        enabled: !!task?.id
    });

    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getOne(projectId),
        enabled: !!projectId
    });

    const commentsQuery = useQuery({
        queryKey: ['task', projectId, task?.id, 'comments'],
        queryFn: async () => {
            const res = await taskService.getComments(task.id);
            return res.data.data.comments;
        },
        enabled: !!task?.id
    });

    const activitiesQuery = useQuery({
        queryKey: ['task', projectId, task?.id, 'activities'],
        queryFn: async () => {
            const res = await taskService.getActivities(projectId, task.id);
            return res.data.data.activities;
        },
        enabled: !!task?.id && activeTab === 'activity'
    });

    const timeEntriesQuery = useQuery({
        queryKey: ['task', projectId, task?.id, 'time-entries'],
        queryFn: async () => {
            const res = await timeService.getTimeEntries({ taskId: task.id });
            return res.data.data.entries;
        },
        enabled: !!task?.id
    });

    const totalTimeTracked = useMemo(() => {
        if (timeEntriesQuery.data) {
            return timeEntriesQuery.data.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        }
        return detailedTask?.timeTracked || 0;
    }, [timeEntriesQuery.data, detailedTask?.timeTracked]);

    const workspaceMembersQuery = useQuery({
        queryKey: ['workspace', useWorkspaceStore.getState().currentWorkspace?.id, 'members'],
        queryFn: () => projectService.getMembers(projectId),
        enabled: !!projectId
    });

    const propertyMutation = useMutation({
        mutationFn: (updates) => taskService.update(projectId, detailedTask.id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', projectId, detailedTask.id]);
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success('Task updated');
        },
        onError: (err) => {
            console.error('Update failed:', err);
            toast.error(err.response?.data?.message || 'Update failed');
        }
    });

    const commentMutation = useMutation({
        mutationFn: (text) => taskService.createComment(detailedTask.id, text),
        onSuccess: () => {
            setCommentText('');
            queryClient.invalidateQueries(['task', projectId, detailedTask.id, 'comments']);
            toast.success('Comment added');
        }
    });

    const summarizeMutation = useMutation({
        mutationFn: () => taskService.summarizeComments(detailedTask.id),
        onSuccess: (res) => {
            setAiSummary(res.data.data.summary);
            toast.success('AI Summary generated');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: () => taskService.duplicate(projectId, detailedTask.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks', projectId]);
            onClose();
            toast.success('Task duplicated');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => taskService.delete(projectId, detailedTask.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks', projectId]);
            onClose();
            toast.success('Task deleted');
        }
    });

    useEffect(() => {
        if (detailedTask) {
            setEditTitleValue(detailedTask.title);
        }
    }, [detailedTask?.id]);

    const handleTitleSave = () => {
        if (editTitleValue.trim() && editTitleValue !== detailedTask.title) {
            propertyMutation.mutate({ title: editTitleValue });
        }
        setIsEditingTitle(false);
    };

    const handleDescriptionChange = (val) => {
        setIsEditingDescription(true);
        if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
        
        descriptionTimeoutRef.current = setTimeout(() => {
            if (val !== detailedTask.description) {
                propertyMutation.mutate({ description: val });
            }
            setIsEditingDescription(false);
        }, 1000);
    };

    const handleTagAdd = () => {
        if (newTagValue.trim()) {
            const updatedTags = [...(detailedTask.tags || []), newTagValue.trim()];
            propertyMutation.mutate({ tags: updatedTags });
            setNewTagValue('');
            setIsAddingTag(false);
        }
    };

    const handleTagDelete = (tagToDelete) => {
        const updatedTags = (detailedTask.tags || []).filter(t => t !== tagToDelete);
        propertyMutation.mutate({ tags: updatedTags });
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?task=${detailedTask.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied');
    };

    const handleManualTimeLog = async () => {
        if (!timeSessionHours || isNaN(timeSessionHours)) return toast.error('Enter valid hours');
        try {
            await timeService.createEntry({
                taskId: detailedTask.id,
                projectId: projectId,
                duration: parseFloat(timeSessionHours) * 3600,
                description: timeSessionDesc || 'Manual Entry',
                date: new Date().toISOString(),
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + parseFloat(timeSessionHours) * 3600 * 1000).toISOString()
            });
            queryClient.invalidateQueries(['task', projectId, detailedTask.id, 'time-entries']);
            queryClient.invalidateQueries(['task', projectId, detailedTask.id]);
            setIsAddingTimeSession(false);
            setTimeSessionHours('');
            setTimeSessionDesc('');
            toast.success('Time logged');
        } catch (err) {
            console.error('Time log error:', err);
            toast.error(err.response?.data?.message || 'Failed to log time');
        }
    };

    if (!detailedTask) return null;

    const projectName = projectData?.data?.data?.project?.name || 'Project';
    const membersList = workspaceMembersQuery.data?.data?.data?.members || [];
    const statusObj = STATUS_OPTIONS.find(s => s.value === detailedTask.status) || { label: 'Unknown', color: '#64748b' };
    const priorityObj = PRIORITY_OPTIONS.find(p => p.value === detailedTask.priority) || { label: 'Medium', color: '#64748b' };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 lg:p-16 overflow-hidden">
            <div onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" />

            <div className={cn(
                "relative w-full glass-premium flex flex-col overflow-hidden bg-white/95 dark:bg-slate-900/95",
                isFullscreen ? "h-full max-w-none rounded-none" : "h-[90vh] max-w-[1400px] rounded-[3rem] shadow-ultra border border-white/20 dark:border-white/5"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-4 shrink-0 relative z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all group border border-transparent">
                            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                <span className="hover:text-indigo-500 cursor-pointer transition-colors" onClick={() => navigate(`/projects/${projectId}`)}>{projectName}</span>
                                <ChevronRight className="w-2.5 h-2.5 opacity-30" />
                                <span className={cn("px-1.5 py-0.5 rounded font-bold", getPriorityBadgeClass(detailedTask.priority))}>{priorityObj.label} Priority</span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400/60 flex items-center gap-1">
                                <Hash className="w-2.5 h-2.5" />
                                {detailedTask?.id?.slice(0, 8)}
                            </span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                        {[
                            { id: 'details', label: 'Details', icon: Layout },
                            { id: 'attachments', label: 'Attachments', icon: Paperclip, count: attachmentsQuery.data?.length },
                            { id: 'activity', label: 'Activity', icon: History, count: activitiesQuery.data?.length },
                            { id: 'timelog', label: 'Time Log', icon: Timer },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                    activeTab === tab.id ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black", activeTab === tab.id ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 dark:bg-white/10 text-slate-500")}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button onClick={() => enterFocusMode(detailedTask)} className="p-2 rounded-xl bg-indigo-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Focus</span>
                        </button>
                        <Dropdown
                            align="right"
                            trigger={<button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all"><MoreVertical className="w-5 h-5" /></button>}
                            items={[
                                { icon: <Copy className="w-4 h-4" />, label: 'Duplicate', onClick: () => duplicateMutation.mutate() },
                                { icon: <ExternalLink className="w-4 h-4" />, label: 'Copy Link', onClick: handleCopyLink },
                                { separator: true },
                                { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', danger: true, onClick: () => deleteMutation.mutate() },
                            ]}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                    {activeTab === 'details' && (
                        <div className="flex flex-col lg:flex-row min-h-full">
                            <div className="flex-1 p-6 lg:p-10 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider">
                                            <Clock className="w-3 h-3" />
                                            {(totalTimeTracked / 3600).toFixed(1)}h logged
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {detailedTask.subtasks?.filter(s => s.status === 'done').length || 0}/{detailedTask.subtasks?.length || 0} subtasks
                                        </div>
                                    </div>
                                    <div className="group relative">
                                        {isEditingTitle ? (
                                            <textarea autoFocus value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleTitleSave()} className="w-full text-xl lg:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 leading-tight text-slate-900 dark:text-white resize-none tracking-tight" rows={1} />
                                        ) : (
                                            <h1 onClick={() => setIsEditingTitle(true)} className="text-xl lg:text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white cursor-text hover:text-indigo-600 transition-colors">{detailedTask.title || 'Untitled Task'}</h1>
                                        )}
                                    </div>
                                </div>

                                <section className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <AlignLeft className="w-3.5 h-3.5" />
                                            <h2 className="text-[10px] font-bold uppercase tracking-wider leading-none">Description</h2>
                                        </div>
                                        {isEditingDescription && <span className="text-[9px] font-bold text-indigo-500 animate-pulse uppercase tracking-wider">Saving...</span>}
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-slate-200/60 dark:border-white/10 focus-within:border-indigo-500/50 transition-all bg-slate-50/50 dark:bg-white/[0.02]">
                                        <RichTextEditor value={detailedTask.description || ''} onChange={handleDescriptionChange} placeholder="Add a description..." />
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider leading-none">Subtasks</h2>
                                    </div>
                                    <TaskSubtasks parentTaskId={detailedTask.id} projectId={projectId} subtasks={detailedTask.subtasks || []} onTaskSelect={onTaskSelect} />
                                </section>

                                <section className="space-y-6 pt-8 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500"><MessageSquare className="w-4 h-4" /></div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Comments</h3>
                                        </div>
                                        <button onClick={() => summarizeMutation.mutate()} disabled={summarizeMutation.isPending} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all">
                                            {summarizeMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-indigo-500" />} AI Summary
                                        </button>
                                    </div>

                                    {aiSummary && (
                                        <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/[0.03] border border-indigo-100 dark:border-indigo-500/20 relative overflow-hidden">
                                            <div className="flex items-center gap-2 mb-3"><div className="w-1.5 h-3.5 bg-indigo-500 rounded-full" /><p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">AI Insight</p></div>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">"{aiSummary}"</p>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-6">
                                        <div className="space-y-5">
                                            {commentsQuery.data?.map(comment => (
                                                <div key={comment.id} className="flex gap-3 group/comment">
                                                    <Avatar user={comment.author} size="sm" className="mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{comment.author?.name}</span>
                                                            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                                                        </div>
                                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-sm text-slate-700 dark:text-slate-300 shadow-sm leading-relaxed">{comment.text}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!commentsQuery.data || commentsQuery.data.length === 0) && (
                                                <div className="text-center py-12 rounded-xl bg-slate-50/30 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/5">
                                                    <MessageSquare className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2 opacity-50" />
                                                    <p className="text-[11px] font-medium text-slate-400">No comments yet.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex-1 relative">
                                                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl p-3 pr-16 text-sm font-medium outline-none min-h-[80px] resize-none" placeholder="Write a comment..." />
                                                <button disabled={!commentText.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate(commentText)} className="absolute right-2 bottom-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-700 transition-all flex items-center gap-1.5">
                                                    {commentMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="w-full lg:w-[300px] bg-slate-50/30 dark:bg-slate-900/40 border-l border-slate-200/50 dark:border-white/5 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="space-y-1">
                                    <div className="grid grid-cols-2 gap-1">
                                        <Dropdown align="left" fullWidth trigger={<CentricProperty icon={CircleDashed} label="Status"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusObj.color }} /><span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{statusObj.label}</span></div></CentricProperty>} items={STATUS_OPTIONS.map(s => ({ label: s.label, icon: <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />, onClick: () => propertyMutation.mutate({ status: s.value }) }))} />
                                        <Dropdown align="left" fullWidth trigger={<CentricProperty icon={AlertTriangle} label="Priority"><span className={cn("text-[11px] font-bold uppercase", getPriorityBadgeClass(detailedTask.priority))}>{priorityObj.label}</span></CentricProperty>} items={PRIORITY_OPTIONS.map(p => ({ label: p.label, icon: <Flag className={cn("w-3 h-3", getPriorityBadgeClass(p.value))} />, onClick: () => propertyMutation.mutate({ priority: p.value }) }))} />
                                    </div>

                                    <Dropdown align="left" fullWidth trigger={<CentricProperty icon={User} label="Assignee">{detailedTask.assignee ? (<div className="flex items-center gap-2"><Avatar user={detailedTask.assignee} size="xs" /><span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{detailedTask.assignee.name}</span></div>) : <span className="text-[11px] font-medium text-slate-400 italic">Unassigned</span>}</CentricProperty>} items={membersList.map(m => ({ label: m.user?.name || m.user?.email, icon: <Avatar user={m.user} size="xs" />, onClick: () => propertyMutation.mutate({ assigneeId: m.user?.id || m.userId }) }))} />

                                    <div ref={dueDateRef} className="relative w-full">
                                        <CentricProperty icon={Calendar} label="Due Date" onClick={() => setIsDueDatePickerOpen(true)}><DueDateBadge dueDate={detailedTask.dueDate} hasDueTime={detailedTask.hasDueTime} taskStatus={detailedTask.status} compact /></CentricProperty>
                                    </div>
                                    {isDueDatePickerOpen && (
                                        <DateTimePicker referenceRef={dueDateRef} value={detailedTask.dueDate} hasDueTime={detailedTask.hasDueTime} onApply={(date, hasTime) => { propertyMutation.mutate({ dueDate: date.toISOString(), hasDueTime: hasTime }); setIsDueDatePickerOpen(false); }} onClear={() => { propertyMutation.mutate({ dueDate: null, hasDueTime: false }); setIsDueDatePickerOpen(false); }} onClose={() => setIsDueDatePickerOpen(false)} />
                                    )}

                                    <Dropdown align="left" fullWidth trigger={<CentricProperty icon={Repeat} label="Recurrence"><span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{detailedTask.recurrenceRule || detailedTask.recurrence || 'None'}</span></CentricProperty>} items={[{ label: 'None', onClick: () => propertyMutation.mutate({ recurrence: null, isRecurring: false }) }, { label: 'Daily', icon: <RefreshCw className="w-3 h-3" />, onClick: () => propertyMutation.mutate({ recurrence: 'daily', isRecurring: true }) }, { label: 'Weekly', icon: <RefreshCw className="w-3 h-3" />, onClick: () => propertyMutation.mutate({ recurrence: 'weekly', isRecurring: true }) }, { label: 'Monthly', icon: <RefreshCw className="w-3 h-3" />, onClick: () => propertyMutation.mutate({ recurrence: 'monthly', isRecurring: true }) }]} />
                                    
                                    <CentricProperty icon={Clock} label="Total Time" onClick={() => setActiveTab('timelog')}><span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{(totalTimeTracked / 3600).toFixed(1)}h</span></CentricProperty>

                                    <CentricProperty icon={Tag} label="Tags">
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                            {(detailedTask.tags || []).map(tag => (<span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold border border-indigo-100 dark:border-indigo-500/20 group/tag">{tag}<X className="w-2 h-2 cursor-pointer opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-rose-500" onClick={(e) => { e.stopPropagation(); handleTagDelete(tag); }} /></span>))}
                                            {isAddingTag ? (<input autoFocus className="w-16 bg-white dark:bg-slate-800 border border-indigo-500/30 rounded px-1 py-0.5 text-[9px] font-bold outline-none" placeholder="..." value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)} onBlur={() => !newTagValue && setIsAddingTag(false)} onKeyDown={(e) => e.key === 'Enter' && handleTagAdd()} />) : (<button onClick={(e) => { e.stopPropagation(); setIsAddingTag(true); }} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 px-1">+ Add</button>)}
                                        </div>
                                    </CentricProperty>
                                </div>

                                <div className="w-full h-px bg-slate-200/50 dark:bg-white/5" />

                                <section className="space-y-3 px-1">
                                    <div className="flex items-center gap-2 text-slate-400"><Hash className="w-3.5 h-3.5" /><h2 className="text-[10px] font-bold uppercase tracking-widest leading-none">Dependencies</h2></div>
                                    <TaskDependencies taskId={detailedTask.id} projectId={projectId} onTaskSelect={onTaskSelect} />
                                </section>

                                <div className="pt-4 space-y-2 px-1 opacity-50">
                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter text-slate-400"><span>Created By</span><span className="text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{detailedTask.createdBy?.name || 'System'}</span></div>
                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter text-slate-400"><span>Created At</span><span className="text-slate-600 dark:text-slate-300">{detailedTask.createdAt ? format(new Date(detailedTask.createdAt), 'MMM d, yyyy') : 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attachments' && (
                        <div className="p-6 lg:p-8 max-w-6xl mx-auto min-h-full">
                            <div className="rounded-xl border border-slate-200/60 dark:border-white/10 p-6 bg-white/50 dark:bg-slate-900/50 shadow-sm">
                                <AttachmentPanel 
                                    taskId={detailedTask.id} 
                                    attachments={attachmentsQuery.data || []} 
                                    onAttachmentsChange={(newAtts) => queryClient.setQueryData(['task', projectId, detailedTask.id, 'attachments'], newAtts)} 
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="p-6 lg:p-8 max-w-6xl mx-auto min-h-full">
                            <div className="rounded-xl border border-slate-200/60 dark:border-white/10 p-6 bg-white/50 dark:bg-slate-900/50 shadow-sm">
                                <ActivityFeed activities={activitiesQuery.data || []} isLoading={activitiesQuery.isLoading} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'timelog' && (
                        <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 min-h-full">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="col-span-1 p-8 rounded-xl bg-indigo-600 text-white shadow-lg flex flex-col items-center justify-center space-y-2">
                                    <Timer className="w-8 h-8 opacity-50" /><p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Time</p>
                                    <p className="text-5xl font-black tracking-tighter">{(totalTimeTracked / 3600).toFixed(1)}<span className="text-2xl ml-1 opacity-50 font-bold lowercase">h</span></p>
                                </div>
                                
                                <div className="col-span-2 p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer bg-white/50 dark:bg-slate-900/50 group">
                                    {isAddingTimeSession ? (
                                        <div className="w-full space-y-6">
                                            <div className="flex items-center justify-between"><h4 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Log Time</h4><button onClick={() => setIsAddingTimeSession(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5 text-slate-400" /></button></div>
                                            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Hours</label><input type="number" step="0.1" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 outline-none" placeholder="1.5" value={timeSessionHours} onChange={(e) => setTimeSessionHours(e.target.value)} /></div><div className="space-y-2"><label className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Description</label><input className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 outline-none" placeholder="Notes..." value={timeSessionDesc} onChange={(e) => setTimeSessionDesc(e.target.value)} /></div></div>
                                            <button onClick={handleManualTimeLog} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all text-xs">Submit Log</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center" onClick={() => setIsAddingTimeSession(true)}><div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all text-indigo-500 shadow-sm"><Plus className="w-6 h-6" /></div><p className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Add Time</p></div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6"><h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" />Time History</h3><div className="space-y-3">{timeEntriesQuery.data?.map((entry) => (<div key={entry.id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 group hover:border-indigo-500/30 transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500"><Clock className="w-5 h-5" /></div><div><p className="text-sm font-bold text-slate-900 dark:text-white">{entry.description || 'Time Entry'}</p><p className="text-[10px] text-slate-400 font-medium">{format(new Date(entry.createdAt), 'MMM d, yyyy')}</p></div></div><div className="flex items-center gap-6"><span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{(entry.duration / 3600).toFixed(1)}h</span><button onClick={() => { toast.promise(timeService.deleteEntry(entry.id), { loading: 'Deleting...', success: 'Deleted', error: 'Error' }).then(() => { queryClient.invalidateQueries(['task', projectId, detailedTask.id, 'time-entries']); queryClient.invalidateQueries(['task', projectId, detailedTask.id]); }); }} className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button></div></div>))}{(!timeEntriesQuery.data || timeEntriesQuery.data.length === 0) && (<p className="text-center py-12 text-xs font-medium text-slate-400 italic">No time logs recorded.</p>)}</div></div>
                        </div>
                    )}
                </div>

                {activeTab === 'details' && !aiSummary && (
                    <button onClick={() => summarizeMutation.mutate()} disabled={summarizeMutation.isPending} className="absolute bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl transition-all group disabled:opacity-50">
                        {summarizeMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}<span className="font-bold text-[10px] uppercase tracking-wider">AI Summary</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TaskDetailPanel;
