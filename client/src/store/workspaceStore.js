import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useWorkspaceStore = create(
    persist(
        (set, get) => ({
            workspace: null,
            workspaces: [],
            role: null,
            loading: false,

            setWorkspace: (workspace, role) =>
                set({ workspace, role, loading: false }),

            setWorkspaces: (workspaces) =>
                set({ workspaces }),

            fetchWorkspaces: async () => {
                set({ loading: true });
                try {
                    const res = await api.get('/workspaces');
                    set({ workspaces: res.data.data });
                    return res.data.data;
                } catch (error) {
                    console.error('Failed to fetch workspaces', error);
                    set({ workspaces: [] });
                    return [];
                } finally {
                    set({ loading: false });
                }
            },

            switchWorkspace: async (slug) => {
                set({ loading: true });
                try {
                    const res = await api.patch(`/workspaces/${slug}/active`);
                    // Backend returns updated user's active workspace and the membership role
                    set({
                        workspace: res.data.data.workspace,
                        role: res.data.data.role,
                        loading: false
                    });
                    return res.data.data.workspace;
                } catch (error) {
                    console.error('Failed to switch workspace', error);
                    set({ loading: false });
                    throw error;
                }
            },

            clearWorkspace: () =>
                set({ workspace: null, role: null, workspaces: [] }),

            // Permission helpers
            isOwner: () => get().role === 'owner',
            isAdmin: () => ['owner', 'admin'].includes(get().role),
            isMember: () => !!get().role,
            canManageMembers: () => ['owner', 'admin'].includes(get().role),
            canDeleteWorkspace: () => get().role === 'owner',
        }),
        {
            name: 'workspace-storage',
            partialize: (state) => ({
                workspace: state.workspace,
                role: state.role
            })
        }
    )
);

export default useWorkspaceStore;
