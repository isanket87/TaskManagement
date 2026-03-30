import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, CheckCircle2, ListTodo, BarChart3, Trophy, Layers, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import PageWrapper from '../components/layout/PageWrapper';
import Avatar from '../components/ui/Avatar';
import api from '../services/api';
import useWorkspaceStore from '../store/workspaceStore';
import { cn } from '../utils/helpers';

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

// Custom Premium Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 text-sm flex flex-col gap-1.5 z-50">
                {label && <p className="font-bold text-slate-800 dark:text-slate-200">{label}</p>}
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color || entry.payload?.fill || '#6366f1' }} />
                        <span className="font-medium text-slate-600 dark:text-slate-400 capitalize whitespace-nowrap">{entry.name}:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// ── Stat overview card ─────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg, suffix = '' }) => (
    <motion.div 
        whileHover={{ y: -4, scale: 1.02 }}
        className="group relative bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-5 flex items-center gap-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)] hover:shadow-xl transition-all overflow-hidden"
    >
        {/* Subtle Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="relative z-10">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(value)}{suffix}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</p>
        </div>
    </motion.div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
    const workspace = useWorkspaceStore(s => s.workspace);
    const [range, setRange] = useState('30d');

    const { data, isLoading } = useQuery({
        queryKey: ['workspace-analytics', workspace?.slug, range],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspace.slug}/analytics`, { params: { range } });
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
        name: k.replace('_', ' '), value: v, color: STATUS_COLORS[k] || '#94a3b8'
    }));

    const priorityBars = ['urgent', 'high', 'medium', 'low'].map(p => ({
        name: p, value: data?.byPriority?.[p] || 0, fill: PRIORITY_COLORS[p]
    }));

    const RANGE_LABELS = {
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
        '90d': 'Last 90 Days',
        'all': 'All Time (90d max)'
    };

    // Prepare data for Stacked Bar Chart
    const breakdownData = data?.creationTrend?.map((d, i) => {
        // Find corresponding completion data by date
        const comp = data?.completionTrend?.find(c => c.date === d.date)
        return {
            date: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            Created: d.count || 0,
            Completed: comp ? comp.count : 0
        };
    }) || [];

    // Formatted Trend for Area Chart
    const trendData = data?.completionTrend?.map(d => ({
        date: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        Completed: d.count || 0
    })) || [];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <PageWrapper title="Analytics">
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="p-6 space-y-6 max-w-6xl mx-auto"
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Workspace Analytics</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Task completion, project progress, and team performance</p>
                    </div>
                    
                    <div className="flex items-center gap-1 p-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                        {Object.entries(RANGE_LABELS).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setRange(val)}
                                className={cn(
                                    "px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                    range === val 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                )}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Overview cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Tasks" value={data?.totalTasks} icon={ListTodo} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-950/30" />
                    <StatCard label="Completed" value={data?.completedTasks} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-950/30" />
                    <StatCard label="Open" value={data?.openTasks} icon={Layers} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" />
                    <StatCard label="Completion Rate" value={data?.completionRate} icon={TrendingUp} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-950/30" suffix="%" />
                </motion.div>

                {/* 30-day trend */}
                <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">Task Completion Trend</h2>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Completed" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Col (2-span) */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Productivity Breakdown (Creation vs Completion) */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    <h2 className="font-bold text-slate-800 dark:text-slate-100">Productivity Breakdown</h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shadow-sm" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={breakdownData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#64748b', opacity: 0.05 }} />
                                        <Bar dataKey="Created" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Team Workload */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-2 mb-6">
                                <Users className="w-5 h-5 text-indigo-500" />
                                <h2 className="font-bold text-slate-800 dark:text-slate-100">Team Workload (Open Tasks)</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!data?.workload?.length ? (
                                    <div className="col-span-full py-8 text-center text-sm font-medium text-slate-400">No active tasks assigned</div>
                                ) : (
                                    data.workload.map(entry => (
                                        <motion.div 
                                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                            key={entry.user?.id} 
                                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                                        >
                                            <Avatar user={entry.user} size="md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{entry.user?.name}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="flex-1 h-1.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden shadow-inner">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min((entry.count / 10) * 100, 100)}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className="h-full bg-indigo-500 rounded-full shadow-sm" 
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{entry.count}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Col (1-span) */}
                    <div className="space-y-6">
                        {/* Status Pie Chart */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)] flex flex-col items-center">
                            <h2 className="font-bold text-slate-800 dark:text-slate-100 w-full mb-2">Tasks by Status</h2>
                            <div className="h-[220px] w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Pie
                                            data={statusSlices}
                                            innerRadius={65}
                                            outerRadius={95}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusSlices.map((slice, index) => (
                                                <Cell key={`cell-${index}`} fill={slice.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                        {data?.totalTasks || 0}
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tasks by Priority BarChart */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)]">
                            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Tasks by Priority</h2>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={priorityBars} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }} barSize={16}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.15} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', textTransform: 'capitalize' }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#64748b', opacity: 0.05 }} />
                                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                            {priorityBars.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Leaderboard */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <h2 className="font-bold text-slate-800 dark:text-slate-100">Team Leaderboard</h2>
                            </div>
                            {!data?.leaderboard?.length ? (
                                <p className="text-sm font-medium text-slate-400 text-center py-4">No completed tasks yet</p>
                            ) : (
                                <div className="space-y-4 pt-2">
                                    {data.leaderboard.slice(0, 5).map((entry, i) => (
                                        <div key={entry.user?.id || i} className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                i === 0 ? 'bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 shadow-md shadow-amber-500/30' :
                                                i === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-sm' :
                                                i === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900 shadow-sm' :
                                                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {i + 1}
                                            </span>
                                            <Avatar user={entry.user} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{entry.user?.name || 'Unknown'}</p>
                                            </div>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{entry.completed}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>

            </motion.div>
        </PageWrapper>
    );
};

export default AnalyticsPage;
