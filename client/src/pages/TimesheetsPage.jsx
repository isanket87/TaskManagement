import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Clock, DollarSign, TrendingUp, CalendarDays, Plus, MoreVertical } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import * as timeService from '../services/timeService';
import toast from 'react-hot-toast';
import PageWrapper from '../components/layout/PageWrapper';
import Dropdown from '../components/ui/Dropdown';
import { cn } from '../utils/helpers';
import useWorkspaceStore from '../store/workspaceStore';

const pad = (n) => String(Math.floor(n)).padStart(2, '0');
const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${pad(m)}m`;
};
const formatClock = (isoStr) => isoStr ? format(new Date(isoStr), 'h:mm a') : '—';

const StatCard = ({ icon: Icon, label, value, colorClass }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colorClass.bg)}>
                <Icon className={cn("w-5 h-5", colorClass.text)} />
            </div>
        </div>
        <div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    </div>
);

const TimesheetsPage = () => {
    const [weekOffset, setWeekOffset] = useState(0);

    const currentWeekDate = useMemo(() => {
        let d = new Date();
        for (let i = 0; i < Math.abs(weekOffset); i++) {
            d = weekOffset > 0 ? addWeeks(d, 1) : subWeeks(d, 1);
        }
        return d;
    }, [weekOffset]);

    const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });
    const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

    const workspace = useWorkspaceStore(s => s.workspace);

    const { data: sheet, isLoading } = useQuery({
        queryKey: ['timesheet', workspace?.slug, weekOffset],
        queryFn: async () => {
            const res = await timeService.getTimesheet(format(currentWeekDate, "yyyy-'W'II"));
            return res.data.data;
        },
    });

    const { data: summary } = useQuery({
        queryKey: ['time-summary', workspace?.slug],
        queryFn: async () => {
            const res = await timeService.getSummary();
            return res.data.data;
        },
    });

    const handleExport = async () => {
        try {
            const res = await timeService.exportTimesheet({});
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = `timesheet_${format(currentWeekDate, 'yyyy-MM-dd')}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Export failed'); }
    };

    const totalWeekSeconds = sheet?.days?.reduce((s, d) => s + d.totalSeconds, 0) || 0;

    return (
        <PageWrapper title="Timesheets" subtitle="Track and manage your time">
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    {/* Header handled by PageWrapper, adding export button here */}
                    <div className="flex-1" />
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm">
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                {/* Summary stats */}
                {summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={Clock} label="Today" value={formatDuration(summary.todaySeconds)} colorClass={{ bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-500' }} />
                        <StatCard icon={TrendingUp} label="This Week" value={formatDuration(summary.weekSeconds)} colorClass={{ bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-500' }} />
                        <StatCard icon={DollarSign} label="Billable" value={formatDuration(summary.billableSeconds)} colorClass={{ bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-500' }} />
                        <StatCard icon={CalendarDays} label="Projects" value={summary.projectCount || 0} colorClass={{ bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-500' }} />
                    </div>
                )}

                {/* Daily Bar Chart */}
                {summary && sheet && !isLoading && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            Weekly Overview
                        </h2>
                        <div className="flex items-end gap-2 h-40 sm:gap-4 mt-6">
                            {eachDayOfInterval({ start: weekStart, end: weekEnd }).map((date) => {
                                const dateStr = format(date, 'yyyy-MM-dd');
                                const dayData = sheet?.days?.find((d) => d.date === dateStr);
                                const seconds = dayData?.totalSeconds || 0;
                                // Max 12 hours for scale reference
                                const maxScale = 12 * 3600;
                                const heightPct = Math.min((seconds / maxScale) * 100, 100);

                                return (
                                    <div key={dateStr} className="flex-1 flex flex-col items-center gap-2 group">
                                        {/* Tooltip */}
                                        <div className="absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                            {formatDuration(seconds)}
                                        </div>
                                        <div className="w-full relative flex-1 flex items-end justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                                            {/* Bar fill */}
                                            <div
                                                className="w-full bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all rounded-t-sm"
                                                style={{ height: `${Math.max(heightPct, 2)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">{format(date, 'EEE')}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Week navigator */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                        <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <ChevronLeft size={18} />
                        </button>
                        <div className="text-center">
                            <p className="font-semibold text-slate-900 dark:text-white">{weekLabel}</p>
                            <p className="text-sm font-medium text-slate-500">{formatDuration(totalWeekSeconds)} total tracked</p>
                        </div>
                        <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:shadow-none" disabled={weekOffset >= 0}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="p-12 text-center text-slate-400 font-medium">Loading timesheet...</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {sheet?.days?.map(day => (
                                <div key={day.date} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                            {format(new Date(day.date), 'EEEE, MMM d')}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                {formatDuration(day.totalSeconds)}
                                            </span>
                                            <button
                                                onClick={() => toast.success('Open add time modal for ' + day.date)}
                                                className="p-1 px-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-md transition-colors"
                                                title="Add Time"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                    {day.entries.length === 0 ? (
                                        <p className="text-sm text-slate-400 pl-2 py-2">No entries logged for this day.</p>
                                    ) : (
                                        <div className="space-y-1.5 mt-2">
                                            {day.entries.map(e => (
                                                <div key={e.id} className="group relative flex items-center gap-2 sm:gap-3 p-2 sm:px-3 rounded-xl text-sm hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                                    <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: e.project.color || '#6366f1' }} />
                                                    <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 pr-2">
                                                        <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-mono w-auto sm:w-[130px] shrink-0 font-medium">
                                                            {formatClock(e.startTime)} – {formatClock(e.endTime)}
                                                        </span>
                                                        <span className="text-slate-700 dark:text-slate-200 truncate font-medium flex-1">
                                                            {e.description || e.task?.title || 'No description provided'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                        <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wider uppercase text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 flex-shrink py-1 max-w-[120px] truncate rounded-md border border-slate-200 dark:border-slate-600" title={e.project.name}>
                                                            {e.project.name}
                                                        </span>
                                                        <button
                                                            onClick={(ev) => { ev.stopPropagation(); toast.success('Toggled billable status'); }}
                                                            className={cn(
                                                                "p-1.5 rounded-lg transition-colors border",
                                                                e.billable
                                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400"
                                                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:hover:text-slate-300"
                                                            )}
                                                            title={e.billable ? 'Billable' : 'Non-billable'}
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right min-w-[50px]">
                                                            {formatDuration(e.duration)}
                                                        </span>
                                                        <Dropdown
                                                            align="right"
                                                            trigger={
                                                                <button className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            }
                                                            items={[
                                                                { label: 'Edit Entry', onClick: () => toast.success('Edit entry') },
                                                                { label: 'Delete Entry', danger: true, onClick: () => toast.success('Delete entry') }
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </PageWrapper>
    );
};

export default TimesheetsPage;
