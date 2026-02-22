import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useWorkspaceStore from '../../store/workspaceStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';

const WorkspaceSettings = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { workspace, isAdmin, isOwner, fetchWorkspaces, switchWorkspace } = useWorkspaceStore();
    const { fetchMe } = useAuthStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Danger zone state
    const [deleteConfirm, setDeleteConfirm] = useState('');

    useEffect(() => {
        if (workspace) {
            setName(workspace.name || '');
            setDescription(workspace.description || '');
        }
    }, [workspace]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/workspaces/${slug}`, { name, description });
            toast.success('Workspace settings updated');
            // Refresh workspace context
            await switchWorkspace(slug);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirm !== workspace.name) {
            toast.error('Please type the workspace name to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            await api.delete(`/workspaces/${slug}`);
            toast.success('Workspace deleted successfully');

            // Re-fetch user to clear activeWorkspaceId if it was this one
            await fetchMe();

            // Re-fetch workspaces to get updated list
            const remaining = await fetchWorkspaces();

            if (remaining.length > 0) {
                navigate(`/workspace/${remaining[0].slug}/dashboard`);
            } else {
                navigate('/onboarding');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete workspace');
            setIsDeleting(false);
        }
    };

    if (!isAdmin()) {
        return (
            <div className="flex justify-center p-8">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 w-full max-w-3xl">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <p className="ml-3 text-sm text-yellow-700 dark:text-yellow-500">
                            Only workspace administrators can access settings.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    Workspace Settings
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Manage your workspace details and preferences
                </p>
            </div>

            {/* General Settings */}
            <div className="bg-white dark:bg-slate-800 shadow sm:rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white mb-4">
                        General Profile
                    </h3>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                            <div className="sm:col-span-4">
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Workspace Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white px-4 py-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-4">
                                <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Workspace URL (Slug)
                                </label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-500 sm:text-sm">
                                        taskflow.app/
                                    </span>
                                    <input
                                        type="text"
                                        name="slug"
                                        id="slug"
                                        disabled
                                        value={workspace?.slug || ''}
                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-500 sm:text-sm cursor-not-allowed"
                                        title="Workspace URLs cannot be changed after creation."
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">Contact support if you need to change your workspace URL.</p>
                            </div>

                            <div className="sm:col-span-6">
                                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Description
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white px-4 py-2"
                                    />
                                </div>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Brief description of what this workspace is for.
                                </p>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving || !name}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> : <Save className="-ml-1 mr-2 h-5 w-5" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Danger Zone */}
            {isOwner() && (
                <div className="bg-red-50 dark:bg-red-900/10 shadow sm:rounded-lg border border-red-200 dark:border-red-900/50 mt-10">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-red-800 dark:text-red-400 flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" /> Danger Zone
                        </h3>
                        <div className="mt-2 max-w-xl text-sm text-red-700 dark:text-red-300 mb-5">
                            <p>
                                Deleting this workspace will permanently remove all associated projects, tasks, time entries, files, and member access. <strong>This action cannot be undone.</strong>
                            </p>
                        </div>

                        <div className="border border-red-200 dark:border-red-800/50 bg-white dark:bg-slate-800/50 rounded-md p-4 max-w-xl">
                            <label htmlFor="confirm-delete" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Please type <strong className="select-none">{workspace?.name}</strong> to confirm
                            </label>
                            <input
                                type="text"
                                id="confirm-delete"
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white px-4 py-2 border mb-4"
                                placeholder={workspace?.name}
                            />

                            <button
                                type="button"
                                disabled={isDeleting || deleteConfirm !== workspace?.name}
                                onClick={handleDelete}
                                className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> : null}
                                I understand the consequences, delete this workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceSettings;
