import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

const schema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

// Password strength calculator
const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-400' };
    if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500' };
    return { score, label: 'Very Strong', color: 'bg-emerald-600' };
};

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [success, setSuccess] = useState(false);
    const [password, setPassword] = useState('');
    const token = searchParams.get('token');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
    });

    const strength = getPasswordStrength(password);

    const onSubmit = async (data) => {
        if (!token) {
            toast.error('Invalid reset link. Please request a new one.');
            return;
        }
        try {
            await api.post('/auth/reset-password', { token, password: data.password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reset link is invalid or has expired.');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                    <div className="card p-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-7 h-7 text-rose-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Invalid reset link</h2>
                        <p className="text-sm text-gray-500 mb-5">This link is missing a token. Please request a new password reset.</p>
                        <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                            Request new reset link
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-200 dark:shadow-primary-900/50">
                        <CheckSquare className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Brioright</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Work with precision</p>
                </div>

                <div className="card p-8">
                    {!success ? (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Set new password</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Must be at least 8 characters.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        label="New Password"
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        error={errors.password?.message}
                                        {...register('password', {
                                            onChange: (e) => setPassword(e.target.value)
                                        })}
                                    />
                                    {password.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs font-medium ${strength.score <= 1 ? 'text-rose-500' :
                                                    strength.score <= 2 ? 'text-amber-500' :
                                                        strength.score <= 3 ? 'text-yellow-500' :
                                                            'text-emerald-500'
                                                }`}>
                                                {strength.label}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    label="Confirm Password"
                                    type="password"
                                    placeholder="Repeat your password"
                                    error={errors.confirmPassword?.message}
                                    {...register('confirmPassword')}
                                />

                                <Button type="submit" isLoading={isSubmitting} className="w-full">
                                    Reset Password
                                </Button>
                            </form>

                            <div className="mt-5 text-center">
                                <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                    Back to sign in
                                </Link>
                            </div>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Password reset!</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                                Your password has been updated successfully. Redirecting you to sign in...
                            </p>
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                                Sign in now →
                            </Link>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
