import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, MoreHorizontal, ArrowLeft,
    MessageSquare, Clock, AlignLeft,
    CheckCircle2, AlertCircle, PlayCircle,
    Flag, User, Calendar, Plus, Tag, CircleDashed, Layout, AlertTriangle, Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { getAttachments } from '../../services/attachmentService';
import useWorkspaceStore from '../../store/workspaceStore';
import api from '../../services/api';
import Avatar from '../ui/Avatar';
import DueDateBadge from '../due-date/DueDateBadge';
import DateTimePicker from '../due-date/DateTimePicker';
import AttachmentPanel from '../shared/AttachmentPanel';
import Dropdown from '../ui/Dropdown';
import { getPriorityBadgeClass, cn } from '../../utils/helpers';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/constants';
import TaskAttachments from '../tasks/TaskAttachments';

// Helper for status colors
const getStatusLabel = (status) => {
    switch (status) {
        case 'todo': return 'To Do';
        case 'in-progress': return 'In Progress';
        case 'in-review': return 'In Review';
        case 'done': return 'Done';
        default: return status;
    }
};

const PropertyRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-center gap-3 py-1.5 min-h-[32px] group/prop">
        <div className="w-28 shrink-0 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            {Icon && <Icon className="w-4 h-4" />}
            <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center">
            {children}
        </div>
    </div>
);

const TaskDetailPanel = ({ task, projectId, onClose }) => {
    const queryClient = useQueryClient();
    const { workspace } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('details');

    // Core Queries
    const { data: fullTaskData, isLoading } = useQuery({
        queryKey: ['task', projectId, task?.id],
        queryFn: async () => {
            const res = await taskService.getOne(projectId, task.id);
            return res.data.data.task;
        },
        enabled: !!task?.id,
        initialData: task // Use partial data immediately
    });

    const workspaceMembersQuery = useQuery({
        queryKey: ['workspace', workspace?.slug, 'members'],
        queryFn: () => api.get(`/workspaces/${workspace?.slug}/members`),
        enabled: !!workspace?.slug
    });

    const projectDataQuery = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getOne(projectId),
        enabled: !!projectId
    });

    const projectName = projectDataQuery.data?.data?.data?.project?.name || 'Unknown Project';

    const detailedTask = fullTaskData || task;

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');

    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editDescriptionValue, setEditDescriptionValue] = useState('');

    const dueDateRef = useRef(null);
    const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);

    const [isEditingTags, setIsEditingTags] = useState(false);
    const [newTagValue, setNewTagValue] = useState('');

    // Mutations
    const descriptionMutation = useMutation({
        mutationFn: (newDesc) => taskService.update(projectId, detailedTask.id, { description: newDesc }),
        onMutate: async (newDesc) => {
            await queryClient.cancelQueries(['task', projectId, detailedTask.id]);
            const previousTask = queryClient.getQueryData(['task', projectId, detailedTask.id]);
            queryClient.setQueryData(['task', projectId, detailedTask.id], {
                ...previousTask,
                description: newDesc
            });
            // Update globally
            queryClient.setQueryData(['tasks', projectId], old => {
                if (!old?.data?.data?.tasks) return old;
                return {
                    ...old,
                    data: { ...old.data, data: { ...old.data.data, tasks: old.data.data.tasks.map(t => t.id === detailedTask.id ? { ...t, description: newDesc } : t) } }
                };
            });
            return { previousTask };
        },
        onError: (err, newDesc, context) => {
            queryClient.setQueryData(['task', projectId, detailedTask.id], context.previousTask);
            toast.error('Failed to update description');
        }
    });

    const propertyMutation = useMutation({
        mutationFn: (updates) => taskService.update(projectId, detailedTask.id, updates),
        onMutate: async (updates) => {
            await queryClient.cancelQueries(['task', projectId, detailedTask.id]);
            const previousTask = queryClient.getQueryData(['task', projectId, detailedTask.id]);
            queryClient.setQueryData(['task', projectId, detailedTask.id], {
                ...previousTask,
                ...updates
            });
            // Update globally
            queryClient.setQueryData(['tasks', projectId], old => {
                if (!old?.data?.data?.tasks) return old;
                return {
                    ...old,
                    data: { ...old.data, data: { ...old.data.data, tasks: old.data.data.tasks.map(t => t.id === detailedTask.id ? { ...t, ...updates } : t) } }
                };
            });
            return { previousTask };
        },
        onError: (err, updates, context) => {
            queryClient.setQueryData(['task', projectId, detailedTask.id], context.previousTask);
            toast.error('Failed to update property');
        },
        onSettled: () => {
            queryClient.invalidateQueries(['task', projectId, detailedTask.id]);
        }
    });

    const titleMutation = useMutation({
        mutationFn: (newTitle) => taskService.update(projectId, detailedTask.id, { title: newTitle }),
        onMutate: async (newTitle) => {
            await queryClient.cancelQueries(['task', projectId, detailedTask.id]);
            const previousTask = queryClient.getQueryData(['task', projectId, detailedTask.id]);
            queryClient.setQueryData(['task', projectId, detailedTask.id], {
                ...previousTask,
                title: newTitle
            });
            // Update in the tasks list as well to reflect globally
            queryClient.setQueryData(['tasks', projectId], oldData => {
                if (!oldData?.data?.data?.tasks) return oldData;
                return {
                    ...oldData,
                    data: { ...oldData.data, data: { ...oldData.data.data, tasks: oldData.data.data.tasks.map(t => t.id === detailedTask.id ? { ...t, title: newTitle } : t) } }
                };
            });
            return { previousTask };
        },
        onError: (err, newTitle, context) => {
            queryClient.setQueryData(['task', projectId, detailedTask.id], context.previousTask);
            toast.error('Failed to update title');
        },
        onSettled: () => {
            queryClient.invalidateQueries(['task', projectId, detailedTask.id]);
        }
    });

    // Comments Query
    const commentsQuery = useQuery({
        queryKey: ['task', projectId, detailedTask.id, 'comments'],
        queryFn: async () => {
            const res = await taskService.getComments(detailedTask.id);
            return res.data.data.comments;
        },
        enabled: !!detailedTask.id
    });

    // Time Entries Query
    const timeEntriesQuery = useQuery({
        queryKey: ['task', projectId, detailedTask.id, 'time-entries'],
        queryFn: async () => {
            const timeService = await import('../../services/timeService');
            const res = await timeService.getTimeEntries({ taskId: detailedTask.id });
            return res.data.data.entries;
        },
        enabled: !!detailedTask.id
    });

    // Activities Query
    const activitiesQuery = useQuery({
        queryKey: ['task', projectId, detailedTask.id, 'activities'],
        queryFn: async () => {
            const res = await taskService.getActivities(projectId, detailedTask.id);
            return res.data.data.activities;
        },
        enabled: !!detailedTask.id && activeTab === 'activity'
    });

    const manualTimeMutation = useMutation({
        mutationFn: async (data) => {
            const timeService = await import('../../services/timeService');
            return timeService.createEntry({ ...data, projectId: detailedTask.projectId, taskId: detailedTask.id });
        },
        onSuccess: () => {
            toast.success('Time entry added');
            queryClient.invalidateQueries(['task', projectId, detailedTask.id, 'time-entries']);
            queryClient.invalidateQueries(['timesheets']); // sync global page
            queryClient.invalidateQueries(['task', projectId, detailedTask.id]); // re-fetch timeTracked total
        },
        onError: () => toast.error('Failed to add time entry')
    });

    const [commentText, setCommentText] = useState('');
    const commentMutation = useMutation({
        mutationFn: async (text) => {
            return taskService.createComment(detailedTask.id, text);
        },
        onSuccess: () => {
            setCommentText('');
            queryClient.invalidateQueries(['task', projectId, detailedTask.id, 'comments']);
        },
        onError: () => toast.error('Failed to post comment')
    });

    const handleTitleSave = () => {
        const trimmed = editTitleValue.trim();
        if (trimmed && trimmed !== detailedTask.title) {
            titleMutation.mutate(trimmed);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') handleTitleSave();
        if (e.key === 'Escape') setIsEditingTitle(false);
    };

    return (
        <AnimatePresence>
            <div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                />

                <motion.div
                    initial={{ x: '100%', opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0.5 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed top-0 right-0 h-full w-full md:w-[640px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden"
                >
                    {/* Header Top Bar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                {/* Add Project Name Breadcrumb here if available */}
                                Task #{detailedTask.id.slice(0, 6)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors hidden sm:block">
                                ↗ Open full page
                            </button>
                            <Dropdown
                                align="right"
                                trigger={
                                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                }
                                items={[
                                    { label: 'Copy link', onClick: () => toast.success('Link copied') },
                                    { label: 'Duplicate task', onClick: () => toast.success('Comming soon') },
                                    { label: 'Delete task', danger: true, onClick: () => { } }
                                ]}
                            />
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        {[
                            { id: 'details', label: 'Details', icon: AlignLeft },
                            { id: 'attachments', label: 'Attachments', icon: Paperclip },
                            { id: 'activity', label: 'Activity', icon: Clock },
                            { id: 'time', label: 'Time Log', icon: PlayCircle }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                    activeTab === tab.id
                                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-700"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto w-full">
                        {activeTab === 'details' && (
                            <div className="flex flex-col md:flex-row gap-8 p-6 w-full">
                                {/* Left Column: Core Editables */}
                                <div className="flex-1 min-w-0 space-y-8">

                                    {/* TITLE AREA */}
                                    <div className="group relative">
                                        {isEditingTitle ? (
                                            <div className="relative">
                                                <input
                                                    autoFocus
                                                    value={editTitleValue}
                                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                                    onBlur={handleTitleSave}
                                                    onKeyDown={handleTitleKeyDown}
                                                    maxLength={200}
                                                    className="w-full text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight bg-transparent border-none rounded focus:outline-none focus:ring-0 px-1 py-1 -ml-1 pr-12"
                                                />
                                                <span className="absolute right-2 bottom-3 text-[10px] font-medium text-slate-400">
                                                    {editTitleValue.length}/200
                                                </span>
                                            </div>
                                        ) : (
                                            <h1
                                                onClick={() => { setEditTitleValue(detailedTask.title); setIsEditingTitle(true); }}
                                                className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight cursor-text hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-1 py-1 -ml-1 transition-all relative pr-8"
                                            >
                                                {detailedTask.title}
                                            </h1>
                                        )}
                                    </div>

                                    {/* DESCRIPTION AREA */}
                                    <div className="space-y-2 group/desc">
                                        {isEditingDescription ? (
                                            <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm transition-colors focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/50">
                                                {/* Formatting Toolbar */}
                                                <div className="flex items-center gap-1 p-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                                                    {['B', 'I', 'U', '~~', '<>', '• List', '🔗'].map((btn, i) => (
                                                        <button key={i} className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-[11px] font-medium" onClick={(e) => { e.preventDefault(); toast('Formatting coming soon', { icon: '🚧' }); }}>
                                                            {btn}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    autoFocus
                                                    value={editDescriptionValue}
                                                    onChange={(e) => setEditDescriptionValue(e.target.value)}
                                                    placeholder="Describe this task... (supports **bold**, *italic*, `code`)"
                                                    className="w-full min-h-[140px] p-4 text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed resize-y focus:outline-none bg-transparent placeholder:text-slate-400/70 block"
                                                />
                                                <div className="flex justify-end gap-2 p-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                                                    <button onClick={() => setIsEditingDescription(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => { descriptionMutation.mutate(editDescriptionValue); setIsEditingDescription(false); }}
                                                        disabled={descriptionMutation.isPending}
                                                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : detailedTask.description ? (
                                            <div
                                                onClick={() => { setEditDescriptionValue(detailedTask.description); setIsEditingDescription(true); }}
                                                className="prose prose-slate dark:prose-invert max-w-none text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed cursor-text hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-2 -mx-2 transition-colors relative group/block whitespace-pre-wrap min-h-[100px]"
                                            >
                                                {/* Cheap markdown render for simple text until marked.js is added */}
                                                {detailedTask.description}
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => { setEditDescriptionValue(''); setIsEditingDescription(true); }}
                                                className="text-[15px] text-slate-400 dark:text-slate-500 cursor-text hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-2 -mx-2 transition-colors min-h-[100px]"
                                            >
                                                Add a more detailed description...
                                            </div>
                                        )}
                                    </div>

                                    {/* COMMENTS AREA */}
                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                                            <MessageSquare className="w-4 h-4 text-slate-400" /> Discussion
                                        </h3>

                                        {/* Comments List */}
                                        <div className="space-y-4 mb-6">
                                            {commentsQuery.isLoading ? (
                                                <div className="text-center text-sm text-slate-400 py-4">Loading comments...</div>
                                            ) : commentsQuery.data?.length === 0 ? (
                                                <div className="text-center text-sm text-slate-400 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                                    No comments yet. Start the discussion!
                                                </div>
                                            ) : (
                                                commentsQuery.data?.map(comment => (
                                                    <div key={comment.id} className="group flex gap-3">
                                                        <Avatar user={comment.author} />
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                                    {comment.author?.name || 'Unknown'}
                                                                </span>
                                                                <span className="text-xs text-slate-400">
                                                                    {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl rounded-tl-none inline-block border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                                                                {comment.text}
                                                            </div>
                                                            {/* Add delete/edit buttons here if author === currentUser */}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Comment Input */}
                                        <div className="flex gap-3 items-start">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center justify-center font-bold text-sm">
                                                ME
                                            </div>
                                            <div className="flex-1 relative">
                                                <textarea
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    placeholder="Ask a question or post an update..."
                                                    className="w-full min-h-[80px] p-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y transition-all"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            if (commentText.trim() && !commentMutation.isPending) {
                                                                commentMutation.mutate(commentText);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <div className="absolute right-2 bottom-2 flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (commentText.trim() && !commentMutation.isPending) {
                                                                commentMutation.mutate(commentText);
                                                            }
                                                        }}
                                                        disabled={!commentText.trim() || commentMutation.isPending}
                                                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                                    >
                                                        {commentMutation.isPending ? 'Posting...' : 'Comment'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Right Column: Metadata Sidebar */}
                                <div className="w-full md:w-72 shrink-0 space-y-0.5">
                                    {/* STATUS */}
                                    <PropertyRow icon={CircleDashed} label="Status">
                                        <Dropdown
                                            align="left"
                                            trigger={
                                                <button className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 group/btn h-8">
                                                    <span className={cn(
                                                        "w-2.5 h-2.5 rounded-full",
                                                        detailedTask.status === 'done' ? 'bg-emerald-500' :
                                                            detailedTask.status === 'in_progress' ? 'bg-blue-500' :
                                                                detailedTask.status === 'in_review' ? 'bg-purple-500' : 'bg-slate-400'
                                                    )} />
                                                    {STATUS_OPTIONS.find(s => s.value === detailedTask.status)?.label || detailedTask.status}
                                                </button>
                                            }
                                            items={STATUS_OPTIONS.map(status => ({
                                                label: status.label,
                                                active: detailedTask.status === status.value,
                                                onClick: () => {
                                                    if (detailedTask.status !== status.value) {
                                                        propertyMutation.mutate({ status: status.value });
                                                    }
                                                }
                                            }))}
                                        />
                                    </PropertyRow>

                                    {/* PRIORITY */}
                                    <PropertyRow icon={AlertTriangle} label="Priority">
                                        <Dropdown
                                            align="left"
                                            trigger={
                                                <button className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 group/btn h-8">
                                                    <span className={cn(`badge scale-90 origin-left`, getPriorityBadgeClass(detailedTask.priority))}>
                                                        {detailedTask.priority}
                                                    </span>
                                                </button>
                                            }
                                            items={PRIORITY_OPTIONS.map(priority => ({
                                                label: priority.label,
                                                active: detailedTask.priority === priority.value,
                                                onClick: () => {
                                                    if (detailedTask.priority !== priority.value) {
                                                        propertyMutation.mutate({ priority: priority.value });
                                                    }
                                                }
                                            }))}
                                        />
                                    </PropertyRow>

                                    {/* ASSIGNEE */}
                                    <PropertyRow icon={User} label="Assignee">
                                        <Dropdown
                                            align="left"
                                            trigger={
                                                <button className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 group/btn h-8">
                                                    {detailedTask.assignee ? (
                                                        <>
                                                            <Avatar user={detailedTask.assignee} size="xs" />
                                                            <span>{detailedTask.assignee.name}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 flex items-center gap-2">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </button>
                                            }
                                            items={[
                                                {
                                                    label: 'Unassigned',
                                                    active: !detailedTask.assigneeId,
                                                    icon: <User className="w-4 h-4" />,
                                                    onClick: () => propertyMutation.mutate({ assigneeId: null })
                                                },
                                                ...(workspaceMembersQuery.data?.data?.data || []).map(member => ({
                                                    label: member.user.name,
                                                    active: detailedTask.assigneeId === member.user.id,
                                                    icon: <Avatar user={member.user} size="xs" />,
                                                    onClick: () => propertyMutation.mutate({ assigneeId: member.user.id })
                                                }))
                                            ]}
                                        />
                                    </PropertyRow>

                                    {/* DUE DATE */}
                                    <PropertyRow icon={Calendar} label="Due Date">
                                        <div className="relative">
                                            <button
                                                ref={dueDateRef}
                                                onClick={() => setIsDueDatePickerOpen(true)}
                                                className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 group/btn h-8"
                                            >
                                                {detailedTask.dueDate ? (
                                                    <div className="scale-90 origin-left">
                                                        <DueDateBadge
                                                            dueDate={detailedTask.dueDate}
                                                            hasDueTime={detailedTask.hasDueTime}
                                                            taskStatus={detailedTask.status}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 flex items-center gap-2">
                                                        Empty
                                                    </span>
                                                )}
                                            </button>
                                            {isDueDatePickerOpen && (
                                                <DateTimePicker
                                                    referenceRef={dueDateRef}
                                                    value={detailedTask.dueDate}
                                                    hasDueTime={detailedTask.hasDueTime}
                                                    onApply={(date, hasTime) => {
                                                        propertyMutation.mutate({ dueDate: date.toISOString(), hasDueTime: hasTime });
                                                        setIsDueDatePickerOpen(false);
                                                    }}
                                                    onClear={() => {
                                                        propertyMutation.mutate({ dueDate: null, hasDueTime: false });
                                                        setIsDueDatePickerOpen(false);
                                                    }}
                                                    onClose={() => setIsDueDatePickerOpen(false)}
                                                />
                                            )}
                                        </div>
                                    </PropertyRow>

                                    {/* PROJECT */}
                                    <PropertyRow icon={Layout} label="Project">
                                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium truncate max-w-[160px] cursor-default px-2 py-1" title={projectName}>
                                            {projectName}
                                        </span>
                                    </PropertyRow>

                                    <div className="h-4" />

                                    {/* TAGS */}
                                    <PropertyRow icon={Tag} label="Tags">
                                        <div className="flex flex-wrap gap-1.5 items-center pl-2">
                                            {(detailedTask.tags || []).map(tag => (
                                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 group/tag transition-colors">
                                                    {tag}
                                                    <button
                                                        onClick={() => propertyMutation.mutate({ tags: detailedTask.tags.filter(t => t !== tag) })}
                                                        className="w-3.5 h-3.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center opacity-0 group-hover/tag:opacity-100 transition-all text-slate-400 hover:text-red-500 -mr-1"
                                                    >
                                                        <X className="w-2 h-2" />
                                                    </button>
                                                </span>
                                            ))}
                                            {isEditingTags ? (
                                                <input
                                                    autoFocus
                                                    value={newTagValue}
                                                    onChange={(e) => setNewTagValue(e.target.value)}
                                                    onBlur={() => {
                                                        const val = newTagValue.trim();
                                                        if (val && !(detailedTask.tags || []).includes(val)) {
                                                            propertyMutation.mutate({ tags: [...(detailedTask.tags || []), val] });
                                                        }
                                                        setNewTagValue('');
                                                        setIsEditingTags(false);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = newTagValue.trim();
                                                            if (val && !(detailedTask.tags || []).includes(val)) {
                                                                propertyMutation.mutate({ tags: [...(detailedTask.tags || []), val] });
                                                            }
                                                            setNewTagValue('');
                                                            setIsEditingTags(false);
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setIsEditingTags(false);
                                                            setNewTagValue('');
                                                        }
                                                    }}
                                                    placeholder="tag..."
                                                    className="w-20 text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 border border-indigo-500 rounded-md focus:outline-none"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setIsEditingTags(true)}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    + Add
                                                </button>
                                            )}
                                        </div>
                                    </PropertyRow>

                                    <div className="h-4 border-b border-slate-100 dark:border-slate-800/50" />

                                    <div className="pt-4 space-y-2 text-xs text-slate-400 dark:text-slate-500 px-2">
                                        <div className="flex justify-between">
                                            <span>Created by</span>
                                            <span>{detailedTask.createdBy?.name || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Created</span>
                                            <span>{detailedTask.createdAt ? format(new Date(detailedTask.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* TIME TRACKING SUMMARY Minimal */}
                                    <div className="pt-4 px-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" /> Time logged</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {detailedTask.timeTracked ? (detailedTask.timeTracked / 3600).toFixed(1) : '0.0'}h
                                                </span>
                                                <button
                                                    onClick={() => setActiveTab('time')}
                                                    className="text-indigo-500 hover:text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-2 py-0.5 rounded transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="p-6">
                                {activitiesQuery.isLoading ? (
                                    <div className="text-center text-sm text-slate-400 py-4">Loading activities...</div>
                                ) : activitiesQuery.data?.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No Activity Yet</h3>
                                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                                            Changes to this task will appear here over time.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activitiesQuery.data?.map((activity, index, arr) => (
                                            <div key={activity.id} className="flex gap-4 group">
                                                <div className="relative flex flex-col items-center">
                                                    <Avatar user={activity.user} className="w-8 h-8 shrink-0 z-10 ring-4 ring-white dark:ring-slate-900" />
                                                    {index !== arr.length - 1 && (
                                                        <div className="w-px h-full bg-slate-200 dark:bg-slate-700 absolute top-8 bottom-[-16px]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-6 pt-1">
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            {activity.user?.name || 'Unknown User'}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-400 title={new Date(activity.createdAt).toLocaleString()}">
                                                            {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="text-[13px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 inline-block shadow-sm">
                                                        {activity.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'time' && (
                            <div className="p-6 space-y-8">
                                {/* Manual Entry Form */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Plus className="w-4 h-4 text-indigo-500" /> Log Time Manually
                                    </h3>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const h = parseInt(e.target.hours.value) || 0;
                                        const m = parseInt(e.target.minutes.value) || 0;
                                        if (h === 0 && m === 0) return toast.error('Enter duration');
                                        const duration = (h * 3600) + (m * 60);
                                        const now = new Date();
                                        // Fake dates based on duration to meet API struct (endTime is startTime + duration)
                                        const startTime = new Date(now.getTime() - duration * 1000).toISOString();
                                        const endTime = now.toISOString();

                                        manualTimeMutation.mutate({
                                            description: e.target.description.value,
                                            startTime,
                                            endTime,
                                            duration
                                        }, {
                                            onSuccess: () => e.target.reset()
                                        });
                                    }}>
                                        <div className="space-y-4">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Hours</label>
                                                    <input
                                                        type="number"
                                                        name="hours"
                                                        min="0"
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Minutes</label>
                                                    <input
                                                        type="number"
                                                        name="minutes"
                                                        min="0"
                                                        max="59"
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">What did you work on?</label>
                                                <input
                                                    type="text"
                                                    name="description"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    placeholder="E.g., Designed the new header..."
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={manualTimeMutation.isPending}
                                                className="w-full py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {manualTimeMutation.isPending ? 'Saving...' : 'Save Time Entry'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Previous Entries */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Previous Entries</span>
                                        <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md">
                                            {detailedTask.timeTracked ? (detailedTask.timeTracked / 3600).toFixed(1) : '0.0'} hrs total
                                        </span>
                                    </h3>

                                    {timeEntriesQuery.isLoading ? (
                                        <div className="text-center text-sm text-slate-400 py-8">Loading entries...</div>
                                    ) : timeEntriesQuery.data?.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <PlayCircle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-sm text-slate-500">No time logged yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {timeEntriesQuery.data?.map(entry => (
                                                <div key={entry.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 transition-colors group">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-4 mb-1">
                                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                                {entry.description || 'No description provided'}
                                                            </p>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                    {entry.duration ? (entry.duration / 3600).toFixed(2) : '--'}
                                                                    <span className="text-xs font-medium text-slate-400 ml-1">hrs</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(entry.startTime), 'MMM d, yyyy')}</span>
                                                            <span className="flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> {format(new Date(entry.startTime), 'h:mm a')} - {entry.endTime ? format(new Date(entry.endTime), 'h:mm a') : 'Now'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'attachments' && (
                            <div className="p-6">
                                <TaskAttachments taskId={detailedTask.id} />
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TaskDetailPanel;
