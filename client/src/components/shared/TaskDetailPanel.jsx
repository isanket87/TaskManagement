import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, MoreHorizontal, ArrowLeft,
    MessageSquare, Clock, AlignLeft,
    CheckCircle2, AlertCircle, PlayCircle, RefreshCw,
    Flag, User, Calendar, Plus, Tag, CircleDashed, Layout, AlertTriangle, Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import useWorkspaceStore from '../../store/workspaceStore';
import api from '../../services/api';
import Avatar from '../ui/Avatar';
import DueDateBadge from '../due-date/DueDateBadge';
import DateTimePicker from '../due-date/DateTimePicker';
import Dropdown from '../ui/Dropdown';
import { getPriorityBadgeClass, cn } from '../../utils/helpers';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/constants';
import TaskAttachments from '../tasks/TaskAttachments';
import TaskDependencies from './TaskDependencies';
import TaskSubtasks from './TaskSubtasks';
import RichTextEditor from '../ui/RichTextEditor';

// Helper for status colors
const getStatusLabel = (status) => {
    switch (status) {
        case 'todo': return 'To Do';
        case 'in-progress': return 'In Progress';
        case 'in-review': return 'In Review';
        case 'done': return 'Done';
        default: return status || 'To Do';
    }
};

const PropertyRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-center gap-3 py-1.5 min-h-[32px] group/prop">
        <div className="w-28 shrink-0 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            {Icon && <Icon className="w-4 h-4" />}
            <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center">{children}</div>
    </div>
);

const TaskDetailPanel = ({ task, projectId, onClose, onTaskSelect }) => {
    const queryClient = useQueryClient();
    const { workspace } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('details');

    const safeArray = (arr) => Array.isArray(arr) ? arr : [];

    // Core Queries
    const { data: fullTaskData } = useQuery({
        queryKey: ['task', projectId, task?.id],
        queryFn: async () => {
            const res = await taskService.getOne(projectId, task.id);
            return res.data.data.task;
        },
        enabled: !!task?.id
    });

    const workspaceMembersQuery = useQuery({
        queryKey: ['workspace', workspace?.slug, 'members'],
        queryFn: () => api.get('/members'),
        enabled: !!workspace?.slug
    });

    const projectDataQuery = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getOne(projectId),
        enabled: !!projectId
    });

    const detailedTask = fullTaskData || task;
    const projectName = projectDataQuery.data?.data?.data?.project?.name || '...';

    // Pre-calculate assignee list to avoid initialization errors in JSX
    const assigneeItems = useMemo(() => {
        const members = safeArray(workspaceMembersQuery.data?.data?.data);
        return [
            {
                label: 'Unassigned',
                active: !detailedTask.assigneeId,
                icon: <User className="w-4 h-4" />,
                onClick: () => propertyMutation.mutate({ assigneeId: null })
            },
            ...members.map(m => ({
                label: m.user?.name || 'Unknown',
                active: detailedTask.assigneeId === m.user?.id,
                icon: <Avatar user={m.user} size="xs" />,
                onClick: () => propertyMutation.mutate({ assigneeId: m.user?.id })
            }))
        ];
    }, [workspaceMembersQuery.data, detailedTask.assigneeId]);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editDescriptionValue, setEditDescriptionValue] = useState('');
    const dueDateRef = useRef(null);
    const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);

    useEffect(() => {
        setActiveTab('details');
        setIsEditingTitle(false);
        setIsEditingDescription(false);
    }, [task?.id]);

    const propertyMutation = useMutation({
        mutationFn: (updates) => taskService.update(projectId, detailedTask.id, updates),
        onSuccess: () => queryClient.invalidateQueries(['tasks', projectId])
    });

    const titleMutation = useMutation({
        mutationFn: (newTitle) => taskService.update(projectId, detailedTask.id, { title: newTitle }),
        onSuccess: () => queryClient.invalidateQueries(['tasks', projectId])
    });

    const commentsQuery = useQuery({
        queryKey: ['task', projectId, detailedTask.id, 'comments'],
        queryFn: async () => {
            const res = await taskService.getComments(detailedTask.id);
            return res.data.data.comments;
        },
        enabled: !!detailedTask.id
    });

    const activitiesQuery = useQuery({
        queryKey: ['task', projectId, detailedTask.id, 'activities'],
        queryFn: async () => {
            const res = await taskService.getActivities(projectId, detailedTask.id);
            return res.data.data.activities;
        },
        enabled: !!detailedTask.id && activeTab === 'activity'
    });

    const [commentText, setCommentText] = useState('');
    const commentMutation = useMutation({
        mutationFn: (text) => taskService.createComment(detailedTask.id, text),
        onSuccess: () => {
            setCommentText('');
            queryClient.invalidateQueries(['task', projectId, detailedTask.id, 'comments']);
        }
    });

    return (
        <AnimatePresence>
            <div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col overflow-hidden">
                    
                    <div className="h-16 flex items-center justify-between px-6 border-b dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={onClose} className="p-1.5 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={20} /></button>
                            <span className="text-sm font-bold text-slate-400">Task Details</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                    </div>

                    <div className="flex px-6 border-b dark:border-white/5">
                        {['details', 'attachments', 'activity'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-3 text-sm font-bold border-b-2 capitalize", activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500")}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {activeTab === 'details' && (
                            <div className="space-y-8">
                                <div className="group">
                                    {isEditingTitle ? (
                                        <input autoFocus value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)} onBlur={() => { titleMutation.mutate(editTitleValue); setIsEditingTitle(false); }} className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0" />
                                    ) : (
                                        <h1 onClick={() => { setEditTitleValue(detailedTask.title); setIsEditingTitle(true); }} className="text-2xl font-bold cursor-text">{detailedTask.title}</h1>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-1">
                                    <PropertyRow icon={CircleDashed} label="Status">
                                        <Dropdown align="left" trigger={<button className="text-sm font-bold">{getStatusLabel(detailedTask.status)}</button>} items={STATUS_OPTIONS.map(s => ({ label: s.label, onClick: () => propertyMutation.mutate({ status: s.value }) }))} />
                                    </PropertyRow>
                                    <PropertyRow icon={User} label="Assignee">
                                        <Dropdown align="left" trigger={<button className="text-sm font-bold">{detailedTask.assignee?.name || 'Unassigned'}</button>} items={assigneeItems} />
                                    </PropertyRow>
                                    <PropertyRow icon={Calendar} label="Due Date">
                                        <button onClick={() => setIsDueDatePickerOpen(true)} className="text-sm font-bold">{detailedTask.dueDate ? format(new Date(detailedTask.dueDate), 'PPP') : 'No Date'}</button>
                                    </PropertyRow>
                                </div>

                                <div className="pt-6 border-t dark:border-white/5">
                                    <h3 className="text-sm font-bold mb-4">Description</h3>
                                    {isEditingDescription ? (
                                        <RichTextEditor value={editDescriptionValue} onChange={setEditDescriptionValue} onBlur={() => { propertyMutation.mutate({ description: editDescriptionValue }); setIsEditingDescription(false); }} />
                                    ) : (
                                        <div onClick={() => { setEditDescriptionValue(detailedTask.description || ''); setIsEditingDescription(true); }} className="prose dark:prose-invert max-w-none min-h-[100px] cursor-text" dangerouslySetInnerHTML={{ __html: detailedTask.description || 'Add a description...' }} />
                                    )}
                                </div>

                                <TaskSubtasks parentTaskId={detailedTask.id} projectId={projectId} subtasks={safeArray(detailedTask.subtasks)} onTaskSelect={onTaskSelect} />
                                
                                <div className="pt-6 border-t dark:border-white/5">
                                    <h3 className="text-sm font-bold mb-4">Comments</h3>
                                    <div className="space-y-4 mb-6">
                                        {safeArray(commentsQuery.data).map(c => (
                                            <div key={c.id} className="flex gap-3">
                                                <Avatar user={c.author} size="xs" />
                                                <div className="flex-1 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl">
                                                    <p className="text-xs font-bold mb-1">{c.author?.name}</p>
                                                    <p className="text-sm">{c.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <textarea value={commentText} onChange={e => setCommentText(e.target.value)} className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-sm outline-none border-none focus:ring-2 ring-indigo-500/20" placeholder="Add a comment..." />
                                        <button onClick={() => commentMutation.mutate(commentText)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs self-end">Post</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'attachments' && <TaskAttachments taskId={detailedTask.id} />}
                        {activeTab === 'activity' && (
                            <div className="space-y-4">
                                {safeArray(activitiesQuery.data).map(a => (
                                    <div key={a.id} className="text-sm flex gap-3">
                                        <Avatar user={a.user} size="xs" />
                                        <div><span className="font-bold">{a.user?.name}</span> {a.message}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TaskDetailPanel;
