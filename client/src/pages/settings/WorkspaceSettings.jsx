import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useWorkspaceStore from '../../store/workspaceStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
            <div className="flex justify-center flex-1 p-8 items-center h-full">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-400 p-6 rounded-[24px] backdrop-blur-xl w-full max-w-3xl shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-800/50 rounded-xl">
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-400">Access Denied</h3>
                            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-500 text-balance">
                                Only workspace administrators can access these settings. Please contact your administrator if you need configuration changes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="relative min-h-[calc(100vh-4rem)] p-4 sm:p-8">
            {/* Ambient Blurred Orbs fixed to screen */}
            <div className="fixed top-[15%] right-[5%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[140px] pointer-events-none -z-0" />
            <div className="fixed bottom-[10%] left-[10%] w-[600px] h-[600px] bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-[160px] pointer-events-none -z-0" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="relative z-10 max-w-3xl mx-auto space-y-8 pt-6 pb-24"
            >
                <motion.div variants={itemVariants}>
                <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    Workspace Settings
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Manage your workspace details and preferences
                </p>
                </motion.div>

            {/* General Settings */}
            <motion.div variants={itemVariants} className="p-8 rounded-[24px] backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-white/60 dark:border-white/5">
                <div className="px-4 py-5 sm:p-0">
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
                                        brioright.app/
                                    </span>
                                    <input
                                        type="text"
                                        name="slug"
                                        id="slug"
                                        disabled
                                        value={workspace?.slug || ''}
                                        className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-md border border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/80 text-slate-500 sm:text-sm cursor-not-allowed"
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
            </motion.div>

            {/* Danger Zone */}
            {isOwner() && (
                <motion.div variants={itemVariants} className="relative p-8 rounded-[24px] backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-red-200 dark:border-red-900/50 overflow-hidden mt-10">
                    {/* Immersive Danger Glow */}
                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
                    <div className="relative z-10 px-4 py-5 sm:p-0">
                        <h3 className="text-xl font-bold leading-6 text-red-800 dark:text-red-400 flex items-center mb-4">
                            <AlertTriangle className="mr-3 h-6 w-6" /> Danger Zone
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
                </motion.div>
            )}
            </motion.div>
        </div>
    );
};

export default WorkspaceSettings;
