import { create } from 'zustand';

const useProjectStore = create((set, get) => ({
    projects: [],
    currentProject: null,
    isLoading: false,

    setProjects: (projects) => set({ projects }),
    setCurrentProject: (project) => set({ currentProject: project }),

    addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

    updateProject: (updated) =>
        set((state) => ({
            projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
            currentProject: state.currentProject?.id === updated.id ? updated : state.currentProject,
        })),

    removeProject: (id) =>
        set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            currentProject: state.currentProject?.id === id ? null : state.currentProject,
        })),
}));

export default useProjectStore;
