import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MoreVertical, Trash2, Edit, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import { formatDistanceToNow, isPast } from 'date-fns';
import { cn } from '../../utils/helpers';
import useWorkspaceStore from '../../store/workspaceStore';

const ProjectCard = ({ project, onDelete }) => {
    const navigate = useNavigate();
    const { workspace } = useWorkspaceStore();
    const slug = workspace?.slug;


    const dropdownItems = [
        { icon: <Edit className="w-4 h-4" />, label: 'Open Project', onClick: () => navigate(`/workspace/${slug}/projects/${project.id}`) },
        { separator: true },
        { icon: <Trash2 className="w-4 h-4" />, label: 'Delete Project', danger: true, onClick: () => onDelete(project.id) },
    ];

    // Dummy progress calculation if tasks exist
    const totalTasks = project._count?.tasks || 0;
    // Assuming we don't have completed count from API right now, simulating progress for visual purposes or just showing 0 if none
    const completedTasks = project.completedTasks || 0;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const isOverdue = project.dueDate && isPast(new Date(project.dueDate));

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer overflow-hidden flex flex-col h-full"
            onClick={() => navigate(`/workspace/${slug}/projects/${project.id}`)}
        >
            {/* Top Color Bar accent */}
            <div className="h-1.5 w-full absolute top-0 left-0" style={{ backgroundColor: project.color || '#6366f1' }} />

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: `${project.color || '#6366f1'}15`, color: project.color || '#6366f1' }}
                        >
                            <FolderKanbanIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 break-all">
                                {project.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-medium text-slate-500">{totalTasks} tasks</span>
                            </div>
                        </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                            align="right"
                            trigger={
                                <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
                                    <MoreVertical className="w-4.5 h-4.5" />
                                </button>
                            }
                            items={dropdownItems}
                        />
                    </div>
                </div>

                {project.description ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                        {project.description}
                    </p>
                ) : (
                    <div className="flex-1" /> // spacer
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Progress</span>
                        <span className="text-slate-500 font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: project.color || '#6366f1' }}
                        />
                    </div>
                </div>

                {/* Footer Meta Row */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-auto">
                    {/* Avatars */}
                    <div className="flex -space-x-2">
                        {project.members?.slice(0, 3).map((m) => (
                            <div
                                key={m.id}
                                className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                title={m.user?.name}
                            >
                                {(m.user?.name || '?')[0].toUpperCase()}
                            </div>
                        ))}
                        {(project.members?.length || 0) > 3 && (
                            <div className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-600 dark:text-slate-300 shadow-sm">
                                +{project.members.length - 3}
                            </div>
                        )}
                        {(project.members?.length === 0) && (
                            <span className="text-xs text-slate-400">No members</span>
                        )}
                    </div>

                    {/* Due Date or Created relative time */}
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                        {project.dueDate ? (
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md",
                                isOverdue
                                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                    : "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                            )}>
                                {isOverdue ? <Clock className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />}
                                <span>{isOverdue ? 'Overdue' : 'Due ' + formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}</span>
                            </div>
                        ) : (
                            <span className="text-slate-400">
                                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Simple internal icon since we don't import FolderKanban above to avoid conflict if someone wants it
function FolderKanbanIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            <path d="M8 10v4" />
            <path d="M12 10v2" />
            <path d="M16 10v6" />
        </svg>
    )
}

export default ProjectCard;
