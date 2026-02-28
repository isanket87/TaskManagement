import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import DueDateSummaryCards from '../components/shared/DueDateSummaryCards';
import OverdueBanner from '../components/shared/OverdueBanner';
import UpcomingDeadlines from '../components/shared/UpcomingDeadlines';
import ActivityFeed from '../components/shared/ActivityFeed';
import QuickTaskCreate from '../components/shared/QuickTaskCreate';
import { taskService } from '../services/taskService';
import { notificationService } from '../services/notificationService';
import { projectService } from '../services/projectService';
import { TaskCardSkeleton } from '../components/ui/Skeleton';
import DueDateBadge from '../components/due-date/DueDateBadge';
import useNotificationStore from '../store/notificationStore';
import Avatar from '../components/ui/Avatar';
import { getDueDateStatus } from '../utils/dueDateUtils';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import useWorkspaceStore from '../store/workspaceStore';
import { getPriorityBadgeClass } from '../utils/helpers';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { ClipboardList } from 'lucide-react';

const DUE_FILTER_LABELS = {
    overdue: 'Overdue',
    today: 'Due Today',
    this_week: 'This Week',
    upcoming: 'Upcoming',
    '': 'All',
};

const Dashboard = () => {
    const [activeFilter, setActiveFilter] = useState('');
    const navigate = useNavigate();
    const { setDueDateSummary, setNotifications } = useNotificationStore();
    const { user } = useAuthStore();
    const workspace = useWorkspaceStore(s => s.workspace);
    useSocket();

    const { data: statsData, isLoading } = useQuery({
        queryKey: ['dashboard-stats', workspace?.slug],
        queryFn: () => taskService.getDashboardStats(),
        refetchInterval: 60_000,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['due-date-summary', workspace?.slug],
        queryFn: () => taskService.getDueDateSummary(),
        refetchInterval: 60_000,
    });

    const { data: notifData } = useQuery({
        queryKey: ['notifications', workspace?.slug],
        queryFn: () => notificationService.getAll(),
    });

    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspace?.slug],
        queryFn: () => projectService.getAll(),
        enabled: !!workspace?.slug,
    });
    const projects = projectsData?.data?.data?.projects || [];

    // React Query v5 removed onSuccess — use useEffect instead
    useEffect(() => {
        const summary = summaryData?.data?.data?.summary;
        if (summary) setDueDateSummary(summary);
    }, [summaryData]);

    useEffect(() => {
        const d = notifData?.data?.data;
        if (d) setNotifications(d.notifications, d.unreadCount);
    }, [notifData]);

    const stats = statsData?.data?.data?.stats;
    const myTasks = stats?.myTasks || [];
    const upcomingTasks = stats?.upcomingTasks || [];
    // Dedup: myTasks and upcomingTasks can include the same tasks (same user, same date window)
    const allTasksForDeadlines = [...myTasks, ...upcomingTasks].filter(
        (task, index, self) => index === self.findIndex((t) => t.id === task.id)
    );
    const overdueCount = stats?.overdueTasks || 0;

    // Filter tasks
    const filteredTasks = myTasks.filter((t) => {
        if (!activeFilter) return true;
        const status = getDueDateStatus(t.dueDate, t.status);
        if (activeFilter === 'overdue') return status === 'overdue';
        if (activeFilter === 'today') return status === 'due_today';
        if (activeFilter === 'this_week') return status === 'due_soon';
        if (activeFilter === 'upcoming') return status === 'on_track';
        return true;
    });

    return (
        <PageWrapper title="Dashboard">
            <OverdueBanner overdueCount={overdueCount} />
            <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <DueDateSummaryCards onFilter={setActiveFilter} activeFilter={activeFilter} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left — My Tasks + Activity */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-5 px-1">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-500" />
                                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                                        My Tasks
                                    </h2>
                                    {activeFilter && (
                                        <Badge variant="secondary" className="ml-2 font-medium">
                                            {DUE_FILTER_LABELS[activeFilter]}
                                        </Badge>
                                    )}
                                </div>
                                <QuickTaskCreate projects={projects} />
                            </div>

                            {isLoading ? (
                                <div className="space-y-3">{[1, 2, 3].map(i => <TaskCardSkeleton key={i} />)}</div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="py-8">
                                    <EmptyState icon={ClipboardList} title="No tasks" description={activeFilter ? 'No tasks match this filter.' : 'You have no assigned tasks right now.'} />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredTasks.map((task) => (
                                        <button
                                            key={task.id}
                                            onClick={() => navigate(`/workspace/${useWorkspaceStore.getState().workspace?.slug}/projects/${task.projectId}`)}
                                            className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Avatar user={task.assignee} size="sm" className="hidden sm:block shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {task.title}
                                                    </p>
                                                    {task.projectName && (
                                                        <p className="text-xs text-slate-500 truncate mt-0.5">{task.projectName}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto mt-2 sm:mt-0">
                                                <span className={`badge ${getPriorityBadgeClass(task.priority)} shrink-0`}>
                                                    {task.priority}
                                                </span>
                                                <div className="shrink-0 pointer-events-none">
                                                    <DueDateBadge dueDate={task.dueDate} hasDueTime={task.hasDueTime} taskStatus={task.status} compact />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right — Upcoming Deadlines & Activity */}
                    <div className="space-y-6">
                        <UpcomingDeadlines tasks={allTasksForDeadlines} />
                        <ActivityFeed activities={stats?.recentActivity || []} />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default Dashboard;
