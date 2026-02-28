import { useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useWorkspaceStore from '../../store/workspaceStore';

const PageSkeleton = () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading workspace...</p>
        </div>
    </div>
);

const WorkspaceGuard = () => {
    const { user } = useAuthStore();
    const { workspace, loading, switchWorkspace, fetchWorkspaces } = useWorkspaceStore();
    const navigate = useNavigate();
    const { slug } = useParams();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // First time user — no workspace yet
        if (!user.activeWorkspaceId) {
            navigate('/onboarding');
            return;
        }

        // slug in URL doesn't match the loaded workspace — need to switch
        if (slug && (!workspace || workspace.slug !== slug)) {
            switchWorkspace(slug).catch(async (err) => {
                console.error('Workspace access denied or not found', err);

                // Fallback: redirect to a workspace the user can access
                const workspaces = await fetchWorkspaces();
                if (workspaces.length === 1) {
                    navigate(`/workspace/${workspaces[0].slug}/dashboard`);
                } else if (workspaces.length > 1) {
                    navigate('/workspaces');
                } else {
                    navigate('/onboarding');
                }
            });
        }
        // Only re-run when the URL slug changes or user changes — NOT on workspace store updates
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, slug]);

    if (loading) return <PageSkeleton />;

    return <Outlet />;
};

export default WorkspaceGuard;
