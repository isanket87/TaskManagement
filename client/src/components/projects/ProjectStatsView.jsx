import { useQuery } from '@tanstack/react-query';
import { 
    CheckCircle2, 
    ListTodo, 
    AlertTriangle, 
    TrendingUp, 
    Users,
    BarChart3
} from 'lucide-react';
import { projectService } from '../../services/projectService';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';

// Reuse existing helpers from AnalyticsPage
const fmt = (n) => (n ?? 0).toLocaleString();

const STATUS_COLORS = {
    todo: '#6366f1',
    in_progress: '#f59e0b',
    in_review: '#8b5cf6',
    done: '#10b981',
};

const StatCard = ({ label, value, icon: Icon, color, bg, suffix = '' }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(value)}{suffix}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</p>
        </div>
    </div>
);

const DonutChart = ({ slices, size = 100 }) => {
    const total = slices.reduce((a, s) => a + s.value, 0);
    if (!total) return <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700" />;

    const r = 38, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox="0 0 100 100">
            {slices.map((s, i) => {
                const dash = (s.value / total) * circumference;
                const gap = circumference - dash;
                const el = (
                    <circle key={i} cx={cx} cy={cy} r={r}
                        fill="none" stroke={s.color} strokeWidth="14"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 50 50)"
                    />
                );
                offset += dash;
                return el;
            })}
            <circle cx={cx} cy={cy} r={20} fill="white" className="dark:fill-slate-800" />
        </svg>
    );
};

const ProjectStatsView = ({ projectId }) => {
    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ['project-analytics', projectId],
        queryFn: () => projectService.getAnalytics(projectId),
    });

    if (isLoading) {
        return (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
        );
    }

    const data = analyticsData?.data?.data?.analytics;
    const statusSlices = Object.entries(data?.byStatus || {}).map(([k, v]) => ({
        label: k, value: v, color: STATUS_COLORS[k] || '#94a3b8'
    }));

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto hide-scrollbar">
            {/* Overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Tasks" value={data?.total} icon={ListTodo} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-950/30" />
                <StatCard label="Completed" value={data?.completed} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-950/30" />
                <StatCard label="Overdue" value={data?.overdue} icon={AlertTriangle} color="text-red-500" bg="bg-red-50 dark:bg-red-950/30" />
                <StatCard label="Completion Rate" value={data?.completionRate} icon={TrendingUp} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-950/30" suffix="%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Breakdown */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Status Distribution
                    </h2>
                    <div className="flex items-center justify-around gap-8">
                        <div className="relative shrink-0">
                            <DonutChart slices={statusSlices} size={160} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">{data?.total}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks</span>
                            </div>
                        </div>
                        <div className="space-y-3 flex-1 max-w-[200px]">
                            {statusSlices.map(s => (
                                <div key={s.label} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{s.label.replace('_', ' ')}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Health Check */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Project Velocity
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 text-left">Overall Progress</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{data?.completionRate}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                    style={{ width: `${data?.completionRate}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Open Tasks</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{data?.total - data?.completed}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Completed (30d)</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {Object.values(data?.dailyCompletion || {}).reduce((a, b) => a + b, 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectStatsView;
