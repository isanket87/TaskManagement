import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';
import Avatar from '../ui/Avatar';
import DueDateBadge from '../due-date/DueDateBadge';
import { groupTasksByDueDate } from '../../utils/dueDateUtils';
import { useNavigate } from 'react-router-dom';
import useWorkspaceStore from '../../store/workspaceStore';

const GROUP_LABELS = {
    overdue: '🔴 Overdue',
    today: '🔵 Today',
    tomorrow: '🟡 Tomorrow',
    thisWeek: '🟢 This Week',
    later: '📅 Later',
};

const UpcomingDeadlines = ({ tasks = [] }) => {
    const navigate = useNavigate();
    const groups = groupTasksByDueDate(tasks.filter((t) => t.status !== 'done'));

    const hasAny = Object.values(groups).some((g) => g.length > 0);
    if (!hasAny) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center min-h-[250px] shadow-sm">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Upcoming Deadlines</h3>
                <p className="text-sm text-slate-500 text-center">No upcoming deadlines 🎉</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Clock className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Upcoming Deadlines</h3>
            </div>

            <div className="space-y-5">
                {Object.entries(GROUP_LABELS).map(([key, label]) => {
                    const items = groups[key];
                    if (!items || items.length === 0) return null;
                    return (
                        <div key={key}>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                                {label}
                            </p>
                            <div className="space-y-1.5">
                                {items.slice(0, 5).map((task) => (
                                    <button
                                        key={task.id}
                                        onClick={() => navigate(`/workspace/${useWorkspaceStore.getState().workspace?.slug}/projects/${task.projectId}`)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
                                    >
                                        {task.assignee ? (
                                            <Avatar user={task.assignee} size="sm" className="shrink-0 ring-2 ring-white dark:ring-slate-800" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {task.title}
                                            </p>
                                            {task.dueDate && (
                                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                    {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                                                </p>
                                            )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UpcomingDeadlines;
