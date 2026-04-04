import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';

import useAuthStore from './store/authStore';
import useWorkspaceStore from './store/workspaceStore';
import WorkspaceGuard from './components/guards/WorkspaceGuard';
import React from 'react';
import GlobalTimerBar from './components/time/GlobalTimerBar';
import AnalyticsTracker from './components/shared/AnalyticsTracker';
import EmailVerificationBanner from './components/shared/EmailVerificationBanner';
import NotificationInitializer from './components/shared/NotificationInitializer';
import FocusModeOverlay from './components/focus/FocusModeOverlay';
import PulseStream from './components/workspace/PulseStream';
import AmbientBackground from './components/ui/AmbientBackground';

// ── Lazy-loaded pages (each becomes its own async chunk) ─────────────────────
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const TimesheetsPage = lazy(() => import('./pages/TimesheetsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ProjectFilesPage = lazy(() => import('./pages/ProjectFilesPage'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const WorkspacePicker = lazy(() => import('./pages/WorkspacePicker'));
const InviteAccept = lazy(() => import('./pages/InviteAccept'));
const MembersPage = lazy(() => import('./pages/settings/MembersPage'));
const WorkspaceSettings = lazy(() => import('./pages/settings/WorkspaceSettings'));
const Landing = lazy(() => import('./pages/Landing'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const HealthDashboard = lazy(() => import('./pages/HealthDashboard'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));

// ── Page loading spinner ──────────────────────────────────────────────────────
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
);


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // Automatically reload the page if it's a Vite chunk load error
        const errorMsg = error?.message || '';
        const isChunkError = 
            errorMsg.includes('Failed to fetch dynamically imported module') || 
            errorMsg.includes('error loading dynamically imported module') ||
            errorMsg.includes('Importing a module script failed');

        if (isChunkError) {
            console.log('🔄 New deployment detected (chunk load error). Silently reloading...');
            window.location.reload();
            return;
        }

        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            // If it's the chunk error, we don't want to flash the red error screen while it's reloading
            const errorMsg = this.state.error?.message || '';
            const isChunkError = 
                errorMsg.includes('Failed to fetch dynamically imported module') || 
                errorMsg.includes('error loading dynamically imported module') ||
                errorMsg.includes('Importing a module script failed');

            if (isChunkError) {
                return <PageLoader />;
            }
            
            return (
                <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#991b1b', height: '100vh' }}>
                    <h1>Something went wrong in the React Tree.</h1>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.error?.toString()}</pre>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.errorInfo?.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
    },
});

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isInitialized } = useAuthStore();
    const location = useLocation();

    // Wait for the initial fetchMe() to complete before making routing decisions
    if (!isInitialized) return null; // or a full-screen spinner

    if (!isAuthenticated) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    return children;
};

const AuthRoute = ({ children }) => {
    const { isAuthenticated, isInitialized } = useAuthStore();
    const location = useLocation();

    if (!isInitialized) return null;

    if (isAuthenticated) {
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo') || '/workspaces';
        return <Navigate to={returnTo} replace />;
    }
    return children;
};

function App() {
    const { fetchMe, isAuthenticated } = useAuthStore();
    const { workspace, fetchWorkspaces } = useWorkspaceStore();

    // ── Version Check (Force Update) ──
    useEffect(() => {
        const jsVersion = import.meta.env.VITE_BUILD_TIME;
        const htmlVersion = document.getElementById('app-build-id')?.getAttribute('content');
        const currentVersion = `${jsVersion}-${htmlVersion}`;
        
        const storedVersion = localStorage.getItem('app_version');
        
        if (storedVersion && currentVersion !== storedVersion) {
            console.log('🚀 New version detected. Clearing cache and updating...');
            localStorage.setItem('app_version', currentVersion);
            
            // Clear all caches
            if ('caches' in window) {
                caches.keys().then((names) => {
                    for (let name of names) caches.delete(name);
                });
            }
            
            // Force hard reload (cache-busting)
            window.location.href = window.location.pathname + '?v=' + Date.now();
        } else {
            localStorage.setItem('app_version', currentVersion);
        }
    }, []);

    // Run once on app start — check if user is already logged in
    useEffect(() => {
        fetchMe();
        // Apply dark mode from localStorage
        const isDark = localStorage.getItem('darkMode') === 'true';
        document.documentElement.classList.toggle('dark', isDark);
    }, []);

    // Fetch workspace list only once authentication is confirmed
    useEffect(() => {
        if (isAuthenticated) fetchWorkspaces();
    }, [isAuthenticated]);

    // Global pre-fetcher for critical workspace data
    useEffect(() => {
        if (isAuthenticated && workspace?.slug) {
            queryClient.prefetchQuery({
                queryKey: ['workspace', workspace.slug, 'members'],
                queryFn: () => api.get(`/workspaces/${workspace.slug}/members`),
                staleTime: 30 * 60 * 1000
            });
        }
    }, [isAuthenticated, workspace?.slug, queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            <AmbientBackground />
            <NotificationInitializer />
            <FocusModeOverlay />
            <BrowserRouter>
                <AnalyticsTracker />
                {/* Email verification banner — softly prompt unverified users at top */}
                {isAuthenticated && <EmailVerificationBanner />}
                <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                            <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
                            <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />
                            <Route path="/invite/:token" element={<InviteAccept />} />
                            <Route path="/terms" element={<TermsOfService />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                            <Route path="/verify-email" element={<VerifyEmailPage />} />
                            <Route path="/health" element={<HealthDashboard />} />

                            {/* Workspace setup & selection */}
                            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                            <Route path="/workspaces" element={<ProtectedRoute><WorkspacePicker /></ProtectedRoute>} />

                            {/* Workspace specific routes - Protected by WorkspaceGuard */}
                            <Route path="/workspace/:slug" element={
                                <ProtectedRoute>
                                    <WorkspaceGuard />
                                </ProtectedRoute>
                            }>
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="projects" element={<Projects />} />
                                <Route path="projects/:id" element={<ProjectDetail />} />
                                <Route path="projects/:id/files" element={<ProjectFilesPage />} />
                                <Route path="calendar" element={<CalendarView />} />
                                <Route path="notifications" element={<Notifications />} />
                                <Route path="messages" element={<MessagesPage />} />
                                <Route path="timesheets" element={<TimesheetsPage />} />
                                <Route path="analytics" element={<AnalyticsPage />} />
                                <Route path="members" element={<MembersPage />} />
                                <Route path="settings" element={<WorkspaceSettings />} />
                                {/* Profile Settings */}
                                <Route path="profile" element={<Settings />} />
                            </Route>

                            {/* Default redirect - send to guard which will push to onboarding or active workspace */}
                            <Route path="/" element={<AuthRoute><Landing /></AuthRoute>} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </ErrorBoundary>
                {/* Global persistent timer bar — only for authenticated users */}
                {isAuthenticated && <GlobalTimerBar />}
                
                {/* Global Pulse Stream — Live workspace activities */}
                {isAuthenticated && <PulseStream />}

            </BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    className: 'shadow-lg border text-sm font-medium min-w-[280px] rounded-xl',
                    success: {
                        className: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-100',
                        iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
                    },
                    error: {
                        className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-100',
                        iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
                    },
                    blank: {
                        className: 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                    }
                }}
            />
        </QueryClientProvider>
    );
}

export default App;
