import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, FolderKanban, CheckSquare, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ projects: [], tasks: [], users: [] });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults({ projects: [], tasks: [], users: [] });
            return;
        }
        document.getElementById('global-search-input')?.focus();
    }, [isOpen]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (query.trim().length < 2) {
                setResults({ projects: [], tasks: [], users: [] });
                return;
            }
            setLoading(true);
            try {
                const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
                setResults(res.data.data || { projects: [], tasks: [], users: [] });
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    if (!isOpen) return null;

    const navigateTo = (path) => {
        onClose();
        navigate(path);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                >
                    {/* Header Input */}
                    <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                        <input
                            id="global-search-input"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search tasks, projects, members..."
                            className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-base py-1"
                        />
                        <button
                            onClick={onClose}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs px-2 ml-2 transition-colors font-medium border border-slate-200 dark:border-slate-600 shadow-sm"
                        >
                            ESC
                        </button>
                    </div>

                    {/* Results Body */}
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {loading && (
                            <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
                        )}

                        {!loading && query.length >= 2 && results.projects.length === 0 && results.tasks.length === 0 && results.users.length === 0 && (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No results found</p>
                                <p className="text-xs text-slate-500 mt-1">Try searching for something else</p>
                            </div>
                        )}

                        {/* Projects Category */}
                        {results.projects?.length > 0 && (
                            <div className="mb-4">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</div>
                                {results.projects.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => navigateTo(`/projects/${p.id}`)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                                            <FolderKanban className="w-4 h-4" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{p.description || 'No description'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tasks Category */}
                        {results.tasks?.length > 0 && (
                            <div className="mb-4">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasks</div>
                                {results.tasks.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => navigateTo(`/projects/${t.projectId}`)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                            <CheckSquare className="w-4 h-4" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                                            <p className="text-xs text-slate-500">In project</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Users Category */}
                        {results.users?.length > 0 && (
                            <div className="mb-2">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Members</div>
                                {results.users.map((u) => (
                                    <div
                                        key={u.id}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default GlobalSearchModal;
