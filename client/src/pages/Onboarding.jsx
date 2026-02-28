import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import debounce from 'lodash.debounce';

const Onboarding = () => {
    const navigate = useNavigate();
    const { fetchMe } = useAuthStore();
    const { setWorkspace } = useWorkspaceStore();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');

    const [isSlugAvailable, setIsSlugAvailable] = useState(null);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-generate slug from name
    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    };

    const handleNameChange = (e) => {
        const newName = e.target.value;
        setName(newName);

        // Only auto-update slug if user hasn't heavily customized it
        if (!slug || slug === generateSlug(name)) {
            const newSlug = generateSlug(newName);
            setSlug(newSlug);
            if (newSlug) checkSlugAvailability(newSlug);
        }
    };

    const handleSlugChange = (e) => {
        const newSlug = generateSlug(e.target.value);
        setSlug(newSlug);
        if (newSlug) checkSlugAvailability(newSlug);
    };

    // Debounced API call to check slug
    const checkSlugAvailability = useCallback(
        debounce(async (slugToCheck) => {
            if (!slugToCheck || slugToCheck.length < 3) {
                setIsSlugAvailable(null);
                return;
            }

            setIsCheckingSlug(true);
            try {
                const res = await api.get(`/workspaces/check-slug?slug=${slugToCheck}`);
                setIsSlugAvailable(res.data.data.available);
            } catch (err) {
                console.error(err);
                setIsSlugAvailable(null);
            } finally {
                setIsCheckingSlug(false);
            }
        }, 500),
        []
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !slug || isSlugAvailable === false) return;

        setIsSubmitting(true);
        try {
            const res = await api.post('/workspaces', { name, slug, description });

            // Set active workspace locally
            setWorkspace(res.data.data, 'owner');

            // Re-fetch user to get the new activeWorkspaceId
            await fetchMe();

            toast.success('Workspace created successfully!');
            navigate(`/workspace/${res.data.data.slug}/dashboard`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create workspace');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center text-indigo-600 dark:text-indigo-400">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
                    Welcome to Brioright! 👋
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                    Let's set up your first workspace
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Workspace Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={handleNameChange}
                                    placeholder="Acme Corp"
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Workspace URL
                            </label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-500 sm:text-sm">
                                    brioright.app/
                                </span>
                                <input
                                    type="text"
                                    name="slug"
                                    id="slug"
                                    required
                                    value={slug}
                                    onChange={handleSlugChange}
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 dark:border-slate-600 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                                />
                            </div>

                            {/* Slug validation indicator */}
                            <div className="mt-2 flex items-center text-sm">
                                {isCheckingSlug ? (
                                    <span className="text-slate-500 flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability...</span>
                                ) : slug.length < 3 && slug.length > 0 ? (
                                    <span className="text-red-500 flex items-center gap-1"><XCircle className="h-4 w-4" /> Must be at least 3 characters</span>
                                ) : isSlugAvailable === true ? (
                                    <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> URL is available!</span>
                                ) : isSlugAvailable === false ? (
                                    <span className="text-red-500 flex items-center gap-1"><XCircle className="h-4 w-4" /> URL is already taken</span>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Description <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="description"
                                    name="description"
                                    rows="3"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What does your team work on?"
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !name || !slug || isSlugAvailable === false || isCheckingSlug}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Workspace →'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
