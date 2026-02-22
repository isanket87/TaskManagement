import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const AuthCallback = () => {
    const navigate = useNavigate();
    const { fetchMe } = useAuthStore();
    const called = useRef(false);

    useEffect(() => {
        if (called.current) return;
        called.current = true;

        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');

        if (success === 'true') {
            fetchMe().then(() => {
                toast.success('Signed in with Google!');
                navigate('/dashboard', { replace: true });
            }).catch(() => {
                toast.error('Failed to load user. Please try again.');
                navigate('/login', { replace: true });
            });
        } else {
            toast.error('Google sign-in failed.');
            navigate('/login', { replace: true });
        }
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200 dark:shadow-primary-900/50">
                    <CheckSquare className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full"
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Signing you in...</span>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthCallback;
