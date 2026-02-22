import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTimerStore = create(
    persist(
        (set, get) => ({
            activeEntry: null,       // { id, startTime, description, projectId, projectName, billable }
            elapsedSeconds: 0,
            _intervalId: null,

            setActiveEntry: (entry) => {
                const { _intervalId } = get();
                if (_intervalId) clearInterval(_intervalId);

                if (!entry) {
                    set({ activeEntry: null, elapsedSeconds: 0, _intervalId: null });
                    return;
                }

                const elapsed = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
                const id = setInterval(() => {
                    set(s => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
                }, 1000);

                set({ activeEntry: entry, elapsedSeconds: elapsed, _intervalId: id });
            },

            clearTimer: () => {
                const { _intervalId } = get();
                if (_intervalId) clearInterval(_intervalId);
                set({ activeEntry: null, elapsedSeconds: 0, _intervalId: null });
            },
        }),
        {
            name: 'taskflow-timer',
            partialize: (state) => ({ activeEntry: state.activeEntry }),
            onRehydrateStorage: () => (state) => {
                if (state?.activeEntry) {
                    // Resume the interval after reload
                    setTimeout(() => state.setActiveEntry(state.activeEntry), 0);
                }
            },
        }
    )
);

export default useTimerStore;
