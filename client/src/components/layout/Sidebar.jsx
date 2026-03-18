import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, FolderKanban, Calendar, BarChart3,
    Bell, Settings, ChevronLeft, ChevronRight, CheckSquare, Plus,
    MessageSquare, Clock, User, LogOut, ChevronDown, Sparkles,
    Search, Command, PanelLeft
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import useChatStore from '../../store/chatStore';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import { useState, useEffect } from 'react';
import { cn } from '../../utils/helpers';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import useWorkspaceStore from '../../store/workspaceStore';

const NAV_GROUPS = [
    {
        label: 'Platform',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/projects', icon: FolderKanban, label: 'Projects', badgeKey: 'projects' },
            { to: '/calendar', icon: Calendar, label: 'Calendar' },
        ],
    },
    {
        label: 'Collaboration',
        items: [
            { to: '/messages', icon: MessageSquare, label: 'Messages', badgeKey: 'messages' },
            { to: '/notifications', icon: Bell, label: 'Activity', badgeKey: 'notifications', dangerBadge: true },
        ]
    },
    {
        label: 'Insight',
        items: [
            { to: '/timesheets', icon: Clock, label: 'Timesheets' },
            { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        ]
    }
];

const Sidebar = ({ isMobileOpen, onMobileClose }) => {
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved === 'true';
    });
    
    const { user, logout } = useAuthStore();
    const { unreadCount: notifCount } = useNotificationStore();
    const { unreadCounts: chatCounts } = useChatStore();
    const { workspace } = useWorkspaceStore();
    const navigate = useNavigate();
    const location = useLocation();

    const _totalChatsUnread = Object.values(chatCounts || {}).reduce((s, c) => s + c, 0);

    const getBadgeCount = (key) => {
        if (key === 'notifications') return notifCount;
        if (key === 'messages') return _totalChatsUnread;
        return 0;
    };

    const userMenuItems = [
        { 
            icon: <User className="w-4 h-4" />, 
            label: 'My Profile', 
            onClick: () => navigate(workspace ? `/workspace/${workspace.slug}/profile` : '/profile') 
        },
        { 
            icon: <Settings className="w-4 h-4" />, 
            label: 'Preferences', 
            onClick: () => navigate(workspace ? `/workspace/${workspace.slug}/settings` : '/settings') 
        },
        { separator: true },
        { 
            icon: <LogOut className="w-4 h-4" />, 
            label: 'Sign out', 
            danger: true, 
            onClick: async () => { await logout(); navigate('/login'); } 
        },
    ];

    const handleNavClick = () => {
        if (isMobileOpen && onMobileClose) {
            onMobileClose();
        }
    };

    return (
        <motion.aside
            initial={false}
            animate={{ 
                width: collapsed ? 80 : 280,
                x: isMobileOpen || !isMobileOpen && window.innerWidth >= 768 ? 0 : -280
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
                "flex flex-col h-full bg-slate-50 dark:bg-gray-950 border-r border-slate-200 dark:border-white/5 shrink-0 z-50",
                "fixed inset-y-0 left-0 md:relative",
                "shadow-[20px_0_40px_-15px_rgba(0,0,0,0.03)] dark:shadow-none"
            )}
        >

            {/* Header / Logo */}
            <div className="h-20 flex items-center px-6 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-3.5 z-10">
                    <div className="relative group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover:scale-105 active:scale-95 duration-300">
                            <CheckSquare size={22} strokeWidth={2.5} />
                        </div>
                        <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col"
                        >
                            <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight leading-none mb-1">
                                Brioright
                            </span>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-80">
                                Enterprise
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Collapse Toggle - Only visible on desktop */}
                <button
                    onClick={() => {
                        const next = !collapsed;
                        setCollapsed(next);
                        localStorage.setItem('sidebar_collapsed', String(next));
                    }}
                    className={cn(
                        "hidden md:flex ml-auto w-8 h-8 items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-indigo-600 transition-all hover:shadow-sm",
                        collapsed && "absolute left-1/2 -translate-x-1/2 ml-0"
                    )}
                >
                    {collapsed ? <PanelLeft size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto no-scrollbar gap-8">
                
                {/* Workspace Context */}
                <div className="relative">
                    <WorkspaceSwitcher collapsed={collapsed} />
                </div>

                <nav className="space-y-8">
                    {NAV_GROUPS.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-2">
                            {/* Section Header */}
                            {!collapsed && (
                                <div className="flex items-center px-4 mb-3">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                        {group.label}
                                    </span>
                                    <div className="h-px flex-1 bg-slate-200/50 dark:bg-white/5 ml-4" />
                                </div>
                            )}

                            <div className="space-y-1">
                                {group.items.map(({ to, icon: Icon, label, badgeKey, dangerBadge }) => {
                                    const count = getBadgeCount(badgeKey);
                                    const currentTo = workspace ? `/workspace/${workspace.slug}${to}` : to;
                                    const isActive = location.pathname.startsWith(currentTo);

                                    return (
                                        <NavLink
                                            key={to}
                                            to={currentTo}
                                            onClick={handleNavClick}
                                            title={collapsed ? label : undefined}
                                            className={({ isActive }) => cn(
                                                "group flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-sm font-bold transition-all duration-300 relative overflow-hidden",
                                                isActive
                                                    ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-xl shadow-slate-200/50 dark:shadow-none translate-x-1"
                                                    : "text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1",
                                                collapsed && "justify-center px-0 translate-x-0 hover:translate-x-0"
                                            )}
                                        >
                                            {/* Active Indicator Bar */}
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="active-pill"
                                                    className="absolute left-0 w-1.5 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-r-full"
                                                />
                                            )}

                                            <Icon 
                                                size={20} 
                                                className={cn(
                                                    "shrink-0 transition-all duration-300",
                                                    isActive ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 group-hover:text-indigo-500"
                                                )} 
                                            />

                                            {!collapsed && (
                                                <span className="flex-1 truncate tracking-tight">{label}</span>
                                            )}

                                            {/* Badges */}
                                            {count > 0 && (
                                                <span className={cn(
                                                    "shrink-0 flex items-center justify-center rounded-full text-[10px] font-black min-w-[20px] h-5 px-1.5",
                                                    collapsed ? "absolute top-2 right-2 w-2 h-2 p-0 min-w-0 ring-2 ring-slate-50 dark:ring-gray-950" : "",
                                                    dangerBadge
                                                        ? "bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none"
                                                        : "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                                                )}>
                                                    {!collapsed && (count > 99 ? '99+' : count)}
                                                </span>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Quick Shortcuts Card - Only when expanded */}
                {!collapsed && (
                    <div className="mt-4 p-5 rounded-[28px] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                            <Sparkles size={48} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Power User</p>
                        <p className="text-xs font-bold leading-relaxed mb-4 relative z-10">Use <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono">CMD + K</kbd> to search everything.</p>
                        <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Upgrade Plan
                        </button>
                    </div>
                )}
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 shrink-0">
                <Dropdown
                    align="left"
                    position="top"
                    items={userMenuItems}
                    trigger={
                        <div className={cn(
                            "group flex items-center gap-3 p-3 rounded-[24px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 cursor-pointer hover:shadow-xl transition-all duration-300",
                            collapsed ? "justify-center px-0" : "px-4"
                        )}>
                            <div className="relative shrink-0 transition-transform group-hover:scale-105">
                                <Avatar user={user} size={collapsed ? "sm" : "md"} className="rounded-2xl shadow-lg" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900" />
                            </div>
                            
                            {!collapsed && (
                                <>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-black text-slate-900 dark:text-white truncate tracking-tight">{user?.name || 'Explorer'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest opacity-70">
                                            {workspace?.role || 'Member'}
                                        </p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </>
                            )}
                        </div>
                    }
                />
            </div>
        </motion.aside>
    );
};

export default Sidebar;
