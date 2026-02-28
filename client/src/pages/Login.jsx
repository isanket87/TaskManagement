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
        const baseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/google`;
        window.location.href = returnTo ? `${baseUrl}?returnTo=${encodeURIComponent(returnTo)}` : baseUrl;
    };

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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Sign in to your account</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />

                        <div className="space-y-1">
                            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
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
                        Don't have an account?{' '}
                        <Link
                            to={searchParams.get('returnTo') ? `/register?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : '/register'}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Sign up free
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
