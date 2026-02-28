import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useWorkspaceStore from '../../store/workspaceStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    Mail, Shield, UserX, UserPlus, ShieldAlert,
    Loader2, Link2, XCircle, Users, Clock, CheckCircle2, Crown
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const roleConfig = {
    owner: {
        label: 'Owner',
        icon: Crown,
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
        dotClass: 'bg-amber-500'
    },
    admin: {
        label: 'Admin',
        icon: ShieldAlert,
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
        dotClass: 'bg-blue-500'
    },
    member: {
        label: 'Member',
        icon: Shield,
        className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        dotClass: 'bg-slate-400'
    },
};

const RoleBadge = ({ role }) => {
    const cfg = roleConfig[role] || roleConfig.member;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
};

const Avatar = ({ name, avatar, size = 'md' }) => {
    const sizeClass = size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm';
    const colors = [
        'from-violet-500 to-purple-600',
        'from-blue-500 to-cyan-600',
        'from-emerald-500 to-teal-600',
        'from-orange-500 to-amber-600',
        'from-pink-500 to-rose-600',
        'from-indigo-500 to-blue-600',
    ];
    const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
    return avatar ? (
        <img className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-slate-800`} src={avatar} alt={name} />
    ) : (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white ring-2 ring-white dark:ring-slate-800`}>
            {name?.charAt(0).toUpperCase()}
        </div>
    );
};

const MembersPage = () => {
    const { slug } = useParams();
    const { isAdmin, isOwner, workspace } = useWorkspaceStore();
    const { user } = useAuthStore();

    const [members, setMembers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

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
        toast.success('Invite link copied!');
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const ownerCount = members.filter(m => m.role === 'owner').length;
    const adminCount = members.filter(m => m.role === 'admin').length;
    const memberCount = members.filter(m => m.role === 'member').length;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Team Members
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage who has access to <span className="font-medium text-slate-700 dark:text-slate-300">{workspace?.name}</span>
                    </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                    {[
                        { icon: Users, value: members.length, label: 'Members', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                        { icon: Clock, value: invites.length, label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    ].map(({ icon: Icon, value, label, color, bg }) => (
                        <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg} border border-transparent`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className={`text-sm font-semibold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invite Card */}
            {isAdmin() && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <UserPlus className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Invite a team member</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">They'll receive an email with a link to join</p>
                        </div>
                    </div>
                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                type="email"
                                required
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                                placeholder="colleague@company.com"
                            />
                        </div>
                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full sm:w-36 px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isInviting || !inviteEmail}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Send Invite
                        </button>
                    </form>
                </div>
            )}

            {/* Role breakdown pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-1">Breakdown</span>
                {ownerCount > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40"><Crown className="w-3 h-3" />{ownerCount} Owner</span>}
                {adminCount > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40"><ShieldAlert className="w-3 h-3" />{adminCount} Admin{adminCount > 1 ? 's' : ''}</span>}
                {memberCount > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"><Shield className="w-3 h-3" />{memberCount} Member{memberCount > 1 ? 's' : ''}</span>}
            </div>

            {/* Members Grid */}
            <div className="grid gap-3">
                {members.map((member) => {
                    const isCurrentUser = member.userId === user.id;
                    const canEditRole = isAdmin() && member.role !== 'owner' && !isCurrentUser;
                    const canRemove = (isOwner() || (isAdmin() && member.role === 'member')) && !isCurrentUser;

                    return (
                        <div
                            key={member.id}
                            className="group flex items-center justify-between gap-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-5 py-4 hover:border-indigo-200 dark:hover:border-indigo-800/40 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200"
                        >
                            {/* Left — Avatar + Info */}
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="relative shrink-0">
                                    <Avatar name={member.user.name} avatar={member.user.avatar} />
                                    {isCurrentUser && (
                                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                            {member.user.name}
                                        </span>
                                        {isCurrentUser && (
                                            <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {member.user.email}
                                    </p>
                                </div>
                            </div>

                            {/* Right — Role + Actions */}
                            <div className="flex items-center gap-3 shrink-0">
                                {canEditRole ? (
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                                        className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                ) : (
                                    <RoleBadge role={member.role} />
                                )}

                                {canRemove && (
                                    <button
                                        onClick={() => handleRemoveMember(member.userId, member.user.name)}
                                        title="Remove member"
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-150"
                                    >
                                        <UserX className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pending Invites */}
            {isAdmin() && invites.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pending Invitations</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {invites.length}
                        </span>
                    </div>

                    <div className="grid gap-2">
                        {invites.map((invite) => (
                            <div
                                key={invite.id}
                                className="flex items-center justify-between gap-4 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl px-5 py-4"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                            {invite.email}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Invited as <span className="font-medium capitalize">{invite.role}</span>
                                            <span className="mx-1.5">·</span>
                                            Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => copyInviteLink(invite.token)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                        Copy Link
                                    </button>
                                    <button
                                        onClick={() => handleCancelInvite(invite.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800/30 transition-colors"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembersPage;
