import { Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Briefcase, ChevronDown, Plus, Settings, Users, Layers, ShieldCheck, Check } from 'lucide-react';
import useWorkspaceStore from '../../store/workspaceStore';
import { cn } from '../../utils/helpers';

const WorkspaceSwitcher = ({ collapsed }) => {
    const { workspace, workspaces, isAdmin } = useWorkspaceStore();
    const navigate = useNavigate();
    const location = useLocation();

    if (!workspace) return null;

    return (
        <Menu as="div" className="relative inline-block w-full text-left">
            <div>
                <Menu.Button className={cn(
                    "group flex w-full items-center gap-3 p-3 rounded-[24px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all duration-300 hover:shadow-xl hover:border-indigo-500/30",
                    collapsed ? "justify-center" : "justify-between px-4"
                )}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner group-hover:scale-105 transition-transform duration-300">
                            {workspace.logo ? (
                                <img src={workspace.logo} alt="" className="h-10 w-10 rounded-2xl object-cover" />
                            ) : (
                                <Layers size={20} />
                            )}
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="truncate font-black text-slate-900 dark:text-white text-[13px] tracking-tight">
                                    {workspace.name}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <ShieldCheck size={10} className="text-emerald-500" />
                                    {workspace.slug}
                                </span>
                            </div>
                        )}
                    </div>
                    {!collapsed && <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />}
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 -translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 -translate-y-2"
            >
                <Menu.Items className="absolute left-0 top-[calc(100%+8px)] z-[100] w-72 origin-top-left rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200 dark:shadow-none ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-100 dark:border-white/5 overflow-hidden p-2">
                    <div className="px-4 py-3 mb-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            Switch Environment
                        </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                        {workspaces.map((ws) => {
                            const isCurrent = workspace.id === ws.id;
                            return (
                                <Menu.Item key={ws.id}>
                                    {({ active }) => (
                                        <button
                                            onClick={() => {
                                                if (!isCurrent) {
                                                    navigate(`/workspace/${ws.slug}/dashboard`);
                                                }
                                            }}
                                            className={cn(
                                                "group flex w-full items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 text-left",
                                                active || isCurrent ? 'bg-slate-50 dark:bg-white/5' : 'text-slate-600 dark:text-slate-400',
                                                isCurrent ? 'ring-1 ring-slate-100 dark:ring-white/5' : ''
                                            )}
                                        >
                                            <div className={cn(
                                                "flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl transition-colors shadow-sm",
                                                isCurrent ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-400"
                                            )}>
                                                {ws.logo ? (
                                                    <img src={ws.logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
                                                ) : (
                                                    <Layers size={18} />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className={cn(
                                                    "truncate text-sm font-bold",
                                                    isCurrent ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200"
                                                )}>
                                                    {ws.name}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400 truncate tracking-tight uppercase tracking-widest opacity-70">
                                                    {ws.slug}
                                                </span>
                                            </div>
                                            {isCurrent && (
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    )}
                                </Menu.Item>
                            );
                        })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-50 dark:border-white/5 flex flex-col gap-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => navigate('/onboarding')}
                                    className={cn(
                                        "flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                        active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                                        <Plus size={16} />
                                    </div>
                                    New Workspace
                                </button>
                            )}
                        </Menu.Item>

                        {isAdmin() && (
                            <>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate(`/workspace/${workspace.slug}/members`)}
                                            className={cn(
                                                "flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                                                <Users size={16} />
                                            </div>
                                            Team Management
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate(`/workspace/${workspace.slug}/settings`)}
                                            className={cn(
                                                "flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                                                <Settings size={16} />
                                            </div>
                                            Admin Settings
                                        </button>
                                    )}
                                </Menu.Item>
                            </>
                        )}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default WorkspaceSwitcher;
