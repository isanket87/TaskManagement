import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useWorkspaceStore from '../../store/workspaceStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Mail, Shield, UserX, UserPlus, ShieldAlert, Loader2, Link2, XCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const MembersPage = () => {
    const { slug } = useParams();
    const { isAdmin, isOwner, workspace } = useWorkspaceStore();
    const { user } = useAuthStore();

    const [members, setMembers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        const fetchMembersAndInvites = async () => {
            try {
                const membersRes = await api.get(`/workspaces/${slug}/members`);
                setMembers(membersRes.data.data || []);

                if (isAdmin()) {
                    const invitesRes = await api.get(`/workspaces/${slug}/invites`);
                    setInvites(invitesRes.data.data.invites || []);
                }
            } catch (err) {
                toast.error('Failed to load workspace members');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchMembersAndInvites();
    }, [slug, isAdmin]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsInviting(true);
        try {
            const res = await api.post(`/workspaces/${slug}/members`, { email: inviteEmail, role: inviteRole });
            toast.success('Invitation sent!');
            setInvites([...invites, res.data.data]);
            setInviteEmail('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send invite');
        } finally {
            setIsInviting(false);
        }
    };

    const handleUpdateRole = async (memberUserId, newRole) => {
        try {
            await api.put(`/workspaces/${slug}/members/${memberUserId}`, { role: newRole });
            setMembers(members.map(m => m.userId === memberUserId ? { ...m, role: newRole } : m));
            toast.success('Role updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update role');
        }
    };

    const handleRemoveMember = async (memberUserId, memberName) => {
        if (!window.confirm(`Are you sure you want to remove ${memberName} from the workspace?`)) return;

        try {
            await api.delete(`/workspaces/${slug}/members/${memberUserId}`);
            setMembers(members.filter(m => m.userId !== memberUserId));
            toast.success(`${memberName} removed from workspace`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleCancelInvite = async (inviteId) => {
        if (!window.confirm('Cancel this invitation?')) return;

        try {
            await api.delete(`/workspaces/${slug}/invites/${inviteId}`);
            setInvites(invites.filter(i => i.id !== inviteId));
            toast.success('Invitation cancelled');
        } catch (err) {
            toast.error('Failed to cancel invitation');
        }
    };

    const copyInviteLink = (token) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        toast.success('Invite link copied to clipboard!');
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                        Workspace Members
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage who has access to {workspace?.name}
                    </p>
                </div>
            </div>

            {isAdmin() && (
                <div className="bg-white dark:bg-slate-800 shadow sm:rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Invite New Members</h3>
                    <form onSubmit={handleInvite} className="sm:flex sm:items-end gap-4">
                        <div className="flex-1">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                required
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-4 py-2 border"
                                placeholder="colleague@example.com"
                            />
                        </div>
                        <div className="mt-4 sm:mt-0 w-full sm:w-48">
                            <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                            <select
                                id="role"
                                name="role"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-4 py-2 border"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isInviting || !inviteEmail}
                            className="mt-4 sm:mt-0 flex w-full sm:w-auto items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                            Send Invite
                        </button>
                    </form>
                </div>
            )}

            {/* Active Members Table */}
            <div className="bg-white dark:bg-slate-800 shadow sm:rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Active Members</h3>
                </div>
                <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                    {members.map((member) => (
                        <li key={member.id} className="px-4 py-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        {member.user.avatar ? (
                                            <img className="h-10 w-10 rounded-full" src={member.user.avatar} alt="" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                                {member.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            {member.user.name}
                                            {member.userId === user.id && <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full ring-1 ring-indigo-500/20">You</span>}
                                        </div>
                                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{member.user.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {isAdmin() && member.role !== 'owner' && member.userId !== user.id ? (
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                                            className="text-sm rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${member.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                                member.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {member.role === 'owner' && <ShieldAlert className="w-3 h-3 mr-1" />}
                                            {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                        </span>
                                    )}

                                    {/* Can remove if owner, or if admin removing a normal member, but not oneself */}
                                    {(isOwner() || (isAdmin() && member.role === 'member')) && member.userId !== user.id && (
                                        <button
                                            onClick={() => handleRemoveMember(member.userId, member.user.name)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                                            title="Remove member"
                                        >
                                            <UserX className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Pending Invites Table */}
            {isAdmin() && invites.length > 0 && (
                <div className="bg-white dark:bg-slate-800 shadow sm:rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Pending Invitations</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {invites.length} Pending
                        </span>
                    </div>
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                        {invites.map((invite) => (
                            <li key={invite.id} className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="font-medium text-slate-900 dark:text-white">{invite.email}</div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                Invited to be <span className="font-medium">{invite.role}</span>
                                                <span>•</span>
                                                Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => copyInviteLink(invite.token)}
                                            className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-600 shadow-sm text-xs font-medium rounded text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <Link2 className="h-4 w-4 mr-1.5" />
                                            Copy Link
                                        </button>
                                        <button
                                            onClick={() => handleCancelInvite(invite.id)}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            <XCircle className="h-4 w-4 mr-1.5" />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MembersPage;
