import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

const schema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

const ForgotPassword = () => {
    const [submitted, setSubmitted] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data) => {
        try {
            await api.post('/auth/forgot-password', { email: data.email });
            setSubmittedEmail(data.email);
            setSubmitted(true);
        } catch (err) {
            // Even on error, show success to prevent enumeration
            setSubmittedEmail(data.email);
            setSubmitted(true);
        }
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
                    {!submitted ? (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Forgot your password?</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No worries, we'll send you a reset link.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <Input
                                    label="Email address"
                                    type="email"
                                    placeholder="you@example.com"
                                    error={errors.email?.message}
                                    {...register('email')}
                                />
                                <Button type="submit" isLoading={isSubmitting} className="w-full">
                                    Send reset link
                                </Button>
                            </form>

                            <div className="mt-5 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <ArrowLeft className="w-4 h-4" />
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
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Check your inbox</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                                If <span className="font-medium text-gray-700 dark:text-gray-200">{submittedEmail}</span> is registered, you'll receive a password reset link shortly.
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mb-6">
                                Didn't receive it? Check your spam folder or wait a minute and try again.
                            </p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium mr-4"
                            >
                                Try again
                            </button>
                            <Link
                                to="/login"
                                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                Back to sign in
                            </Link>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
