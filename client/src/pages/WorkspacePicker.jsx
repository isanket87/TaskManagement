import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../store/authStore';
import { Briefcase, Plus, ArrowRight } from 'lucide-react';

const WorkspacePicker = () => {
    const { workspaces, fetchWorkspaces, switchWorkspace, loading } = useWorkspaceStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const handleSelectWorkspace = async (slug) => {
        try {
            await switchWorkspace(slug);
            navigate(`/workspace/${slug}/dashboard`);
        } catch (error) {
            console.error('Failed to switch workspace', error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    // Edge case handling, shouldn't hit this normally via guard
    if (!loading && workspaces.length === 0) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 text-center">
                <Briefcase className="h-16 w-16 text-slate-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No Workspaces Found</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md">
                    You aren't a member of any workspaces yet. To get started, you can create a new workspace.
                </p>
                <button
                    onClick={() => navigate('/onboarding')}
                    className="mt-6 flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                >
                    Create Workspace
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">

            <div className="w-full max-w-3xl space-y-8">

                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                        Select a Workspace
                    </h2>
                    <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
                        Choose an active workspace to continue to TaskFlow.
                    </p>
                </div>

                <div className="mt-8 overflow-hidden bg-white dark:bg-slate-800 shadow sm:rounded-md border border-slate-200 dark:border-slate-700">
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                        {workspaces.map((ws) => (
                            <li key={ws.id}>
                                <button
                                    onClick={() => handleSelectWorkspace(ws.slug)}
                                    className="w-full text-left block hover:bg-slate-50 dark:hover:bg-slate-700/50 transition duration-150 ease-in-out focus:outline-none"
                                >
                                    <div className="flex items-center px-4 py-4 sm:px-6">
                                        <div className="flex min-w-0 flex-1 items-center">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                    {ws.logo ? (
                                                        <img src={ws.logo} alt={ws.name} className="h-12 w-12 rounded-lg object-cover" />
                                                    ) : (
                                                        <Briefcase className="h-6 w-6" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                                <div>
                                                    <p className="truncate text-lg font-medium text-slate-900 dark:text-white">{ws.name}</p>
                                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                        <span>taskflow.app/{ws.slug}</span>
                                                    </div>
                                                </div>
                                                <div className="hidden md:flex flex-col items-end justify-center">
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {ws._count?.members || 0} Members
                                                    </p>
                                                    {user?.activeWorkspaceId === ws.id && (
                                                        <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            Currently Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 flex justify-center">
                    <Link
                        to="/onboarding"
                        className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                    >
                        <Plus className="h-5 w-5 mr-1" />
                        Create a new workspace
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default WorkspacePicker;
