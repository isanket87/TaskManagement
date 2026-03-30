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

    // Real progress from backend-supplied completedTasksCount
    const totalTasks = project._count?.tasks || 0;
    const completedTasks = project.completedTasksCount || 0;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const isOverdue = project.dueDate && isPast(new Date(project.dueDate));

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="group relative bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)] hover:shadow-2xl cursor-pointer overflow-hidden flex flex-col h-full transition-all"
            onClick={() => navigate(`/workspace/${slug}/projects/${project.id}`)}
        >
            {/* Dynamic Background Glow */}
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 80% 0%, ${project.color || '#6366f1'}30 0%, transparent 60%)`,
                }}
            />

            {/* Top Color Line Accent */}
            <motion.div 
                className="h-1.5 w-full absolute top-0 left-0" 
                layoutId={`project-bar-${project.id}`}
                style={{ backgroundColor: project.color || '#6366f1' }} 
            />

            <div className="p-5 flex-1 flex flex-col relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.05 }}
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/20 dark:border-white/5 backdrop-blur-md"
                            style={{ 
                                backgroundColor: `${project.color || '#6366f1'}20`, 
                                color: project.color || '#6366f1' 
                            }}
                        >
                            <FolderKanbanIcon className="w-5 h-5 drop-shadow-sm" />
                        </motion.div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 break-all text-base tracking-tight">
                                {project.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/50">
                                    {totalTasks} tasks
                                </span>
                            </div>
                        </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                            align="right"
                            trigger={
                                <button className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                                    <MoreVertical className="w-4.5 h-4.5" />
                                </button>
                            }
                            items={dropdownItems}
                        />
                    </div>
                </div>

                {project.description ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-5 flex-1 leading-relaxed">
                        {project.description}
                    </p>
                ) : (
                    <div className="flex-1 mb-5" /> // spacer
                )}

                {/* Animated Progress Bar */}
                <div className="mb-5 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between flex-wrap gap-2 text-xs mb-2">
                        <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            Progress
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/60 dark:bg-slate-900/60 rounded-full overflow-hidden shadow-inner relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                            className="h-full rounded-full relative overflow-hidden"
                            style={{ backgroundColor: project.color || '#6366f1' }}
                        >
                            {/* Inner Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full -translate-x-full animate-[shimmer_2s_infinite]" />
                        </motion.div>
                    </div>
                </div>

                {/* Footer Meta Row */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-auto">
                    {/* Avatars */}
                    <div className="flex -space-x-2.5 items-center">
                        {project.members?.slice(0, 4).map((m, i) => (
                            <motion.div
                                whileHover={{ y: -4, scale: 1.1, zIndex: 20 }}
                                key={m.userId || m.id}
                                className="relative w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md cursor-help"
                                style={{ zIndex: 10 - i }}
                                title={m.user?.name}
                            >
                                {m.user?.avatarUrl ? (
                                    <img src={m.user.avatarUrl} alt={m.user.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    (m.user?.name || '?')[0].toUpperCase()
                                )}
                            </motion.div>
                        ))}
                        {(project.members?.length || 0) > 4 && (
                            <div className="relative w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm z-0">
                                +{project.members.length - 4}
                            </div>
                        )}
                        {(project.members?.length === 0 || !project.members) && (
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700/50">
                                No members
                            </span>
                        )}
                    </div>

                    {/* Due Date or Created relative time */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {project.dueDate ? (
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
                                isOverdue
                                    ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                                    : "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
                            )}>
                                {isOverdue ? <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> : <CalendarDays className="w-3.5 h-3.5 stroke-[2.5]" />}
                                <span>{isOverdue ? 'Overdue' : 'Due ' + formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}</span>
                            </div>
                        ) : (
                            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
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
