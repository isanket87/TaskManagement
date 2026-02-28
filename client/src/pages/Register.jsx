import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare, UserPlus } from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    terms: z.boolean().refine(val => val === true, { message: 'You must accept the terms to continue' }),
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

const Register = () => {
    const { register: registerUser, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: searchParams.get('email') || '',
            terms: false,
        }
    });

    const strength = getPasswordStrength(password);

    const onSubmit = async (data) => {
        const { terms, ...userData } = data;
        const result = await registerUser(userData);
        if (result.success) {
            toast.success('Account created! Welcome to Brioright 🎉');
            const returnTo = searchParams.get('returnTo') || '/dashboard';
            navigate(returnTo);
        } else {
            toast.error(result.error || 'Registration failed');
        }
    };

    const handleGoogleLogin = () => {
        let authUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/google`;
        const returnTo = searchParams.get('returnTo');
        if (returnTo) authUrl += `?state=${encodeURIComponent(returnTo)}`;
        window.location.href = authUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-200 dark:shadow-primary-900/50">
                        <CheckSquare className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Brioright</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Work with precision</p>
                </div>

                <div className="card p-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Create your account</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input label="Full Name" placeholder="Alex Johnson" error={errors.name?.message} {...register('name')} />
                        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />

                        {/* Password with strength indicator */}
                        <div className="space-y-2">
                            <Input
                                label="Password"
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
                                        {strength.score <= 2 && ' — try adding numbers, symbols, or uppercase letters'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Terms of Service */}
                        <div className="space-y-1">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    {...register('terms')}
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400 leading-snug">
                                    I agree to the{' '}
                                    <a href="/terms" target="_blank" className="text-primary-600 hover:text-primary-700 font-medium">
                                        Terms of Service
                                    </a>{' '}
                                    and{' '}
                                    <a href="/privacy" target="_blank" className="text-primary-600 hover:text-primary-700 font-medium">
                                        Privacy Policy
                                    </a>
                                </span>
                            </label>
                            {errors.terms && (
                                <p className="text-xs text-rose-500 ml-7">{errors.terms.message}</p>
                            )}
                        </div>

                        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
                            <UserPlus className="w-4 h-4" />
                            Create Account
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                        <div className="relative flex justify-center text-xs"><span className="px-2 bg-white dark:bg-gray-900 text-gray-400">or continue with</span></div>
                    </div>

                    {/* Google Button */}
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="text-center text-sm text-gray-500 mt-5">
                        Already have an account?{' '}
                        <Link
                            to={searchParams.get('returnTo') ? `/login?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : '/login'}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
