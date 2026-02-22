import { motion } from 'framer-motion';
import { AlertCircle, Clock, Zap, TrendingUp } from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';

const CARDS = [
    { key: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', filter: 'overdue' },
    { key: 'dueToday', label: 'Due Today', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', filter: 'today' },
    { key: 'dueSoon', label: 'This Week', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', filter: 'this_week' },
    { key: 'upcoming', label: 'Upcoming', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', filter: 'upcoming' },
];

const DueDateSummaryCards = ({ onFilter, activeFilter }) => {
    const { dueDateSummary } = useNotificationStore();

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map(({ key, label, icon: Icon, color, bg, border, filter }, i) => {
                const isActive = activeFilter === filter;

                return (
                    <motion.button
                        key={key}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onFilter(isActive ? '' : filter)}
                        className={`relative p-5 rounded-2xl flex flex-col items-start gap-4 transition-all duration-200 border bg-white dark:bg-slate-800 text-left ${isActive ? 'ring-2 ring-indigo-500 border-transparent shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'}`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                                <Icon className={`w-5 h-5 ${color}`} />
                            </div>
                            {isActive && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />}
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                                {dueDateSummary[key] ?? 0}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {label}
                            </p>
                        </div>
                        {/* Decorative background accent on active */}
                        {isActive && (
                            <div className={`absolute inset-0 rounded-2xl opacity-5 pointer-events-none ${bg.split(' ')[0]}`} />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};

export default DueDateSummaryCards;
