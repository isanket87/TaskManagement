import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Avatar from '../ui/Avatar';
import { taskService } from '../../services/taskService';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: '#9BA3AE' },
    { id: 'in_progress', label: 'In Progress', color: '#2E6DB4' },
    { id: 'in_review', label: 'In Review', color: '#B8922A' },
    { id: 'done', label: 'Done', color: '#4A8C5C' },
];

// ── Status Cell ─────────────────────────────────────────────────────
const StatusCell = ({ tasks, memberId, status, focusedMemberId }) => {
    const dimmed = focusedMemberId && focusedMemberId !== memberId;

    return (
        <Droppable droppableId={`${memberId}::${status}`}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                        'min-h-[60px] rounded-xl border p-1.5 transition-all flex flex-col gap-1.5',
                        snapshot.isDraggingOver
                            ? 'border-orange-400 bg-orange-50/80 dark:bg-orange-900/20 dark:border-orange-600'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700',
                        dimmed && 'opacity-25'
                    )}
                >
                    {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                        "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 select-none leading-snug transition-all",
                                        snapshot.isDragging 
                                            ? 'shadow-lg ring-2 ring-orange-400 border-transparent opacity-100 z-50' 
                                            : 'hover:border-orange-300 hover:bg-orange-50 dark:hover:border-orange-700 dark:hover:bg-orange-900/20 hover:-translate-y-px hover:shadow-sm'
                                    )}
                                    style={{ ...provided.draggableProps.style }}
                                >
                                    {task.title}
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );
};

// ── Swimlane View ───────────────────────────────────────────────────
const SwimlaneView = ({ tasks = [], members = [], projectId, focusedMemberId = null, onFocusChange }) => {
    const queryClient = useQueryClient();

    const handleDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const [sourceMemberId, sourceStatus] = source.droppableId.split('::');
        const [destMemberId, destStatus] = destination.droppableId.split('::');

        // ── Optimistic update ────────────────────────────────────────────────
        // The cache shape is the full axios envelope: { data: { data: { tasks: [] } } }
        // We must unwrap → patch → rewrap to keep React Query happy.
        queryClient.setQueriesData({ queryKey: ['tasks', projectId] }, (old) => {
            if (!old) return old;
            const taskList = old?.data?.data?.tasks;
            if (!Array.isArray(taskList)) return old;

            const newAssignee = destMemberId !== 'unassigned'
                ? members.find(m => m.user.id === destMemberId)?.user ?? null
                : null;

            const updatedTasks = taskList.map(t => {
                if (t.id !== draggableId) return t;
                return {
                    ...t,
                    status: destStatus,
                    assignee: newAssignee,
                    assigneeId: destMemberId === 'unassigned' ? null : destMemberId,
                };
            });

            return {
                ...old,
                data: {
                    ...old.data,
                    data: { ...old.data.data, tasks: updatedTasks },
                },
            };
        });

        // ── Persist to backend ───────────────────────────────────────────────
        const apiCall = sourceMemberId !== destMemberId
            ? taskService.update(projectId, draggableId, {
                status: destStatus,
                assigneeId: destMemberId === 'unassigned' ? null : destMemberId,
              })
            : taskService.updateStatus(projectId, draggableId, destStatus);

        const successMsg = sourceMemberId !== destMemberId
            ? 'Task reassigned and moved'
            : `Moved to ${COLUMNS.find(c => c.id === destStatus)?.label}`;

        apiCall
            .then(() => toast.success(successMsg))
            .catch(() => {
                toast.error('Failed to move task');
                // Roll back by refetching fresh data
                queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            })
            .finally(() => {
                // Always sync with server to ensure consistency
                queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            });
    };

    const toggleFocus = (memberId) => onFocusChange?.(memberId);

    if (members.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-center py-24">
                <p className="text-sm text-slate-400">Add members to this project to use Swimlane view.</p>
            </div>
        );
    }

    // Add unassigned grouping if there are unassigned tasks
    const allGroups = [...members];
    if (tasks.some(t => !t.assigneeId)) {
        allGroups.push({ user: { id: 'unassigned', name: 'Unassigned', email: '', avatarUrl: null } });
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full overflow-auto px-6 py-4">
                {/* Focus hint */}
                {focusedMemberId && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Showing tasks for{' '}
                            <strong className="text-slate-700 dark:text-slate-200">
                                {members.find(m => m.user.id === focusedMemberId)?.user.name}
                            </strong>
                        </span>
                        <button
                            onClick={() => onFocusChange?.(focusedMemberId)}
                            className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                        >
                            ✕ Clear focus
                        </button>
                    </div>
                )}

                {/* Grid */}
                <div className="overflow-x-auto pb-4 shrink-0">
                    <div className="min-w-[700px]">
                        {/* Column headers */}
                        <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '160px repeat(4, 1fr)' }}>
                            <div /> {/* spacer for avatar column */}
                            {COLUMNS.map((col) => (
                                <div
                                    key={col.id}
                                    className="flex flex-col items-center gap-1 py-2 px-3 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        {col.label}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {tasks.filter(t => t.status === col.id).length}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Member rows */}
                        {allGroups.map((member, rowIdx) => {
                            const isUnassigned = member.user.id === 'unassigned';
                            const memberTasks = tasks.filter((t) => 
                                isUnassigned ? !t.assigneeId : t.assigneeId === member.user.id
                            );
                            const isFocused = focusedMemberId === member.user.id;

                            // Hide unassigned row if empty unless dragging over it (handled natively)
                            if (isUnassigned && memberTasks.length === 0) return null;

                            return (
                                <motion.div
                                    key={member.user.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: rowIdx * 0.04 }}
                                    className="grid gap-3 mb-3 items-start"
                                    style={{ gridTemplateColumns: '160px repeat(4, 1fr)' }}
                                >
                                    {/* Member cell */}
                                    <button
                                        onClick={() => !isUnassigned && toggleFocus(member.user.id)}
                                        className={cn(
                                            'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all w-full',
                                            isFocused
                                                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:border-orange-700',
                                            isUnassigned && 'cursor-default pointer-events-none'
                                        )}
                                    >
                                        {!isUnassigned ? <Avatar user={member.user} size="sm" /> : 
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border flex items-center justify-center text-slate-400 text-xs">?</div>
                                        }
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                {member.user.name.split(' ')[0]}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                                {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Status cells */}
                                    {COLUMNS.map((col) => (
                                        <StatusCell
                                            key={col.id}
                                            tasks={memberTasks.filter((t) => t.status === col.id)}
                                            memberId={member.user.id}
                                            status={col.id}
                                            focusedMemberId={focusedMemberId}
                                            projectId={projectId}
                                        />
                                    ))}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DragDropContext>
    );
};

export default SwimlaneView;
