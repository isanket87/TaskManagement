import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
    timeout: 15000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Try to read active workspace slug from Zustand storage directly
        // because importing the hook directly in a non-component file might cause circular dependency
        // or require raw store access
        try {
            const storeStr = localStorage.getItem('workspace-storage');
            if (storeStr) {
                const store = JSON.parse(storeStr);
                const activeWs = store?.state?.workspace;

                // If we have an active workspace slug, and the route isn't inherently workspace-agnostic
                if (activeWs?.slug && config.url) {
                    const url = config.url;

                    // List of routes that SHOULD NOT be prefixed with a workspace slug
                    const bypassRoutes = [
                        '/auth',
                        '/users',
                        '/workspaces', // Important: backend handles /workspaces inherently, do not prefix it
                    ];

                    // Specific check for /workspaces vs /workspaces/check-slug etc.
                    // We only want to prepend the slug if the route is a core app route (projects, tasks, timesheets, etc.)
                    const isBypassed = bypassRoutes.some(route => url.startsWith(route));

                    if (!isBypassed) {
                        // Standardize: remove leading slash if present for cleaner concat
                        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

                        // Special case: if it already has workspaces/ in it, don't mess with it
                        if (!cleanUrl.startsWith('workspaces/')) {
                            config.url = `/workspaces/${activeWs.slug}/${cleanUrl}`;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('API Interceptor: Error injecting workspace slug', e);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — auto refresh token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent infinite refresh loops if the refresh endpoint itself fails
            if (originalRequest.url.includes('/auth/refresh')) {
                // Clear state on explicit refresh failure
                try {
                    const authStr = localStorage.getItem('auth-storage');
                    if (authStr) {
                        const parsed = JSON.parse(authStr);
                        parsed.state.user = null;
                        parsed.state.isAuthenticated = false;
                        localStorage.setItem('auth-storage', JSON.stringify(parsed));
                    }
                } catch (e) {
                    console.error('Failed to clear local storage on refresh failure', e);
                }

                // Allow React Router to handle the redirect naturally via the ProtectedRoute guards
                // rather than a hard window location reload that races with component mounting.
                // window.location.href = '/login'; 
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await api.post('/auth/refresh');
                processQueue(null);
                return api(originalRequest);
            } catch (err) {
                processQueue(err);

                // Clear Zustand persisted state manually so Next render kicks them to login properly
                try {
                    const authStr = localStorage.getItem('auth-storage');
                    if (authStr) {
                        const parsed = JSON.parse(authStr);
                        parsed.state.user = null;
                        parsed.state.isAuthenticated = false;
                        localStorage.setItem('auth-storage', JSON.stringify(parsed));
                    }
                    // Dispatch a custom event that App.jsx or authStore can optionally listen to 
                    // to force a fast React state update, though localStorage change + reload usually suffices
                    window.dispatchEvent(new Event('auth-expired'));
                } catch (e) {
                    console.error('Failed to clear local storage on auth expire', e);
                }

                // Instead of a hard window reload, let's just trigger a React Router navigation 
                // by letting the Promise reject. The ProtectedRoute will see isAuthenticated: false soon.
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
