import { create } from 'zustand';

const useTaskStore = create((set, get) => ({
    tasks: {},  // keyed by projectId
    selectedTaskIds: [],
    filters: {},

    setTasks: (projectId, tasks) =>
        set((state) => ({ tasks: { ...state.tasks, [projectId]: tasks } })),

    addTask: (projectId, task) =>
        set((state) => ({
            tasks: {
                ...state.tasks,
                [projectId]: [task, ...(state.tasks[projectId] || [])],
            },
        })),

    updateTask: (projectId, updated) =>
        set((state) => ({
            tasks: {
                ...state.tasks,
                [projectId]: (state.tasks[projectId] || []).map((t) =>
                    t.id === updated.id ? { ...t, ...updated } : t
                ),
            },
        })),

    removeTask: (projectId, taskId) =>
        set((state) => ({
            tasks: {
                ...state.tasks,
                [projectId]: (state.tasks[projectId] || []).filter((t) => t.id !== taskId),
            },
        })),

    toggleSelectTask: (taskId) =>
        set((state) => ({
            selectedTaskIds: state.selectedTaskIds.includes(taskId)
                ? state.selectedTaskIds.filter((id) => id !== taskId)
                : [...state.selectedTaskIds, taskId],
        })),

    clearSelection: () => set({ selectedTaskIds: [] }),

    setFilters: (projectId, filters) =>
        set((state) => ({ filters: { ...state.filters, [projectId]: filters } })),
}));

export default useTaskStore;
