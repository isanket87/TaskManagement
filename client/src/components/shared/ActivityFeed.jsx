import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import Avatar from '../ui/Avatar';

const ActivityFeed = ({ activities = [] }) => {
    if (!activities.length) return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center min-h-[200px] shadow-sm">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Activity Feed</h3>
            <p className="text-sm text-slate-500 text-center">No recent activity recorded.</p>
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm max-h-[500px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 px-1 shrink-0">
                <Activity className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {activities.map((activity, index) => (
                    <div key={activity.id} className="relative">
                        {index !== activities.length - 1 && (
                            <div className="absolute top-8 left-[17px] bottom-[-24px] w-px bg-slate-200 dark:bg-slate-700" />
                        )}
                        <div className="flex items-start gap-4">
                            <Avatar user={activity.user} size="sm" className="ring-4 ring-white dark:ring-slate-800 shrink-0 relative z-10" />
                            <div className="flex-1 min-w-0 pt-0.5 pb-2">
                                <p className="text-[13px] sm:text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1">{activity.user?.name}</span>
                                    {activity.message}
                                </p>
                                <p className="text-xs font-medium text-slate-400 mt-1">
                                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityFeed;
