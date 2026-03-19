import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, FolderKanban, Calendar, BarChart3,
    Bell, Settings, ChevronLeft, ChevronRight, CheckSquare, Plus,
    MessageSquare, Clock, User, LogOut, ChevronDown, Sparkles,
    Search, Command, PanelLeft, LayoutGrid
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
        { icon: <User className="w-4 h-4" />, label: 'My Profile', onClick: () => navigate(workspace ? `/workspace/${workspace.slug}/profile` : '/profile') },
        { icon: <Settings className="w-4 h-4" />, label: 'Preferences', onClick: () => navigate(workspace ? `/workspace/${workspace.slug}/settings` : '/settings') },
        { separator: true },
        { icon: <LogOut className="w-4 h-4" />, label: 'Sign out', danger: true, onClick: async () => { await logout(); navigate('/login'); } },
    ];

    const toggleCollapse = (e) => {
        e?.stopPropagation();
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('sidebar_collapsed', String(next));
    };

    const handleNavClick = () => {
        if (isMobileOpen && onMobileClose) onMobileClose();
    };

    return (
        <motion.aside
            initial={false}
            animate={{ 
                width: collapsed ? 80 : 280,
                x: isMobileOpen || (!isMobileOpen && window.innerWidth >= 768) ? 0 : -280
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
                "flex flex-col h-full bg-slate-50 dark:bg-gray-950 border-r border-slate-200 dark:border-white/5 shrink-0 z-50",
                "fixed inset-y-0 left-0 md:relative",
                "shadow-[20px_0_40px_-15px_rgba(0,0,0,0.03)] dark:shadow-none"
            )}
        >
            {/* 1. TOP LOGO AREA */}
            <div className="h-20 flex items-center px-6 shrink-0">
                <div className="flex items-center gap-3.5 cursor-pointer group/logo" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover/logo:scale-105 duration-300">
                        <CheckSquare size={22} strokeWidth={2.5} />
                    </div>
                    {!collapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-black text-slate-900 dark:text-white text-lg tracking-tight">
                            Brioright
                        </motion.span>
                    )}
                </div>
            </div>

            {/* 2. MAIN NAV CONTAINER */}
            <div className="flex-1 flex flex-col px-4 py-2 overflow-y-auto overflow-x-hidden no-scrollbar gap-6">
                
                {/* Workspace Context */}
                <div className="relative">
                    <WorkspaceSwitcher collapsed={collapsed} onExpand={() => setCollapsed(false)} />
                </div>

                {/* SEARCH TRIGGER */}
                {!collapsed && (
                    <div className="px-2">
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:border-indigo-500/50 hover:shadow-md transition-all group/search">
                            <Search size={14} className="group-hover/search:text-indigo-500 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 flex-1 text-left">Search...</span>
                            <div className="flex items-center gap-0.5 opacity-40">
                                <Command size={10} />
                                <span className="text-[9px] font-black">K</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* NAVIGATION GROUPS */}
                <nav className="space-y-8 pb-4">
                    {NAV_GROUPS.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-1">
                            {!collapsed && (
                                <div className="px-4 mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.label}</span>
                                </div>
                            )}

                            <div className="space-y-0.5">
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
                                                "group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all duration-300 relative",
                                                isActive
                                                    ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-xl shadow-slate-200/50 dark:shadow-none"
                                                    : "text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200",
                                                collapsed && "justify-center px-0"
                                            )}
                                        >
                                            <div className="relative shrink-0 transition-all">
                                                <Icon size={18} className={cn(
                                                    "transition-all duration-300",
                                                    isActive ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 group-hover:text-indigo-500"
                                                )} />
                                                
                                                {/* COLLAPSED BADGE DOT */}
                                                {collapsed && count > 0 && (
                                                    <span className={cn(
                                                        "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-slate-50 dark:ring-gray-950 shadow-sm animate-in zoom-in duration-300",
                                                        dangerBadge ? "bg-red-500" : "bg-indigo-600"
                                                    )} />
                                                )}
                                            </div>

                                            {!collapsed && <span className="flex-1 truncate tracking-tight">{label}</span>}
                                            
                                            {/* EXPANDED BADGE PILL */}
                                            {!collapsed && count > 0 && (
                                                <span className={cn(
                                                    "shrink-0 flex items-center justify-center rounded-full text-[9px] font-black min-w-[18px] h-4.5 px-1",
                                                    dangerBadge ? "bg-red-500 text-white" : "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                                )}>
                                                    {count > 99 ? '99+' : count}
                                                </span>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* 3. FOOTER AREA */}
            <div className="p-4 shrink-0 flex flex-col gap-2 bg-slate-50 dark:bg-gray-950 z-10">
                
                {/* COLLAPSE TOGGLE */}
                <button
                    onClick={toggleCollapse}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-white/5 transition-all group"
                >
                    <div className={cn("transition-transform duration-500", collapsed ? "rotate-180" : "rotate-0")}>
                        <ChevronLeft size={18} />
                    </div>
                    {!collapsed && <span className="text-[11px] font-black uppercase tracking-widest flex-1 text-left">Collapse</span>}
                </button>

                <Dropdown
                    align="left"
                    position="top"
                    items={userMenuItems}
                    trigger={
                        <div className={cn(
                            "group flex items-center gap-3 p-2 rounded-[24px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 cursor-pointer hover:shadow-xl transition-all duration-300",
                            collapsed ? "justify-center px-0" : "px-3"
                        )}>
                            <div className="relative shrink-0">
                                <Avatar user={user} size={collapsed ? "sm" : "md"} className="rounded-2xl shadow-lg border-2 border-white dark:border-slate-800" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                            </div>
                            
                            {!collapsed && (
                                <>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="text-[13px] font-black text-slate-900 dark:text-white truncate tracking-tight">{user?.name || 'Explorer'}</p>
                                        <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest opacity-70">
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
