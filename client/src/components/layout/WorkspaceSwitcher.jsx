import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Briefcase, ChevronDown, Plus, Settings, Users } from 'lucide-react';
import useWorkspaceStore from '../../store/workspaceStore';
import { cn } from '../../utils/helpers';

const WorkspaceSwitcher = ({ collapsed }) => {
    const { workspace, workspaces, isAdmin } = useWorkspaceStore();
    const navigate = useNavigate();

    if (!workspace) return null;

    return (
        <Menu as="div" className="relative inline-block w-full text-left">
            <div>
                <Menu.Button className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    collapsed ? "justify-center" : "justify-between"
                )}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400">
                            {workspace.logo ? (
                                <img src={workspace.logo} alt="" className="h-6 w-6 rounded object-cover" />
                            ) : (
                                <Briefcase className="h-4 w-4" />
                            )}
                        </div>
                        {!collapsed && (
                            <span className="truncate max-w-[120px] font-semibold">
                                {workspace.name}
                            </span>
                        )}
                    </div>
                    {!collapsed && <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute left-0 top-full z-50 mt-1 w-56 origin-top-left rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-200 dark:border-slate-700">
                    <div className="py-1">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Switch Workspace
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {workspaces.map((ws) => (
                                <Menu.Item key={ws.id}>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate(`/workspaces`)}
                                            // Navigation to /workspaces handles the actual switch logic safely
                                            className={cn(
                                                active ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300',
                                                'group flex w-full items-center px-4 py-2 text-sm'
                                            )}
                                        >
                                            <div className="flex-shrink-0 flex h-5 w-5 mr-3 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                                {ws.logo ? (
                                                    <img src={ws.logo} alt="" className="h-5 w-5 rounded object-cover" />
                                                ) : (
                                                    <Briefcase className="h-3 w-3" />
                                                )}
                                            </div>
                                            <span className="truncate">{ws.name}</span>
                                            {workspace.id === ws.id && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            )}
                                        </button>
                                    )}
                                </Menu.Item>
                            ))}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={() => navigate('/onboarding')}
                                        className={cn(
                                            active ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300',
                                            'group flex w-full items-center px-4 py-2 text-sm'
                                        )}
                                    >
                                        <Plus className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                                        Create Workspace
                                    </button>
                                )}
                            </Menu.Item>
                        </div>

                        {isAdmin() && (
                            <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate(`/workspace/${workspace.slug}/members`)}
                                            className={cn(
                                                active ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300',
                                                'group flex w-full items-center px-4 py-2 text-sm'
                                            )}
                                        >
                                            <Users className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                                            Manage Members
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate(`/workspace/${workspace.slug}/settings`)}
                                            className={cn(
                                                active ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300',
                                                'group flex w-full items-center px-4 py-2 text-sm'
                                            )}
                                        >
                                            <Settings className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                                            Workspace Settings
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        )}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default WorkspaceSwitcher;
