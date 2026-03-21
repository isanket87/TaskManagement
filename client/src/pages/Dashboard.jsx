import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import DueDateSummaryCards from '../components/shared/DueDateSummaryCards';
import ActivityFeed from '../components/shared/ActivityFeed';
import UpcomingDeadlines from '../components/shared/UpcomingDeadlines';
import OverdueBanner from '../components/shared/OverdueBanner';
import QuickTaskCreate from '../components/shared/QuickTaskCreate';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { notificationService } from '../services/notificationService';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import useWorkspaceStore from '../store/workspaceStore';
import Avatar from '../components/ui/Avatar';
import DueDateBadge from '../components/due-date/DueDateBadge';
import { getPriorityBadgeClass, cn } from '../utils/helpers';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { 
    TrendingUp, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowRight,
    Sparkles,
    LayoutGrid,
    BarChart3,
    ClipboardList,
    FolderOpen,
    Clock4
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
const PRIORITY_COLORS = {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#6366f1',
};

const LineChart = ({ data = [] }) => {
    if (!data.length) return <div className="h-20 flex items-center justify-center text-[10px] text-slate-400 italic">No data yet</div>;
    const W = 400, H = 80, PAD = 10;
    const max = Math.max(...data.map(d => d.count), 1);
    const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
    const ys = data.map(d => H - PAD - ((d.count / max) * (H - PAD * 2)));
    const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {xs.map((x, i) => (
                <circle key={i} cx={x} cy={ys[i]} r="3" fill="#6366f1" className="opacity-0 hover:opacity-100 transition-opacity" />
            ))}
        </svg>
    );
};

const Dashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const workspace = useWorkspaceStore(s => s.workspace);
    const { setDueDateSummary, setNotifications } = useNotificationStore();
    const [activeFilter, setActiveFilter] = useState('');

    const { data: statsData, isLoading } = useQuery({
        queryKey: ['dashboard-stats', workspace?.slug],
        queryFn: () => taskService.getDashboardStats(),
        staleTime: 60000,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['due-date-summary', workspace?.slug],
        queryFn: () => taskService.getDueDateSummary(),
    });

    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspace?.slug],
        queryFn: () => projectService.getAll(),
        enabled: !!workspace?.slug,
    });

    useEffect(() => {
        const summary = summaryData?.data?.data?.summary;
        if (summary) setDueDateSummary(summary);
    }, [summaryData]);

    const stats = statsData?.data?.data?.stats;
    const myTasks = stats?.myTasks || [];
    const projects = projectsData?.data?.data?.projects || [];

    // Generate Smart Insights
    const insights = useMemo(() => {
        if (!stats) return [];
        const list = [];
        if (stats.overdueTasks > 0) {
            list.push({
                icon: AlertTriangle,
                text: `You have ${stats.overdueTasks} overdue tasks needing attention.`
            });
        }
        const todayDone = stats.productivityTrend?.[stats.productivityTrend.length - 1]?.count || 0;
        if (todayDone > 0) {
            list.push({
                icon: CheckCircle2,
                text: `Great job! You've completed ${todayDone} tasks today.`
            });
        }
        if (stats.upcomingTasks?.length > 0) {
            list.push({
                icon: Calendar,
                text: `${stats.upcomingTasks.length} tasks are due in the next 7 days.`
            });
        }
        return list;
    }, [stats]);

    if (isLoading) {
        return (
            <PageWrapper>
                <div className="p-8 space-y-8 animate-pulse">
                    <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <OverdueBanner overdueCount={stats?.overdueTasks || 0} />
            <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Welcome back, {user?.name.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Here's your productivity overview for today.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to={`/workspace/${workspace?.slug}/calendar`} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            Calendar
                        </Link>
                        <Link to={`/workspace/${workspace?.slug}/projects`} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none">
                            <LayoutGrid className="w-4 h-4" />
                            My Projects
                        </Link>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* Left 2 Columns: Stats & Charts */}
                    <div className="xl:col-span-2 space-y-8">
                        
                        {/* Summary Cards */}
                        <DueDateSummaryCards onFilter={(f) => navigate(`/workspace/${workspace?.slug}/projects`)} activeFilter={activeFilter} />

                        {/* Top row mini-stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Projects', value: stats?.projects, icon: FolderOpen, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30', link: `/workspace/${workspace?.slug}/projects` },
                                { label: 'Done (Week)', value: stats?.completedThisWeek, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', link: `/workspace/${workspace?.slug}/analytics` },
                                { label: 'Upcoming', value: stats?.upcomingTasks?.length, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', link: `/workspace/${workspace?.slug}/calendar` },
                                { label: 'Hours (Week)', value: `${stats?.hoursThisWeek}h`, icon: Clock4, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', link: `/workspace/${workspace?.slug}/timesheets` },
                            ].map(({ label, value, icon: Icon, color, bg, link }) => (
                                <Link key={label} to={link} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900/50 transition-colors">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", bg)}>
                                        <Icon className={cn("w-4 h-4", color)} />
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{value ?? 0}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                                </Link>
                            ))}
                        </div>

                        {/* Insights & Trends Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Productivity Trend */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                                        Weekly Productivity
                                    </h3>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Done / Day</span>
                                </div>
                                <LineChart data={stats?.productivityTrend} />
                                <div className="flex justify-between mt-4">
                                    {stats?.productivityTrend?.map((d, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {new Date(d.date).toLocaleDateString([], { weekday: 'narrow' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Priority Breakdown */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6 text-sm">
                                    <BarChart3 className="w-4 h-4 text-amber-500" />
                                    Open Priorities
                                </h3>
                                <div className="space-y-4">
                                    {['urgent', 'high', 'medium', 'low'].map(p => {
                                        const count = stats?.byPriority?.[p] || 0;
                                        const total = Object.values(stats?.byPriority || {}).reduce((a, b) => a + b, 0) || 1;
                                        const percent = Math.round((count / total) * 100);
                                        return (
                                            <div key={p} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                                    <span className="text-slate-500">{p}</span>
                                                    <span className="text-slate-900 dark:text-white">{count}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-1000" 
                                                        style={{ width: `${percent}%`, backgroundColor: PRIORITY_COLORS[p] }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Tasks List */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-500" />
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Your Focus Tasks</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <QuickTaskCreate projects={projects} />
                                    <Link to="/projects" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                        View All <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {myTasks.slice(0, 6).map(task => (
                                    <button 
                                        key={task.id} 
                                        onClick={() => navigate(`/workspace/${workspace?.slug}/projects/${task.projectId}`)}
                                        className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all flex items-center justify-between group text-left"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={cn("w-2 h-2 rounded-full shrink-0", 
                                                task.priority === 'urgent' ? 'bg-red-500' : 
                                                task.priority === 'high' ? 'bg-orange-500' : 'bg-slate-300'
                                            )} />
                                            <div className="truncate">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No date'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            <DueDateBadge dueDate={task.dueDate} hasDueTime={task.hasDueTime} taskStatus={task.status} compact />
                                        </div>
                                    </button>
                                ))}
                                {myTasks.length === 0 && (
                                    <div className="py-12">
                                        <EmptyState icon={ClipboardList} title="No tasks" description="You have no assigned tasks right now." />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Insights & Activity */}
                    <div className="space-y-8">
                        
                        {/* Smart Insights */}
                        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-bold flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-indigo-200" />
                                    Smart Insights
                                </h3>
                                <div className="space-y-4">
                                    {insights.map((insight, i) => (
                                        <div key={i} className={cn("p-3 rounded-2xl flex gap-3 items-start backdrop-blur-sm bg-white/10")}>
                                            <insight.icon className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p className="text-xs font-medium leading-relaxed">{insight.text}</p>
                                        </div>
                                    ))}
                                    {insights.length === 0 && (
                                        <p className="text-xs text-indigo-100 italic">Everything looks good! Stay focused.</p>
                                    )}
                                </div>
                            </div>
                            {/* Decorative blobs */}
                            <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-[-20%] left-[-20%] w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
                        </div>

                        {/* Upcoming Deadlines */}
                        <UpcomingDeadlines tasks={myTasks} />

                        {/* Recent Activity */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col h-[400px]">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 shrink-0">
                                <Clock className="w-5 h-5 text-slate-400" />
                                Activity
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <ActivityFeed activities={stats?.recentActivity || []} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default Dashboard;
