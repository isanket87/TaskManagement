import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, FolderKanban, Calendar, BarChart3,
    Bell, Settings, ChevronLeft, ChevronRight, CheckSquare, Plus,
    MessageSquare, Clock, User, LogOut, ChevronDown
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import useChatStore from '../../store/chatStore';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import { useState } from 'react';
import { cn } from '../../utils/helpers';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import useWorkspaceStore from '../../store/workspaceStore';

const NAV_GROUPS = [
    {
        label: 'Main',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/projects', icon: FolderKanban, label: 'Projects', badgeKey: 'projects' }, // Using badgeKey to hook into counts later if needed
            { to: '/calendar', icon: Calendar, label: 'Calendar' },
        ],
    },
    {
        label: 'Team',
        items: [
            { to: '/messages', icon: MessageSquare, label: 'Messages', badgeKey: 'messages' },
            { to: '/notifications', icon: Bell, label: 'Notifications', badgeKey: 'notifications', dangerBadge: true },
        ]
    },
    {
        label: 'Tracking',
        items: [
            { to: '/timesheets', icon: Clock, label: 'Timesheets' },
        ]
    }
];

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuthStore();
    const { unreadCount: notifCount } = useNotificationStore();
    const { unreadCounts: chatCounts } = useChatStore();
    const { workspace } = useWorkspaceStore();
    const navigate = useNavigate();

    const _totalChatsUnread = Object.values(chatCounts || {}).reduce((s, c) => s + c, 0);

    const getBadgeCount = (key) => {
        if (key === 'notifications') return notifCount;
        if (key === 'messages') return _totalChatsUnread;
        return 0; // default for others
    };

    const userMenuItems = [
        { icon: <User className="w-4 h-4" />, label: 'Profile Settings', onClick: () => navigate(workspace ? `/workspace/${workspace.slug}/profile` : '/settings') },
        { separator: true },
        { icon: <LogOut className="w-4 h-4" />, label: 'Sign out', danger: true, onClick: async () => { await logout(); navigate('/login'); } },
    ];

    return (
        <motion.aside
            animate={{ width: collapsed ? 64 : 240 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-40 relative"
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="font-bold text-slate-800 dark:text-slate-100 text-lg whitespace-nowrap"
                        >
                            TaskFlow
                        </motion.span>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="ml-auto p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 shrink-0 transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
                <div className="mb-4">
                    <WorkspaceSwitcher collapsed={collapsed} />
                </div>
                {NAV_GROUPS.map((group, groupIdx) => (
                    <div key={groupIdx}>
                        {/* Section Label */}
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2"
                                >
                                    {group.label}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1">
                            {group.items.map(({ to, icon: Icon, label, badgeKey, dangerBadge }, i) => {
                                const count = getBadgeCount(badgeKey);
                                const currentTo = workspace ? `/workspace/${workspace.slug}${to}` : to;
                                return (
                                    <NavLink
                                        key={to}
                                        to={currentTo}
                                        title={collapsed ? label : undefined}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative group",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
                                            collapsed && "justify-center"
                                        )}
                                    >
                                        <Icon className="w-4.5 h-4.5 shrink-0" />

                                        <AnimatePresence>
                                            {!collapsed && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -8 }}
                                                    className="whitespace-nowrap flex-1"
                                                >
                                                    {label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>

                                        {/* Badge full text when expanded */}
                                        {!collapsed && count > 0 && (
                                            <span className={cn(
                                                "ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                                                dangerBadge
                                                    ? "bg-red-500 text-white"
                                                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                                            )}>
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        )}

                                        {/* Badge dot when collapsed */}
                                        {collapsed && count > 0 && (
                                            <span className={cn(
                                                "absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900",
                                                dangerBadge ? "bg-red-500" : "bg-indigo-500"
                                            )} />
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Settings outside of groups at bottom of nav */}
                <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
                    <NavLink
                        to={workspace ? `/workspace/${workspace.slug}/profile` : '/settings'}
                        title={collapsed ? "Settings" : undefined}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative",
                            isActive
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
                            collapsed && "justify-center"
                        )}
                    >
                        <Settings className="w-4.5 h-4.5 shrink-0" />
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    className="whitespace-nowrap flex-1"
                                >
                                    Settings
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>
                </div>
            </nav>

            {/* User Profile Footer */}
            <Dropdown
                align="left"
                position="top"
                items={userMenuItems}
                trigger={
                    <div className={cn(
                        "p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        collapsed ? "justify-center" : "px-4"
                    )}>
                        <div className="relative shrink-0">
                            <Avatar user={user} size="sm" />
                            {/* Online dot */}
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="min-w-0 flex-1"
                                    >
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{user?.name || 'User'}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                                    </motion.div>
                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                }
            />
        </motion.aside>
    );
};

export default Sidebar;
