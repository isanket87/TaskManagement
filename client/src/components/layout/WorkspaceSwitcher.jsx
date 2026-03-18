import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, Plus, Settings, Users, Layers, ShieldCheck, Check } from 'lucide-react';
import useWorkspaceStore from '../../store/workspaceStore';
import { cn } from '../../utils/helpers';

const WorkspaceSwitcher = ({ collapsed, onExpand }) => {
    const { workspace, workspaces, isAdmin } = useWorkspaceStore();
    const navigate = useNavigate();

    if (!workspace) return null;

    return (
        <Menu as="div" className="relative w-full">
            <div>
                <Menu.Button 
                    onClick={() => collapsed && onExpand()}
                    className={cn(
                        "group flex w-full items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all duration-300 hover:shadow-lg hover:border-indigo-500/30",
                        collapsed ? "justify-center" : "justify-between px-3"
                    )}
                >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-500/10 dark:to-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
                            {workspace.logo ? (
                                <img src={workspace.logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
                            ) : (
                                <Layers size={18} />
                            )}
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="truncate font-black text-slate-900 dark:text-white text-xs tracking-tight uppercase">
                                    {workspace.name}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 opacity-70">
                                    {workspace.slug}
                                </span>
                            </div>
                        )}
                    </div>
                    {!collapsed && <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />}
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 -translate-x-2"
                enterTo="transform opacity-100 scale-100 translate-x-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 -translate-x-2"
            >
                <Menu.Items className={cn(
                    "absolute z-[100] w-64 origin-top-left rounded-[24px] bg-white dark:bg-slate-900 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] dark:shadow-none ring-1 ring-black/5 focus:outline-none border border-slate-100 dark:border-white/5 overflow-hidden p-1.5",
                    collapsed ? "left-[calc(100%+12px)] top-0" : "left-0 top-[calc(100%+8px)]"
                )}>
                    <div className="px-3 py-2.5 mb-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            Environments
                        </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto no-scrollbar space-y-0.5">
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
                                                "group flex w-full items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 text-left",
                                                active || isCurrent ? 'bg-slate-50 dark:bg-white/5' : 'text-slate-600 dark:text-slate-400',
                                                isCurrent ? 'ring-1 ring-slate-100 dark:ring-white/5' : ''
                                            )}
                                        >
                                            <div className={cn(
                                                "flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-colors shadow-sm",
                                                isCurrent ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-400"
                                            )}>
                                                {ws.logo ? (
                                                    <img src={ws.logo} alt="" className="h-8 h-8 rounded-lg object-cover" />
                                                ) : (
                                                    <Layers size={16} />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className={cn(
                                                    "truncate text-xs font-bold",
                                                    isCurrent ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200"
                                                )}>
                                                    {ws.name}
                                                </span>
                                            </div>
                                            {isCurrent && <Check size={12} strokeWidth={4} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                        </button>
                                    )}
                                </Menu.Item>
                            );
                        })}
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-50 dark:border-white/5 flex flex-col gap-0.5">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => navigate('/onboarding')}
                                    className={cn(
                                        "flex w-full items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                        active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                    )}
                                >
                                    <Plus size={14} strokeWidth={3} />
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
                                                "flex w-full items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                                active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                            )}
                                        >
                                            <Users size={14} strokeWidth={3} />
                                            Team
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate(`/workspace/${workspace.slug}/settings`)}
                                            className={cn(
                                                "flex w-full items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                                active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                            )}
                                        >
                                            <Settings size={14} strokeWidth={3} />
                                            Settings
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
