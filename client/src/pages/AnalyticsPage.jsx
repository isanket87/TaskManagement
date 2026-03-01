import { useQuery } from '@tanstack/react-query';
import { TrendingUp, CheckCircle2, ListTodo, BarChart3, Trophy, Layers } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Avatar from '../components/ui/Avatar';
import api from '../services/api';
import useWorkspaceStore from '../store/workspaceStore';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();

const STATUS_COLORS = {
    todo: '#6366f1',
    in_progress: '#f59e0b',
    review: '#8b5cf6',
    done: '#10b981',
};
const PRIORITY_COLORS = {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#6366f1',
};

// ── Stat overview card ─────────────────────────────────────────────────────────
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

// ── SVG Line Chart (30-day trend) ──────────────────────────────────────────────
const LineChart = ({ data = [] }) => {
    if (!data.length) return null;
    const W = 600, H = 120, PAD = 10;
    const max = Math.max(...data.map(d => d.count), 1);
    const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
    const ys = data.map(d => H - PAD - ((d.count / max) * (H - PAD * 2)));
    const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    const area = `M${xs[0]},${H - PAD} ` + xs.map((x, i) => `L${x},${ys[i]}`).join(' ') + ` L${xs[xs.length - 1]},${H - PAD} Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
            <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#trend-fill)" />
            <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {xs.map((x, i) => data[i].count > 0 && (
                <circle key={i} cx={x} cy={ys[i]} r="3" fill="#6366f1" />
            ))}
        </svg>
    );
};

// ── Donut / Pie segment chart ──────────────────────────────────────────────────
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
            <circle cx={cx} cy={cy} r="20" fill="white" className="dark:fill-slate-800" />
        </svg>
    );
};

// ── Bar chart (priority) ───────────────────────────────────────────────────────
const BarChart = ({ data }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-3 h-24">
            {data.map(d => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.value}</span>
                    <div
                        className="w-full rounded-t-lg transition-all"
                        style={{ height: `${Math.max((d.value / max) * 72, 4)}px`, backgroundColor: d.color }}
                    />
                    <span className="text-[10px] text-slate-500 capitalize">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
    const workspace = useWorkspaceStore(s => s.workspace);

    const { data, isLoading } = useQuery({
        queryKey: ['workspace-analytics', workspace?.slug],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspace.slug}/analytics`);
            return res.data.data;
        },
        enabled: !!workspace?.slug,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <PageWrapper title="Analytics">
                <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
            </PageWrapper>
        );
    }

    const statusSlices = Object.entries(data?.byStatus || {}).map(([k, v]) => ({
        label: k, value: v, color: STATUS_COLORS[k] || '#94a3b8'
    }));
    const priorityBars = ['urgent', 'high', 'medium', 'low'].map(p => ({
        label: p, value: data?.byPriority?.[p] || 0, color: PRIORITY_COLORS[p]
    }));

    return (
        <PageWrapper title="Analytics">
            <div className="p-6 space-y-6 max-w-6xl mx-auto">

                {/* Header */}
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Workspace Analytics</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Task completion, project progress, and team performance</p>
                </div>

                {/* Overview cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Tasks" value={data?.totalTasks} icon={ListTodo} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-950/30" />
                    <StatCard label="Completed" value={data?.completedTasks} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-950/30" />
                    <StatCard label="Open" value={data?.openTasks} icon={Layers} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" />
                    <StatCard label="Completion Rate" value={data?.completionRate} icon={TrendingUp} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-950/30" suffix="%" />
                </div>

                {/* 30-day trend */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Task Completion — Last 30 Days</h2>
                    </div>
                    <LineChart data={data?.completionTrend || []} />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-400">30 days ago</span>
                        <span className="text-xs text-slate-400">Today</span>
                    </div>
                </div>

                {/* Status donut + Priority bar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Tasks by Status</h2>
                        <div className="flex items-center gap-6">
                            <div className="shrink-0">
                                <DonutChart slices={statusSlices} size={120} />
                            </div>
                            <div className="space-y-2 flex-1">
                                {statusSlices.map(s => (
                                    <div key={s.label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{s.label.replace('_', ' ')}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.value}</span>
                                    </div>
                                ))}
                                {!statusSlices.length && <p className="text-sm text-slate-400">No tasks yet</p>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Tasks by Priority</h2>
                        <BarChart data={priorityBars} />
                    </div>
                </div>

                {/* Project progress */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Project Progress</h2>
                    </div>
                    {!data?.projects?.length ? (
                        <p className="text-sm text-slate-400">No projects yet</p>
                    ) : (
                        <div className="space-y-4">
                            {data.projects.map(p => (
                                <div key={p.id}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#6366f1' }} />
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{p.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 ml-2">{p.percent}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${p.percent}%`, backgroundColor: p.color || '#6366f1' }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{p.done} / {p.total} tasks completed</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Leaderboard */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Team Leaderboard — This Month</h2>
                    </div>
                    {!data?.leaderboard?.length ? (
                        <p className="text-sm text-slate-400">No completed tasks this month yet</p>
                    ) : (
                        <div className="space-y-3">
                            {data.leaderboard.map((entry, i) => (
                                <div key={entry.user?.id || i} className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                                        }`}>
                                        {i + 1}
                                    </span>
                                    <Avatar user={entry.user} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{entry.user?.name || 'Unknown'}</p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entry.completed} done</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </PageWrapper>
    );
};

export default AnalyticsPage;
