import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useWorkspaceStore from '../store/workspaceStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

const InviteAccept = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user, fetchMe } = useAuthStore();
    const { setWorkspace, fetchWorkspaces } = useWorkspaceStore();

    const [loadingInfo, setLoadingInfo] = useState(true);
    const [inviteInfo, setInviteInfo] = useState(null);
    const [error, setError] = useState(null);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        const fetchInviteDetails = async () => {
            try {
                const res = await api.get(`/workspaces/invites/${token}`);
                setInviteInfo(res.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Invalid or expired invite token.');
            } finally {
                setLoadingInfo(false);
            }
        };

        if (token) fetchInviteDetails();
    }, [token]);

    const handleAccept = async () => {
        // If user isn't logged in, redirect them to login or register depending on if they exist
        if (!user) {
            if (inviteInfo.userExists) {
                navigate(`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
            } else {
                navigate(`/register?returnTo=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(inviteInfo.email)}`);
            }
            return;
        }

        // If user email doesn't match invite email
        if (user.email.toLowerCase() !== inviteInfo.email.toLowerCase()) {
            toast.error(`Please log in with the invited email address: ${inviteInfo.email}`);
            return;
        }

        setAccepting(true);
        try {
            const res = await api.post(`/workspaces/invites/${token}/accept`);
            toast.success('Successfully joined workspace!');

            // Re-fetch user & workspace list so switcher is up to date
            await Promise.all([fetchMe(), fetchWorkspaces()]);

            // Set workspace context locally
            setWorkspace(res.data.data, inviteInfo.role);

            // Navigate to dashboard
            navigate(`/workspace/${res.data.data.slug}/dashboard`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to accept invite.';
            toast.error(msg);
            setError(msg);
        } finally {
            setAccepting(false);
        }
    };

    if (loadingInfo) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center border border-slate-200 dark:border-slate-700">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Invite</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center w-full px-4 py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Go to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-8 sm:p-10 text-center">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-6">
                        <CheckCircle2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    </div>

                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                        You've been invited!
                    </h2>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        <strong>{inviteInfo.invitedBy?.name || 'Someone'}</strong> has invited you to join <strong>{inviteInfo.workspace?.name || 'a workspace'}</strong> as a <strong>{inviteInfo.role}</strong>.
                    </p>

                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700 mb-8">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            Invited Email: <span className="font-normal text-slate-600 dark:text-slate-400">{inviteInfo.email}</span>
                        </p>
                    </div>

                    {!user ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {inviteInfo.userExists
                                    ? "Welcome back! Please log in to your existing account to accept this invitation."
                                    : "Welcome to Brioright! You need to create an account to accept this invitation."}
                            </p>
                            <button
                                onClick={handleAccept}
                                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                {inviteInfo.userExists ? "Log In" : "Sign Up"} <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    ) : user.email.toLowerCase() !== inviteInfo.email.toLowerCase() ? (
                        <div className="space-y-4">
                            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                                            Account Mismatch
                                        </h3>
                                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
                                            <p>
                                                You are logged in as <strong>{user.email}</strong>, which doesn't match the invited email address.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    // Normally you'd want a specific logout helper here that allows a redirect back
                                    // For simplicity, navigating to login will just push them out
                                    navigate('/login');
                                }}
                                className="w-full flex items-center justify-center py-2 px-4 border shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Switch Account
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {accepting ? (
                                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            ) : (
                                'Accept Invitation'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteAccept;
