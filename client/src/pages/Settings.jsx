import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Save } from 'lucide-react';
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
    newPassword: z.string().min(6, 'Min. 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

const Settings = () => {
    const { user, setUser } = useAuthStore();
    const [profileLoading, setProfileLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);

    const profileForm = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name || '', email: user?.email || '' } });
    const passForm = useForm({ resolver: zodResolver(passwordSchema) });

    const onProfileSubmit = async (data) => {
        setProfileLoading(true);
        try {
            const res = await api.put('/auth/profile', data);
            setUser(res.data.data.user);
            toast.success('Profile updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const onPassSubmit = async (data) => {
        setPassLoading(true);
        try {
            await api.put('/auth/password', data);
            toast.success('Password changed!');
            passForm.reset();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <PageWrapper title="Settings">
            <div className="p-6 max-w-2xl mx-auto space-y-6">
                {/* Profile Section */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                        <Avatar user={user} size="xl" />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
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

                {/* Password Section */}
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
            </div>
        </PageWrapper>
    );
};

export default Settings;
