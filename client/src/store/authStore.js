import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: false, // Ensures router waits for initial fetch

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            login: async (credentials) => {
                set({ isLoading: true });
                try {
                    const res = await authService.login(credentials);
                    const user = res.data.data.user;
                    set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
                    return { success: true };
                } catch (err) {
                    set({ isLoading: false });
                    return { success: false, error: err.response?.data?.message || 'Login failed' };
                }
            },

            register: async (data) => {
                set({ isLoading: true });
                try {
                    const res = await authService.register(data);
                    const user = res.data.data.user;
                    set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
                    return { success: true };
                } catch (err) {
                    set({ isLoading: false });
                    return { success: false, error: err.response?.data?.message || 'Registration failed' };
                }
            },

            logout: async () => {
                try {
                    await authService.logout();
                } catch { }
                set({ user: null, isAuthenticated: false });
            },

            fetchMe: async () => {
                try {
                    const res = await authService.getMe();
                    const user = res.data.data.user;
                    set({ user, isAuthenticated: true, isInitialized: true });
                } catch {
                    set({ user: null, isAuthenticated: false, isInitialized: true });
                }
            },

            // Helper to clear state from outside components
            clearAuth: () => set({ user: null, isAuthenticated: false })
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);

// Listen for global auth expiration events from api interceptor
if (typeof window !== 'undefined') {
    window.addEventListener('auth-expired', () => {
        useAuthStore.getState().clearAuth();
    });
}

export default useAuthStore;
