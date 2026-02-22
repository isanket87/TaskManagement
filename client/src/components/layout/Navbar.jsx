import { Sun, Moon, Bell, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../../store/notificationStore';
import useWorkspaceStore from '../../store/workspaceStore';
import GlobalSearchModal from '../shared/GlobalSearchModal';

const Navbar = ({ title }) => {
    const { unreadCount } = useNotificationStore();
    const { workspace } = useWorkspaceStore();
    const navigate = useNavigate();
    const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('darkMode', dark);
    }, [dark]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 relative">

                {/* Left: Breadcrumb/Title */}
                <div className="flex flex-1 items-center min-w-0">
                    <h1 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                        {title}
                    </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">

                    {/* Search Trigger */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Search (Cmd+K)"
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-xs font-medium hidden sm:inline-block border border-slate-300 dark:border-slate-600 rounded px-1.5 text-slate-400">⌘K</span>
                    </button>

                    {/* Dark mode */}
                    <button
                        onClick={() => setDark((d) => !d)}
                        className="p-2 mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Toggle theme"
                    >
                        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Notifications */}
                    <button
                        onClick={() => {
                            if (workspace) {
                                navigate(`/workspace/${workspace.slug}/notifications`);
                            } else {
                                navigate('/notifications');
                            }
                        }}
                        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                        )}
                    </button>

                </div>
            </header>

            <GlobalSearchModal
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
            />
        </>
    );
};

export default Navbar;
