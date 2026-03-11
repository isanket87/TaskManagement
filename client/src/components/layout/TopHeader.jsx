import { LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TopHeader = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const result = await logout();
        if (result.success) {
            navigate('/login');
        } else {
            toast.error('Failed to log out');
        }
    };

    return (
        <header className="sticky top-0 w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm z-50">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="white" />
                    </svg>
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">Brioright</span>
            </div>
            
            {user && (
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Log out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            )}
        </header>
    );
};

export default TopHeader;
