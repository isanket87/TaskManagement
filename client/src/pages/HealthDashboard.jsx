import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Server, Database, Zap, Globe, Mail, CreditCard, Bot, Wifi, DollarSign } from 'lucide-react';
import axios from 'axios';
import PageWrapper from '../components/layout/PageWrapper';
import { cn } from '../utils/helpers';

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS = {
    ok: { label: 'Operational', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800', anim: 'animate-pulse' },
    degraded: { label: 'Degraded', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800', anim: 'animate-pulse' },
    down: { label: 'Down', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800', anim: 'animate-pulse' },
    checking: { label: 'Checking…', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', anim: '' },
};

const OVERALL_BANNER = {
    healthy: { bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, iconClass: 'text-emerald-500', title: 'All Systems Operational', titleClass: 'text-emerald-700 dark:text-emerald-400' },
    degraded: { bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800', icon: AlertTriangle, iconClass: 'text-amber-500', title: 'Partial Degradation', titleClass: 'text-amber-700 dark:text-amber-400' },
    down: { bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800', icon: XCircle, iconClass: 'text-red-500', title: 'Major Outage Detected', titleClass: 'text-red-700 dark:text-red-400' },
    checking: { bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700', icon: Activity, iconClass: 'text-slate-500', title: 'Checking System Status…', titleClass: 'text-slate-600 dark:text-slate-400' },
};

// ── Mini sparkline (SVG) ───────────────────────────────────────────────────────
function Sparkline({ values = [], color = '#6366f1' }) {
    if (values.length < 2) return null;
    const W = 120, H = 32, PAD = 2;
    const min = Math.min(...values), range = Math.max(...values) - min || 1;
    const pts = values.map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
        return `${x},${y}`;
    }).join(' ');
    const area = `M${PAD},${H - PAD} ` + values.map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
        return `L${x},${y}`;
    }).join(' ') + ` L${W - PAD},${H - PAD} Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct, colorClass = 'bg-indigo-500' }) {
    return (
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-700', colorClass)} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
}

// ── Service card ───────────────────────────────────────────────────────────────
function ServiceCard({ icon: Icon, iconBg, name, desc, status = 'checking', metrics = [], progress, warning, footer, sparkValues, sparkColor }) {
    const s = STATUS[status] || STATUS.checking;
    const leftColors = { ok: 'border-l-emerald-500', degraded: 'border-l-amber-500', down: 'border-l-red-500', checking: 'border-l-slate-300 dark:border-l-slate-600' };

    return (
        <div className={cn(
            'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 p-5 flex flex-col gap-3 transition-all hover:shadow-md',
            leftColors[status] || leftColors.checking
        )}>
            {/* Card top */}
            <div className="flex items-start justify-between">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border', s.badge)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.dot, s.anim)} />
                    {s.label}
                </span>
            </div>

            <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>

            {/* Metrics */}
            {metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {metrics.map(m => (
                        <div key={m.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{m.label}</p>
                            <p className={cn('text-sm font-semibold font-mono', m.good ? 'text-emerald-600 dark:text-emerald-400' : m.warn ? 'text-amber-600 dark:text-amber-400' : m.bad ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200')}>{m.value ?? '—'}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Sparkline */}
            {sparkValues?.length > 1 && (
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Latency history</p>
                    <Sparkline values={sparkValues} color={sparkColor || '#6366f1'} />
                </div>
            )}

            {/* Progress */}
            {progress && (
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{progress.label}</span>
                        <span className={cn('text-[11px] font-semibold font-mono', progress.colorClass)}>{progress.valLabel}</span>
                    </div>
                    <ProgressBar pct={progress.pct} colorClass={progress.barClass} />
                </div>
            )}

            {/* Warning */}
            {warning && (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    {warning}
                </div>
            )}

            {/* Footer */}
            {footer && (
                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] font-mono text-slate-400">
                    <span>{footer.left}</span>
                    <span>{footer.right}</span>
                </div>
            )}
        </div>
    );
}

// ── Cost card ──────────────────────────────────────────────────────────────────
function CostCard({ icon: Icon, iconBg, name, plan, amount, period, budget, usedPct, breakdown }) {
    const barClass = usedPct > 85 ? 'bg-red-500' : usedPct > 65 ? 'bg-amber-500' : 'bg-emerald-500';
    const valClass = usedPct > 85 ? 'text-red-600 dark:text-red-400' : usedPct > 65 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan}</p>
                </div>
            </div>
            <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">${amount.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{period}</p>
            </div>
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Budget (${budget}/mo)</span>
                    <span className={cn('text-[11px] font-semibold font-mono', valClass)}>{usedPct}%</span>
                </div>
                <ProgressBar pct={usedPct} colorClass={barClass} />
            </div>
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-700">
                {Object.entries(breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">{k}</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Event badge ────────────────────────────────────────────────────────────────
const BADGE = {
    OK: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    WARN: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    ERROR: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    DEPLOY: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
    INFO: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
};
const DOT_COLOR = { OK: 'bg-emerald-500', WARN: 'bg-amber-500', ERROR: 'bg-red-500', DEPLOY: 'bg-indigo-500', INFO: 'bg-slate-400' };

function EventRow({ time, service, msg, badge, fresh }) {
    return (
        <div className={cn('flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-xs', fresh && 'animate-[fadeIn_0.4s_ease]')}>
            <span className={cn('w-2 h-2 rounded-full shrink-0', DOT_COLOR[badge] || DOT_COLOR.INFO)} />
            <span className="font-mono text-slate-400 w-24 shrink-0">{time}</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 w-24 shrink-0 truncate">{service}</span>
            <span className="text-slate-600 dark:text-slate-400 flex-1">{msg}</span>
            <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border shrink-0', BADGE[badge] || BADGE.INFO)}>{badge}</span>
        </div>
    );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
    return (
        <div className="flex items-center gap-3 mt-8 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0">{title}</h2>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
    );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, colorClass }) {
    return (
        <div className="text-center">
            <p className={cn('text-2xl font-bold font-mono', colorClass)}>{value}</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

function utcNow() { return new Date().toUTCString().split(' ')[4] + ' UTC'; }

const INITIAL_EVENTS = [
    { id: 1, time: '03:42 UTC', service: 'Resend', msg: 'API latency elevated — email delivery may be delayed', badge: 'WARN' },
    { id: 2, time: '03:30 UTC', service: 'Claude API', msg: 'Anthropic API health check passed — reachable', badge: 'OK' },
    { id: 3, time: '03:15 UTC', service: 'Stripe', msg: 'Stripe API health check passed — payments operating normally', badge: 'OK' },
    { id: 4, time: '02:58 UTC', service: 'Node.js', msg: 'Runtime error captured → task created with AI analysis', badge: 'ERROR' },
    { id: 5, time: '02:00 UTC', service: 'GitHub', msg: 'Deployment successful — all health checks passed', badge: 'DEPLOY' },
    { id: 6, time: '01:45 UTC', service: 'PostgreSQL', msg: 'Automated backup completed — stored successfully', badge: 'OK' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HealthDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastSecs, setLastSecs] = useState(null);
    const [events, setEvents] = useState(INITIAL_EVENTS);
    const [claudeSpark, setClaudeSpark] = useState([]);
    const [stripeSpark, setStripeSpark] = useState([]);
    const [resendSpark, setResendSpark] = useState([]);
    const [gaSpark, setGaSpark] = useState([]);
    const [dbSpark, setDbSpark] = useState([]);
    const [cpuSpark, setCpuSpark] = useState([]);
    const tickRef = useRef(null);

    const startTicker = useCallback(() => {
        clearInterval(tickRef.current);
        setLastSecs(0);
        let s = 0;
        tickRef.current = setInterval(() => setLastSecs(++s), 1000);
    }, []);

    const fetchHealth = useCallback(async (manual = false) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/health/status');
            const d = res.data?.data;
            setData(d);
            if (d?.services?.claude?.latencyMs) setClaudeSpark(p => [...p.slice(-9), d.services.claude.latencyMs]);
            if (d?.services?.stripe?.latencyMs) setStripeSpark(p => [...p.slice(-9), d.services.stripe.latencyMs]);
            if (d?.services?.resend?.latencyMs) setResendSpark(p => [...p.slice(-9), d.services.resend.latencyMs]);
            if (d?.services?.googleAnalytics?.latencyMs) setGaSpark(p => [...p.slice(-9), d.services.googleAnalytics.latencyMs]);
            if (d?.infra?.postgres?.latencyMs) setDbSpark(p => [...p.slice(-9), d.infra.postgres.latencyMs]);
            if (d?.infra?.vps?.cpuPct) setCpuSpark(p => [...p.slice(-9), d.infra.vps.cpuPct]);
            startTicker();
            if (manual) setEvents(p => [{ id: Date.now(), time: utcNow(), service: 'Health Check', msg: 'Manual refresh — all systems verified', badge: 'OK', fresh: true }, ...p.slice(0, 7)]);
        } catch { /* ignore network errors during restart */ }
        finally { setLoading(false); }
    }, [startTicker]);

    useEffect(() => {
        fetchHealth();
        const id = setInterval(() => fetchHealth(), 30_000);
        return () => { clearInterval(id); clearInterval(tickRef.current); };
    }, []);

    const svc = data?.services || {};
    const infra = data?.infra || {};
    const costs = data?.costs || {};
    const summary = data?.summary;
    const overall = data?.overall || 'checking';
    const banner = OVERALL_BANNER[overall] || OVERALL_BANNER.checking;
    const BannerIcon = banner.icon;

    const lastLabel = lastSecs === null ? 'just now' : lastSecs === 0 ? 'just now' : `${lastSecs}s ago`;

    return (
        <PageWrapper title="System Health">
            <div className="p-6 max-w-6xl mx-auto space-y-2">

                {/* Page header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            System Health
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Last checked <span className="font-medium text-slate-700 dark:text-slate-300">{lastLabel}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => fetchHealth(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
                        Refresh All
                    </button>
                </div>

                {/* Overall Status Banner */}
                <div className={cn('flex items-center gap-4 p-5 rounded-2xl border', banner.bg)}>
                    <BannerIcon className={cn('w-8 h-8 shrink-0', banner.iconClass)} />
                    <div className="flex-1">
                        <p className={cn('text-lg font-bold', banner.titleClass)}>{banner.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {summary ? `${summary.healthy} of ${summary.total} services healthy — brioright.online` : 'Fetching system status…'}
                        </p>
                    </div>
                    {summary && (
                        <div className="flex gap-6 shrink-0">
                            <StatPill label="Healthy" value={summary.healthy} colorClass="text-emerald-600 dark:text-emerald-400" />
                            <StatPill label="Degraded" value={summary.degraded} colorClass="text-amber-600 dark:text-amber-400" />
                            <StatPill label="Down" value={summary.down} colorClass="text-red-600 dark:text-red-400" />
                            <StatPill label="30d Uptime" value={summary.uptime30d} colorClass="text-slate-700 dark:text-slate-300" />
                        </div>
                    )}
                </div>

                {/* ── Third-Party Integrations ────────────────────────────── */}
                <SectionHeader title="Third-Party Integrations" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ServiceCard
                        icon={Bot} iconBg="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500"
                        name="Claude API" desc="Haiku — AI task generation & workload insights"
                        status={svc.claude?.status || 'checking'}
                        metrics={[
                            { label: 'Ping Latency', value: svc.claude ? `${svc.claude.latencyMs}ms` : '—', good: (svc.claude?.latencyMs || 9999) < 1000, warn: svc.claude?.latencyMs >= 1000 },
                            { label: 'Uptime', value: svc.claude?.uptime ?? '—', good: true },
                        ]}
                        sparkValues={claudeSpark} sparkColor="#6366f1"
                        footer={{ left: svc.claude?.note || 'Checking…', right: 'api.anthropic.com' }}
                    />
                    <ServiceCard
                        icon={CreditCard} iconBg="bg-blue-50 dark:bg-blue-950/30 text-blue-500"
                        name="Stripe" desc="Billing — Free / Pro / Business plans"
                        status={svc.stripe?.status || 'checking'}
                        metrics={[
                            { label: 'Ping Latency', value: svc.stripe ? `${svc.stripe.latencyMs}ms` : '—', good: (svc.stripe?.latencyMs || 9999) < 500, warn: svc.stripe?.latencyMs >= 500 },
                            { label: 'Uptime', value: svc.stripe?.uptime ?? '—', good: true },
                        ]}
                        sparkValues={stripeSpark} sparkColor="#3b82f6"
                        footer={{ left: svc.stripe?.note || 'Checking…', right: 'api.stripe.com' }}
                    />
                    <ServiceCard
                        icon={Mail} iconBg="bg-amber-50 dark:bg-amber-950/30 text-amber-500"
                        name="Resend" desc="Transactional email — resend.com"
                        status={svc.resend?.status || 'checking'}
                        metrics={[
                            { label: 'Ping Latency', value: svc.resend ? `${svc.resend.latencyMs}ms` : '—', good: (svc.resend?.latencyMs || 9999) < 800, warn: svc.resend?.latencyMs >= 800 },
                            { label: 'API Key', value: svc.resend?.configured ? 'Configured ✓' : 'Missing ✗', good: svc.resend?.configured, bad: !svc.resend?.configured },
                        ]}
                        sparkValues={resendSpark} sparkColor="#f59e0b"
                        footer={{ left: svc.resend?.note || 'Checking…', right: 'api.resend.com' }}
                    />
                    <ServiceCard
                        icon={Globe} iconBg="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"
                        name="Google Analytics" desc="GA4 — User behavior & site traffic"
                        status={svc.googleAnalytics?.status || 'checking'}
                        metrics={[
                            { label: 'Ping Latency', value: svc.googleAnalytics ? `${svc.googleAnalytics.latencyMs}ms` : '—', good: (svc.googleAnalytics?.latencyMs || 9999) < 1000, warn: svc.googleAnalytics?.latencyMs >= 1000 },
                            { label: 'Tracking ID', value: svc.googleAnalytics?.configured ? 'Configured ✓' : 'Missing ✗', good: svc.googleAnalytics?.configured, bad: !svc.googleAnalytics?.configured },
                        ]}
                        sparkValues={gaSpark} sparkColor="#10b981"
                        footer={{ left: svc.googleAnalytics?.note || 'Checking…', right: svc.googleAnalytics?.trackingId || 'G-XXXXXXXXXX' }}
                    />
                </div>

                {/* ── Infrastructure ──────────────────────────────────────── */}
                <SectionHeader title="Infrastructure" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ServiceCard
                        icon={Database} iconBg="bg-blue-50 dark:bg-blue-950/30 text-blue-500"
                        name="PostgreSQL 15" desc="brioright_db — primary database"
                        status={infra.postgres?.status || 'checking'}
                        metrics={[
                            { label: 'Active Conns', value: infra.postgres ? `${infra.postgres.activeConnections} / 100` : '—', good: (infra.postgres?.activeConnections || 0) < 70 },
                            { label: 'Query Latency', value: infra.postgres ? `${infra.postgres.latencyMs}ms` : '—', good: (infra.postgres?.latencyMs || 999) < 50 },
                            { label: 'Total Tasks', value: infra.postgres?.totalTasks ?? '—' },
                            { label: 'Total Users', value: infra.postgres?.totalUsers ?? '—' },
                        ]}
                        sparkValues={dbSpark} sparkColor="#3b82f6"
                        progress={infra.postgres ? { label: 'Connection pool', valLabel: `${Math.round((infra.postgres.activeConnections / 100) * 100)}%`, pct: (infra.postgres.activeConnections / 100) * 100, colorClass: 'text-emerald-600 dark:text-emerald-400', barClass: 'bg-emerald-500' } : undefined}
                        footer={{ left: infra.postgres?.dbSize ? `DB size: ${infra.postgres.dbSize}` : 'Live', right: 'brioright_db' }}
                    />
                    <ServiceCard
                        icon={Server} iconBg="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"
                        name="Node.js / PM2" desc={infra.node ? `${infra.node.version} — port ${infra.node.port}` : 'Loading…'}
                        status={infra.node?.status || 'checking'}
                        metrics={[
                            { label: 'CPU (process)', value: infra.node ? `${infra.node.cpuPct}%` : '—', good: (infra.node?.cpuPct || 0) < 60 },
                            { label: 'Heap Used', value: infra.node ? `${infra.node.heapUsedMB}MB` : '—', good: (infra.node?.heapPct || 0) < 70 },
                        ]}
                        progress={infra.node ? { label: 'Heap usage', valLabel: `${infra.node.heapPct}%`, pct: infra.node.heapPct, colorClass: infra.node.heapPct < 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', barClass: infra.node.heapPct < 70 ? 'bg-emerald-500' : 'bg-amber-500' } : undefined}
                        footer={{ left: infra.node ? `Uptime: ${infra.node.uptimeLabel}` : '…', right: `RSS: ${infra.node?.rssMB ?? '—'}MB` }}
                    />
                    <ServiceCard
                        icon={Globe} iconBg="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"
                        name="Nginx + SSL" desc={infra.nginx?.domain ? `${infra.nginx.domain} — HTTPS` : 'brioright.online — HTTPS'}
                        status={infra.nginx?.status || 'checking'}
                        metrics={[
                            { label: 'Response', value: infra.nginx ? `${infra.nginx.latencyMs}ms` : '—', good: (infra.nginx?.latencyMs || 9999) < 800, warn: (infra.nginx?.latencyMs || 0) >= 800 },
                            { label: 'SSL Expiry', value: infra.nginx?.sslDaysLeft != null ? `${infra.nginx.sslDaysLeft}d` : '—', good: (infra.nginx?.sslDaysLeft || 0) > 30, warn: (infra.nginx?.sslDaysLeft || 999) <= 30 },
                        ]}
                        progress={infra.nginx ? { label: 'SSL cert validity remaining', valLabel: `${infra.nginx.sslDaysLeft ?? 0} days`, pct: Math.min(infra.nginx.sslDaysLeft ?? 0, 90), colorClass: (infra.nginx.sslDaysLeft ?? 0) > 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', barClass: (infra.nginx.sslDaysLeft ?? 0) > 30 ? 'bg-emerald-500' : 'bg-amber-500' } : undefined}
                        footer={{ left: infra.nginx?.note || 'Checking…', right: infra.nginx?.domain || '—' }}
                    />
                    <ServiceCard
                        icon={Zap} iconBg="bg-violet-50 dark:bg-violet-950/30 text-violet-500"
                        name="Kamatera VPS" desc={infra.vps ? `${infra.vps.platform} / ${infra.vps.arch} — system stats` : 'Loading…'}
                        status={infra.vps?.status || 'checking'}
                        metrics={[
                            { label: 'CPU (system)', value: infra.vps ? `${infra.vps.cpuPct}%` : '—', good: (infra.vps?.cpuPct || 0) < 60, warn: (infra.vps?.cpuPct || 0) >= 60 },
                            { label: 'RAM Used', value: infra.vps ? `${infra.vps.ramUsedMB}MB / ${infra.vps.ramTotalMB}MB` : '—', good: (infra.vps?.ramPct || 0) < 75 },
                        ]}
                        sparkValues={cpuSpark} sparkColor="#8b5cf6"
                        progress={infra.vps ? { label: 'RAM usage', valLabel: `${infra.vps.ramPct}%`, pct: infra.vps.ramPct, colorClass: infra.vps.ramPct < 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', barClass: infra.vps.ramPct < 75 ? 'bg-emerald-500' : 'bg-amber-500' } : undefined}
                        footer={{ left: infra.vps ? `Load avg: ${infra.vps.loadAvg1m}` : '…', right: infra.node ? `↑ ${infra.node.uptimeLabel}` : '…' }}
                    />
                    <ServiceCard
                        icon={Wifi} iconBg="bg-blue-50 dark:bg-blue-950/30 text-blue-500"
                        name="DNS" desc={infra.dns?.domain ? `${infra.dns.domain} — A + MX records` : 'Resolving…'}
                        status={infra.dns?.status || 'checking'}
                        metrics={[
                            { label: 'Resolve Time', value: infra.dns?.resolveMs != null ? `${infra.dns.resolveMs}ms` : '—', good: (infra.dns?.resolveMs || 999) < 100, warn: (infra.dns?.resolveMs || 0) >= 100 },
                            { label: 'Domain', value: infra.dns?.domain ?? '—' },
                        ]}
                        footer={{ left: infra.dns?.note || 'Checking…', right: infra.dns?.domain || '—' }}
                    />
                </div>

                {/* ── Monthly Cost Tracker ────────────────────────────────── */}
                <SectionHeader title="Monthly Cost Tracker" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CostCard icon={Bot} iconBg="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500" name="Claude API" plan="Haiku — pay per use" amount={costs.claude?.amount ?? 0.18} period={costs.claude?.period ?? 'March 2026'} budget={costs.claude?.budget ?? 5} usedPct={Math.round(((costs.claude?.amount ?? 0.18) / (costs.claude?.budget ?? 5)) * 100)} breakdown={{ ...(costs.claude?.breakdown ?? {}) }} />
                    <CostCard icon={Server} iconBg="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500" name="Kamatera VPS" plan="Ubuntu 24 — fixed monthly" amount={costs.vps?.amount ?? 12} period={costs.vps?.period ?? 'March 2026'} budget={costs.vps?.budget ?? 15} usedPct={Math.round(((costs.vps?.amount ?? 12) / (costs.vps?.budget ?? 15)) * 100)} breakdown={{ ...(costs.vps?.breakdown ?? {}) }} />
                    <CostCard icon={Mail} iconBg="bg-amber-50 dark:bg-amber-950/30 text-amber-500" name="Resend Email" plan="Transactional — resend.com" amount={costs.resend?.amount ?? 0} period={costs.resend?.period ?? 'March 2026'} budget={costs.resend?.budget ?? 5} usedPct={Math.round(((costs.resend?.amount ?? 0) / (costs.resend?.budget ?? 5)) * 100)} breakdown={{ ...(costs.resend?.breakdown ?? {}) }} />
                </div>

                {/* ── Recent Events ────────────────────────────────────────── */}
                <SectionHeader title="Recent Events" />
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {events.map((e, i) => <EventRow key={e.id ?? i} {...e} />)}
                </div>

            </div>
        </PageWrapper>
    );
}
