import { create } from 'zustand';

const useFocusStore = create((set) => ({
    isFocusModeOpen: false,
    focusTask: null,

    enterFocusMode: (task) => set({
        isFocusModeOpen: true,
        focusTask: task
    }),

    exitFocusMode: () => set({
        isFocusModeOpen: false,
        focusTask: null
    }),
}));

export default useFocusStore;
