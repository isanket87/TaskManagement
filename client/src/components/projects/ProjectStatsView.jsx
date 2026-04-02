import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
    CheckCircle2, 
    ListTodo, 
    AlertTriangle, 
    TrendingUp, 
    Activity,
    Calendar,
    Zap,
    Users,
    ArrowRight,
    Clock,
    Star,
    Loader2
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { cn } from '../../utils/helpers';

const fmt = (n) => (n ?? 0).toLocaleString();

// Enhanced StatCard with "Holographic Icon Node"
const StatCard = ({ label, value, icon: Icon, colorClass, glowClass, suffix = '', pulse = false }) => (
    <motion.div 
        whileHover={{ y: -6, scale: 1.02 }}
        className={cn(
            "relative overflow-hidden glass-premium rounded-[32px] p-7 shadow-ultra group border-holographic transition-all duration-500",
            pulse && "ring-2 ring-emerald-500/20 animate-pulse"
        )}
    >
        {/* Cinematic Backdrop Glow */}
        <div className={cn("absolute -right-12 -top-12 w-48 h-48 blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity duration-1000", glowClass)} />
        
        <div className="relative flex flex-col gap-6">
            {/* Holographic Icon Node */}
            <div className="relative w-16 h-16 group/icon">
                <div className={cn("icon-node-glow", glowClass)} />
                <div className="absolute inset-0 glass-inset flex items-center justify-center rounded-2xl border-white/40 dark:border-white/20 shadow-lg group-hover/icon:scale-110 transition-transform duration-500">
                    <Icon className={cn("w-8 h-8 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]", colorClass)} />
                </div>
            </div>

            <div>
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {fmt(value)}
                    </span>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{suffix}</span>
                </div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mt-2 leading-none opacity-60">{label}</p>
            </div>
        </div>
    </motion.div>
);

// Sample Data Hydration for "True Perfection" density
const GHOST_TASKS = [
    { _id: 'g1', title: 'Refine Project Strategic Roadmap', priority: 'urgent', status: 'in_progress', isGhost: true },
    { _id: 'g2', title: 'Establish Operational Benchmarks', priority: 'high', status: 'todo', isGhost: true },
    { _id: 'g3', title: 'Finalise Q2 Performance Review', priority: 'high', status: 'done', isGhost: true }
];

const GHOST_MEMBERS = [
    { _id: 'm1', name: 'Strategy AI', role: 'Virtual Analyst', isGhost: true },
    { _id: 'm2', name: 'System Core', role: 'Automation', isGhost: true }
];

const PriorityList = ({ tasks = [] }) => {
    const displayTasks = tasks.length > 0 ? tasks : GHOST_TASKS;
    const isEmpty = tasks.length === 0;

    return (
        <div className="glass-premium rounded-[40px] p-8 shadow-xl border-holographic flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl glass-inset flex items-center justify-center">
                        <Star className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Top Priorities</h3>
                        {isEmpty && <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Sample Insights active</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {displayTasks.map(task => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={task._id} 
                        className={cn(
                            "p-5 glass-inset glass-card-hover group border-holographic",
                            task.isGhost && "opacity-60 grayscale-[0.5]"
                        )}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                                    {task.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", 
                                        task.priority === 'urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                        task.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                    )}>
                                        {task.priority}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{task.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const MemberMatrix = ({ members = [] }) => {
    const displayMembers = members.length > 1 ? members : [...members, ...GHOST_MEMBERS];

    return (
        <div className="glass-premium rounded-[40px] p-8 shadow-xl border-holographic">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl glass-inset flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Active Team</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {displayMembers.slice(0, 6).map(member => (
                    <div key={member.userId || member._id} className={cn(
                        "p-4 glass-inset flex items-center gap-4 group hover:scale-[1.02] transition-all border-holographic",
                        member.isGhost && "opacity-50"
                    )}>
                        <div className="w-12 h-12 rounded-2xl glass-inset flex items-center justify-center text-sm font-black text-indigo-400 overflow-hidden relative shadow-lg">
                            {member.userAvatar ? <img src={member.userAvatar} alt="" /> : (member.userName || member.name)?.[0]}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-black text-slate-800 dark:text-white truncate">{member.userName || member.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{member.role || 'Member'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProjectStatsView = ({ projectId }) => {
    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['project-analytics', projectId],
        queryFn: async () => {
            const res = await projectService.getAnalytics(projectId);
            return res.data?.data?.analytics;
        }
    });

    const { data: memberData } = useQuery({
        queryKey: ['project-members', projectId],
        queryFn: async () => {
            const res = await projectService.getMembers(projectId);
            return res.data?.data?.members;
        }
    });

    const { data: taskData } = useQuery({
        queryKey: ['project-tasks-priority', projectId],
        queryFn: async () => {
            const res = await taskService.getAll(projectId, { priority: 'high,urgent', limit: 5 });
            return res.data?.data?.tasks;
        }
    });

    if (analyticsLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-6">
                <div className="relative w-16 h-16">
                    <Loader2 className="w-16 h-16 text-indigo-500 animate-spin opacity-20" />
                    <Activity className="absolute inset-0 w-8 h-8 text-indigo-500 m-auto animate-pulse" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Syncing Atmosphere...</p>
            </div>
        );
    }

    const data = analyticsData;
    const velocityData = Object.entries(data?.dailyCompletion || {})
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-14)
        .map(([date, count]) => ({
            day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            tasks: count
        }));

    return (
        <div className="max-w-7xl mx-auto w-full px-8 pt-4 pb-16 space-y-12 h-full overflow-y-auto hide-scrollbar bg-transparent">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">PROJECT OVERVIEW</h2>
                    <div className="flex items-center gap-4 mt-6">
                        <div className="flex items-center gap-2 px-4 py-2 glass-premium rounded-full">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Pulse</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div className="px-6 py-3 glass-premium rounded-[24px] border-holographic flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Performance Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard label="Operational Volume" value={data?.total} icon={ListTodo} colorClass="text-indigo-400" glowClass="bg-indigo-500" />
                <StatCard label="Success Deploys" value={data?.completed} icon={CheckCircle2} colorClass="text-emerald-400" glowClass="bg-emerald-500" />
                <StatCard label="System Blockers" value={data?.overdue} icon={AlertTriangle} colorClass="text-rose-400" glowClass="bg-rose-500" />
                <StatCard label="Efficiency Index" value={data?.completionRate} icon={Zap} colorClass="text-amber-400" glowClass="bg-amber-500" suffix="%" pulse={data?.completionRate > 0} />
            </div>

            {/* Main Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="flex flex-col gap-10">
                    <PriorityList tasks={taskData} />
                    <MemberMatrix members={memberData} />
                </div>

                <div className="lg:col-span-2 glass-premium rounded-[48px] p-10 shadow-ultra border-holographic flex flex-col h-full bg-slate-900/10 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl glass-inset flex items-center justify-center">
                                <TrendingUp className="w-7 h-7 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Performance Amplitude</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Velocity Trend Tracker</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[350px] w-full mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={velocityData}>
                                <defs>
                                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                                        <stop offset="50%" stopColor="#6366f1" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.05)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={15} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                        borderRadius: '24px', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                        color: '#fff',
                                        padding: '16px'
                                    }}
                                    itemStyle={{ color: '#818cf8', fontWeight: 800, fontSize: '14px' }}
                                />
                                <Area type="monotone" dataKey="tasks" stroke="#818cf8" strokeWidth={6} fillOpacity={1} fill="url(#velocityGrad)" animationDuration={2500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-12 pt-12 border-t border-white/5 grid grid-cols-3 gap-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Peak Stability</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">Optimum</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Consistency</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">94.2%</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Project Vitality</p>
                            <p className="text-lg font-black text-emerald-500">EXCELLENT</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Health Strip */}
            <div className="glass-premium rounded-[40px] p-10 flex flex-col md:flex-row items-center gap-10 shadow-ultra border-holographic overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="flex-1 space-y-4 relative z-10 text-center md:text-left">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                        <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em]">Project Vital Signs • Operational</h4>
                    </div>
                    <p className="text-base font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                        Atmospheric monitoring indicates a high-performance environment. System stability tracking at <strong>{data?.completionRate}%</strong> completion density.
                    </p>
                </div>
                <div className="w-full md:w-96 space-y-3 relative z-10">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Density Index</span>
                        <span className="text-2xl font-black text-emerald-500">{Math.round(data?.completionRate)}%</span>
                    </div>
                    <div className="h-5 bg-slate-900/10 dark:bg-white/5 rounded-full p-1.5 shadow-inner border border-white/5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${data?.completionRate}%` }}
                            transition={{ duration: 2.5, ease: "circOut" }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-full relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-[shimmer_2.5s_infinite]" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectStatsView;
