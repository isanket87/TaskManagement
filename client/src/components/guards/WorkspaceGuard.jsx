import { useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useWorkspaceStore from '../../store/workspaceStore';
import api from '../../services/api';

const PageSkeleton = () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading workspace...</p>
        </div>
    </div>
);

const WorkspaceGuard = ({ children }) => {
    const { user } = useAuthStore();
    const { workspace, loading, switchWorkspace, fetchWorkspaces } = useWorkspaceStore();
    const navigate = useNavigate();
    const { slug } = useParams();

    useEffect(() => {
        let isMounted = true;

        const initializeWorkspace = async () => {
            if (!user) {
                if (isMounted) navigate('/login');
                return;
            }

            // First time user — no workspace yet at all
            if (!user.activeWorkspaceId) {
                if (isMounted) navigate('/onboarding');
                return;
            }

            // If we have a URL slug but it doesn't match the current active workspace 
            // (or if workspace isn't loaded in Zustand yet)
            if (slug && (!workspace || workspace.slug !== slug)) {
                try {
                    await switchWorkspace(slug);
                    return; // Successfully switched, state will update and re-render
                } catch (err) {
                    console.error('Workspace access denied or not found', err);

                    // Fallback to active workspace or picker
                    const workspaces = await fetchWorkspaces();
                    if (!isMounted) return;

                    if (workspaces.length === 1) {
                        navigate(`/workspace/${workspaces[0].slug}/dashboard`);
                    } else if (workspaces.length > 1) {
                        navigate('/workspaces');
                    } else {
                        navigate('/onboarding');
                    }
                    return;
                }
            } else if (workspace && workspace.slug === slug) {
                // If the slug matches the cached workspace, ensure loading is false
                useWorkspaceStore.setState({ loading: false });
            } else if (!slug) {
                // No slug (e.g. root path), ensure loading is false so children can render
                useWorkspaceStore.setState({ loading: false });
            }
        };

        if (user) {
            initializeWorkspace();
        }

        return () => { isMounted = false; };
    }, [user, workspace?.slug, slug, navigate, switchWorkspace, fetchWorkspaces]);

    // Only show skeleton if explicitly loading. If we don't have a workspace but are not loading, 
    // we still return children/outlet because it might be a redirect or a picker.
    if (loading) return <PageSkeleton />;

    return children || <Outlet />;
};

export default WorkspaceGuard;
