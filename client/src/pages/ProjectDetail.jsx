import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback } from 'react';
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    closestCorners, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, MessageCircle, MoreVertical, Trash2, X, Calendar, Flag } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import DueDateBadge from '../components/due-date/DueDateBadge';
import DateTimePicker from '../components/due-date/DateTimePicker';
import BulkActionBar from '../components/shared/BulkActionBar';
import AttachmentPanel from '../components/shared/AttachmentPanel';
import TaskDetailPanel from '../components/shared/TaskDetailPanel';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { TaskCardSkeleton } from '../components/ui/Skeleton';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { getAttachments } from '../services/attachmentService';
import useTaskStore from '../store/taskStore';
import useSocket from '../hooks/useSocket';
import { KANBAN_COLUMNS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/constants';
import { getPriorityBadgeClass, cn } from '../utils/helpers';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import ImportCsvModal from '../components/shared/ImportCsvModal';

// Task Card
const TaskCard = ({ task, projectId, onDueDateUpdate, onDelete, onSelect }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    const { toggleSelectTask, selectedTaskIds } = useTaskStore();
    const isSelected = selectedTaskIds.includes(task.id);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const triggerRef = useRef(null);
    const queryClient = useQueryClient();
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : 1
    };

    const handleDateApply = async (date, hasDueTime) => {
        await onDueDateUpdate(task, date, hasDueTime);
        setShowDatePicker(false);
    };

    // Determine left border color based on priority
    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-orange-500';
            case 'urgent': return 'bg-red-500';
            case 'medium': return 'bg-blue-500';
            case 'low': return 'bg-slate-400';
            default: return 'bg-transparent';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelect(task)}
            className={cn(
                "group relative bg-white dark:bg-slate-800 rounded-xl p-3 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 flex overflow-hidden",
                isSelected && "ring-2 ring-indigo-500 border-transparent",
                isOverdue && !isSelected && "border-red-300 dark:border-red-900/50"
            )}
        >
            {/* Priority Left Border Indicator */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", getPriorityColor(task.priority))} />

            {/* Checkbox Overlay (Hover/Selected) */}
            <div
                className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); toggleSelectTask(task.id); }}
            >
                <div className={cn(
                    "w-4.5 h-4.5 rounded md border-2 flex items-center justify-center transition-colors shadow-sm",
                    isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                )}>
                    {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
            </div>

            <div className="flex-1 min-w-0 pl-1.5 flex flex-col h-full">
                <div className="flex items-start gap-2 mb-2">
                    {/* Drag Handle */}
                    <button
                        {...listeners}
                        {...attributes}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors hidden sm:block opacity-0 group-hover:opacity-100"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-sm font-medium leading-snug break-words pr-5",
                            task.status === 'done' ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-100"
                        )}>
                            {task.title}
                        </p>
                    </div>

                    {/* Quick Menu */}
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                            align="right"
                            trigger={
                                <button className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            }
                            items={[
                                { icon: <Trash2 className="w-4 h-4" />, label: 'Delete task', danger: true, onClick: () => onDelete(task) }
                            ]}
                        />
                    </div>
                </div>

                {/* Tags */}
                {task.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                        {task.tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex-1" />

                {/* Footer / Meta Data Row */}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-3">
                        <span className={`badge ${getPriorityBadgeClass(task.priority)} scale-90 origin-left`}>
                            {task.priority}
                        </span>
                        {task._count?.comments > 0 && (
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {task._count.comments}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()} className="relative shrink-0">
                            <div ref={triggerRef}>
                                <DueDateBadge
                                    dueDate={task.dueDate}
                                    hasDueTime={task.hasDueTime}
                                    taskStatus={task.status}
                                    compact
                                    onClick={() => setShowDatePicker((o) => !o)}
                                />
                            </div>
                            {showDatePicker && (
                                <DateTimePicker
                                    referenceRef={triggerRef}
                                    value={task.dueDate}
                                    hasDueTime={task.hasDueTime}
                                    onApply={handleDateApply}
                                    onClear={() => handleDateApply(null, false)}
                                    onClose={() => setShowDatePicker(false)}
                                />
                            )}
                        </div>
                        {task.assignee && (
                            <div className="shrink-0" title={`Assigned to ${task.assignee.name}`}>
                                <Avatar user={task.assignee} size="xs" className="ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Kanban Column
const KanbanColumn = ({ column, tasks, projectId, onDueDateUpdate, onDelete, onAddTask, onSelectTask }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });

    return (
        <div className="flex flex-col w-[300px] shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl h-full max-h-full">
            <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: column.color }} />
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{column.title}</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 dark:bg-slate-800 rounded-full px-2 py-0.5">
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => onAddTask(column.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 overflow-y-auto px-3 pb-4 pt-2 space-y-3 min-h-[150px] transition-colors rounded-b-2xl",
                    isOver ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "bg-transparent"
                )}
            >
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            projectId={projectId}
                            onDueDateUpdate={onDueDateUpdate}
                            onDelete={onDelete}
                            onSelect={onSelectTask}
                        />
                    ))}
                </SortableContext>
                {/* Empty State spacer to allow dropping when empty */}
                {tasks.length === 0 && (
                    <div className="h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                        <span className="text-xs font-medium text-slate-400">Drop tasks here</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Main Component
const ProjectDetail = () => {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTask, setActiveTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskStatus, setNewTaskStatus] = useState('todo');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [filter, setFilter] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskAttachments, setTaskAttachments] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useSocket(projectId);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getOne(projectId),
    });

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['tasks', projectId, filter],
        queryFn: () => taskService.getAll(projectId, filter ? { dueDateFilter: filter } : {}),
    });

    const createMutation = useMutation({
        mutationFn: (data) => taskService.create(projectId, data),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); setNewTaskTitle(''); setShowAddTask(false); toast.success('Task created'); },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ taskId }) => taskService.delete(projectId, taskId),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); toast.success('Task deleted'); },
    });

    const updateDueDateMutation = useMutation({
        mutationFn: ({ taskId, dueDate, hasDueTime }) => taskService.updateDueDate(projectId, taskId, { dueDate: dueDate?.toISOString() || null, hasDueTime }),
        onSuccess: () => { queryClient.invalidateQueries(['tasks', projectId]); toast.success('Due date updated'); },
        onError: () => toast.error('Failed to update due date'),
    });

    const project = projectData?.data?.data?.project;
    const tasks = tasksData?.data?.data?.tasks || [];

    const importMutation = useMutation({
        mutationFn: (importTasks) => taskService.bulkImport(projectId, importTasks),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success('Imported successfully');
            setIsImportModalOpen(false);
        },
        onError: () => toast.error('Failed to import'),
    });

    const handleImportCSV = (file) => {
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const mapped = results.data.map(row => ({
                    title: row.Title || row.title || row.TITLE,
                    description: row.Description || row.description || row.DESCRIPTION,
                    status: (row.Status || row.status || row.STATUS || 'todo').toLowerCase(),
                    priority: (row.Priority || row.priority || row.PRIORITY || 'medium').toLowerCase(),
                    dueDate: row.DueDate || row.dueDate || row['Due Date'] || null,
                })).filter(t => t.title);

                if (mapped.length === 0) {
                    toast.error('No valid tasks found in CSV');
                    return;
                }
                importMutation.mutate(mapped);
            },
            error: () => toast.error('Failed to parse CSV')
        });
    };

    const handleExportCSV = () => {
        if (!tasks.length) {
            toast.error('No tasks to export');
            return;
        }
        const exportData = tasks.map(t => ({
            Title: t.title,
            Description: t.description || '',
            Status: t.status,
            Priority: t.priority,
            DueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
        }));
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${project?.name || 'project'}-tasks.csv`;
        link.click();
    };

    // Load attachments when a task is selected
    const handleSelectTask = async (task) => {
        setSelectedTask(task);
        try {
            const res = await getAttachments(task.id);
            const raw = res.data?.data?.attachments || [];
            setTaskAttachments(raw.map(a => ({ ...a, name: a.name.split('||')[0] })));
        } catch {
            setTaskAttachments([]);
        }
    };

    const tasksList = Array.isArray(tasks) ? tasks : [];
    const tasksByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
        acc[col.id] = tasksList.filter((t) => t.status === col.id);
        return acc;
    }, {});

    const handleDragStart = ({ active }) => {
        const task = tasks.find((t) => t.id === active.id);
        setActiveTask(task);
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveTask(null);
        if (!over) return;
        const taskId = active.id;
        const newStatus = over.id;
        if (!KANBAN_COLUMNS.find((c) => c.id === newStatus)) return;
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status === newStatus) return;
        try {
            await taskService.updateStatus(projectId, taskId, newStatus);
            queryClient.invalidateQueries(['tasks', projectId]);
        } catch {
            toast.error('Failed to move task');
        }
    };

    const DUE_FILTERS = [
        { label: 'All', value: '' },
        { label: '🔴 Overdue', value: 'overdue' },
        { label: '🔵 Today', value: 'today' },
        { label: '🟡 This Week', value: 'this_week' },
        { label: '⚪ No Date', value: 'no_date' },
    ];

    return (
        <PageWrapper title={project?.name || 'Project Board'}>
            <div className="h-full flex flex-col pt-4">
                {/* Header & Filter bar */}
                <div className="px-6 flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {DUE_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                                    filter === f.value
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    {/* Action Buttons (Desktop) */}
                    <div className="hidden sm:flex gap-2 shrink-0 ml-4 items-center">
                        <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="shadow-sm">
                            Import CSV
                        </Button>
                        <Button variant="secondary" onClick={handleExportCSV} className="shadow-sm">
                            Export CSV
                        </Button>
                        <Button onClick={() => { setNewTaskStatus('todo'); setShowAddTask(true); }} className="shadow-sm">
                            <Plus className="w-4 h-4 mr-1.5" />
                            New Task
                        </Button>
                    </div>
                </div>

                {/* Kanban board area */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
                    {isLoading ? (
                        <div className="flex gap-6 h-full">
                            {KANBAN_COLUMNS.map((col) => (
                                <div key={col.id} className="w-[300px] shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 space-y-3">
                                    {[1, 2, 3].map(i => <TaskCardSkeleton key={i} />)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div className="flex gap-6 h-full items-start">
                                {KANBAN_COLUMNS.map((col) => (
                                    <KanbanColumn
                                        key={col.id}
                                        column={col}
                                        tasks={tasksByStatus[col.id] || []}
                                        projectId={projectId}
                                        onDueDateUpdate={(task, date, hasDueTime) => updateDueDateMutation.mutate({ taskId: task.id, dueDate: date, hasDueTime })}
                                        onDelete={(task) => deleteMutation.mutate({ taskId: task.id })}
                                        onAddTask={(status) => { setNewTaskStatus(status); setShowAddTask(true); }}
                                        onSelectTask={handleSelectTask}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeTask && (
                                    <div className="card p-3 w-72 shadow-2xl rotate-2 opacity-90">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activeTask.title}</p>
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Add Task Modal */}
            <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="New Task">
                <div className="space-y-4">
                    <Input label="Task Title" placeholder="What needs to be done?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus />
                    <div>
                        <label className="label">Status</label>
                        <select className="input" value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)}>
                            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddTask(false)}>Cancel</Button>
                        <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate({ title: newTaskTitle, status: newTaskStatus })} disabled={!newTaskTitle}>Add Task</Button>
                    </div>
                </div>
            </Modal>

            <BulkActionBar projectId={projectId} onComplete={() => queryClient.invalidateQueries(['tasks', projectId])} />

            {/* Task Detail Side Panel */}
            {selectedTask && (
                <TaskDetailPanel
                    task={selectedTask}
                    projectId={projectId}
                    onClose={() => setSelectedTask(null)}
                />
            )}

            {/* Import CSV Modal */}
            <ImportCsvModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportCSV}
                isImporting={importMutation.isPending}
            />
        </PageWrapper>
    );
};

export default ProjectDetail;
