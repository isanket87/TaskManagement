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

const processQueue = (error) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve();
    });
    failedQueue = [];
};

// These routes should never trigger a token refresh attempt
const AUTH_BYPASS_URLS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
];

const clearAuthAndRedirect = () => {
    // Clear persisted Zustand auth state
    try {
        const authStr = localStorage.getItem('auth-storage');
        if (authStr) {
            const parsed = JSON.parse(authStr);
            if (parsed?.state) {
                parsed.state.user = null;
                parsed.state.isAuthenticated = false;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
            }
        }
    } catch (e) {
        console.error('[Auth] Failed to clear auth storage:', e);
    }

    // Notify any in-memory Zustand listeners
    window.dispatchEvent(new Event('auth-expired'));

    // Don't redirect if already on a public page
    const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy'];
    const isPublicPath = PUBLIC_PATHS.some(p => window.location.pathname === p) ||
        window.location.pathname.startsWith('/invite/');
    if (isPublicPath) return;

    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';

        // Don't attempt refresh for auth endpoints or already-retried requests
        const isAuthEndpoint = AUTH_BYPASS_URLS.some(url => requestUrl.includes(url));
        if (error.response?.status !== 401 || isAuthEndpoint || originalRequest._retry) {
            return Promise.reject(error);
        }

        // If another request is already refreshing, queue this one
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
        } catch (refreshError) {
            processQueue(refreshError);
            clearAuthAndRedirect();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
