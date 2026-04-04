import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare, LogIn } from 'lucide-react';
import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout';

const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password required'),
});

const Login = () => {
    const { login, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'oauth_failed') toast.error('Google sign-in failed. Try again.');
        if (error === 'no_code') toast.error('Google sign-in was cancelled.');
    }, []);

    const onSubmit = async (data) => {
        const result = await login(data);
        if (result.success) {
            toast.success('Welcome back!');
            navigate('/dashboard');
        } else {
            toast.error(result.error || 'Login failed');
        }
    };

    const handleGoogleLogin = () => {
        const returnTo = searchParams.get('returnTo');
        const rawApi = import.meta.env.VITE_API_URL || '';
        const computedApi = rawApi ? (rawApi.replace(/\/+$/, '').endsWith('/api') ? rawApi.replace(/\/+$/, '') : `${rawApi.replace(/\/+$/, '')}/api`) : '/api';
        const baseUrl = `${computedApi}/auth/google`;
        window.location.href = returnTo ? `${baseUrl}?returnTo=${encodeURIComponent(returnTo)}` : baseUrl;
    };

    return (
        <AuthLayout>
            <div className="card p-8 sm:p-10">
                <h1 className="text-2xl font-black mb-1 hero-gradient-text">Welcome Back</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">Sign in to continue to Brioright</p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input label="Email" type="email" placeholder="you@example.com" required={true} error={errors.email?.message} {...register('email')} />

                        <div className="space-y-1">
                            <Input label="Password" type="password" placeholder="••••••••" required={true} error={errors.password?.message} {...register('password')} />
                            <div className="flex justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
                            <LogIn className="w-4 h-4" />
                            Sign In
                        </Button>
                    </form>

                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/5" /></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-400"><span className="px-3 bg-white dark:bg-slate-900 rounded-full">or continue with</span></div>
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
                        Don't have an account?{' '}
                        <Link
                            to={searchParams.get('returnTo') ? `/register?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : '/register'}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Sign up free
                        </Link>
                    </p>
                </div>
        </AuthLayout>
    );
};

export default Login;
