import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Save, Camera, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'Min. 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

const Settings = () => {
    const { user, setUser, logout } = useAuthStore();
    const [profileLoading, setProfileLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePass, setDeletePass] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
    const fileRef = useRef(null);

    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: user?.name || '', email: user?.email || '' }
    });
    const passForm = useForm({ resolver: zodResolver(passwordSchema) });

    // ── Avatar upload ──────────────────────────────────────────────────────
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }

        // Preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target.result);
        reader.readAsDataURL(file);

        setAvatarLoading(true);
        try {
            // Convert to base64 and save as avatar URL
            const base64 = await new Promise((resolve) => {
                const r = new FileReader();
                r.onload = (ev) => resolve(ev.target.result);
                r.readAsDataURL(file);
            });
            const res = await api.patch('/auth/profile', { avatar: base64 });
            setUser(res.data.data.user);
            toast.success('Avatar updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload avatar');
            setAvatarPreview(user?.avatar || null);
        } finally {
            setAvatarLoading(false);
        }
    };

    // ── Profile update ─────────────────────────────────────────────────────
    const onProfileSubmit = async (data) => {
        setProfileLoading(true);
        try {
            const res = await api.patch('/auth/profile', data);
            setUser(res.data.data.user);
            toast.success('Profile updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    // ── Password change ────────────────────────────────────────────────────
    const onPassSubmit = async (data) => {
        setPassLoading(true);
        try {
            await api.patch('/auth/password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            toast.success('Password changed!');
            passForm.reset();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setPassLoading(false);
        }
    };

    // ── Account deletion ───────────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        if (!deletePass) { toast.error('Please enter your password'); return; }
        setDeleteLoading(true);
        try {
            await api.delete('/auth/account', { data: { password: deletePass } });
            toast.success('Account deleted. Goodbye!');
            logout();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete account');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <PageWrapper title="Settings">
            <div className="p-6 max-w-2xl mx-auto space-y-6">

                {/* ── Profile Section ── */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center gap-5 mb-6">
                        <div className="relative group">
                            <Avatar
                                user={{ ...user, avatar: avatarPreview }}
                                size="xl"
                                className="ring-4 ring-white dark:ring-gray-800 shadow-md"
                            />
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={avatarLoading}
                                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                {avatarLoading
                                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    : <Camera className="w-5 h-5 text-white" />
                                }
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="text-xs text-primary-600 hover:text-primary-700 mt-1 transition-colors"
                            >
                                Change photo
                            </button>
                        </div>
                    </div>

                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <Input label="Full Name" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
                        <Input label="Email" type="email" error={profileForm.formState.errors.email?.message} {...profileForm.register('email')} />
                        <Button type="submit" isLoading={profileLoading} size="sm">
                            <Save className="w-4 h-4" />
                            Save Profile
                        </Button>
                    </form>
                </div>

                {/* ── Password Section ── */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-orange-600" />
                        </div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
                    </div>
                    <form onSubmit={passForm.handleSubmit(onPassSubmit)} className="space-y-4">
                        <Input label="Current Password" type="password" error={passForm.formState.errors.currentPassword?.message} {...passForm.register('currentPassword')} />
                        <Input label="New Password" type="password" error={passForm.formState.errors.newPassword?.message} {...passForm.register('newPassword')} />
                        <Input label="Confirm New Password" type="password" error={passForm.formState.errors.confirmPassword?.message} {...passForm.register('confirmPassword')} />
                        <Button type="submit" isLoading={passLoading} variant="secondary" size="sm">
                            <Lock className="w-4 h-4" />
                            Change Password
                        </Button>
                    </form>
                </div>

                {/* ── Danger Zone ── */}
                <div className="card p-6 border-red-200 dark:border-red-900/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Danger Zone</h2>
                    </div>

                    {!deleteOpen ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Delete Account</p>
                                <p className="text-xs text-gray-500 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
                            </div>
                            <button
                                onClick={() => setDeleteOpen(true)}
                                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Delete Account
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    This action is <strong>permanent</strong>. All your workspaces, projects, and data will be deleted. Enter your password to confirm.
                                </p>
                            </div>
                            <input
                                type="password"
                                value={deletePass}
                                onChange={e => setDeletePass(e.target.value)}
                                placeholder="Enter your password to confirm"
                                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setDeleteOpen(false); setDeletePass(''); }}
                                    className="flex-1 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading || !deletePass}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                                >
                                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Permanently Delete</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </PageWrapper>
    );
};

export default Settings;
