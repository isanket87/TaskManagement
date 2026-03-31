import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, FolderKanban, CheckSquare, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../ui/Avatar';
import useWorkspaceStore from '../../store/workspaceStore';

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const { workspace } = useWorkspaceStore();
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

    // Staggered Animation Configurations
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05, duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
        hover: { y: -2, scale: 1.01, transition: { type: 'spring', stiffness: 300, damping: 20 } }
    };

    const isResultsEmpty = !loading && query.length >= 2 && results.projects.length === 0 && results.tasks.length === 0 && results.users.length === 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-md overflow-hidden pointer-events-auto">
                {/* Floating ambient orb background */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
                    <div className="absolute top-[30%] right-[30%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px]" />
                </motion.div>

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
                    transition={{ type: "spring", damping: 25, stiffness: 250 }}
                    className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-xl overflow-hidden border border-white/60 dark:border-white/10"
                >
                    {/* Header Input Group */}
                    <div className="flex items-center px-6 py-4 border-b border-slate-200/50 dark:border-slate-800 focus-within:bg-white/50 dark:focus-within:bg-slate-950/50 transition-colors group">
                        <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors mr-4 shrink-0" />
                        <input
                            id="global-search-input"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Find tasks, projects, people..."
                            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-lg font-bold py-1 placeholder:font-medium"
                        />
                        <button
                            onClick={onClose}
                            className="p-1 rounded-[10px] bg-slate-100/80 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs px-3 ml-3 transition-all font-black uppercase tracking-wider border border-slate-200/50 dark:border-white/5 shadow-sm hover:scale-105 active:scale-95"
                        >
                            ESC
                        </button>
                    </div>

                    {/* Results Body */}
                    <div className="max-h-[60vh] overflow-y-auto p-3 no-scrollbar">
                        {/* Loading State */}
                        {loading && (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}>
                                    <Sparkles className="w-8 h-8 text-indigo-400 mb-4" />
                                </motion.div>
                                <span className="text-sm font-bold text-slate-500 tracking-widest uppercase">Prying the vault...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {isResultsEmpty && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-16 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-[20px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-inner border border-slate-100 dark:border-white/5">
                                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">No results discovered</p>
                                <p className="text-sm font-medium text-slate-500 mt-2">Try searching by a specific keyword or project name.</p>
                            </motion.div>
                        )}

                        {/* Default State */}
                        {!loading && query.length < 2 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 flex flex-col items-center justify-center text-center">
                                <Search className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-4" />
                                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">Workspace Search</p>
                                <p className="text-xs font-medium text-slate-400 mt-2 max-w-[250px]">Type at least 2 characters to search your tasks, projects, and team members.</p>
                            </motion.div>
                        )}

                        {!loading && !isResultsEmpty && query.length >= 2 && (
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-2">
                                {/* Projects Category */}
                                {results.projects?.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="px-3 py-1 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Projects</div>
                                        <div className="space-y-1">
                                            {results.projects.map((p) => (
                                                <motion.div
                                                    variants={itemVariants}
                                                    whileHover="hover"
                                                    key={p.id}
                                                    onClick={() => navigateTo(`/workspace/${workspace?.slug}/projects/${p.id}`)}
                                                    className="flex items-center gap-4 px-4 py-3 rounded-[16px] bg-transparent hover:bg-white dark:hover:bg-slate-800 hover:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                                >
                                                    <div className="w-10 h-10 rounded-[12px] shrink-0 flex items-center justify-center border border-black/5 dark:border-white/5" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                                                        <FolderKanban className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                                                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{p.description || 'Project Workspace'}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tasks Category */}
                                {results.tasks?.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="px-3 py-1 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Tasks</div>
                                        <div className="space-y-1">
                                            {results.tasks.map((t) => (
                                                <motion.div
                                                    variants={itemVariants}
                                                    whileHover="hover"
                                                    key={t.id}
                                                    onClick={() => navigateTo(`/workspace/${workspace?.slug}/projects/${t.projectId}`)}
                                                    className="flex items-center gap-4 px-4 py-3 rounded-[16px] bg-transparent hover:bg-white dark:hover:bg-slate-800 hover:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                                >
                                                    <div className="w-10 h-10 rounded-[12px] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/50 dark:border-white/5">
                                                        <CheckSquare className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">{t.title}</p>
                                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-1">Jump to board</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Users Category */}
                                {results.users?.length > 0 && (
                                    <div className="space-y-2 pb-2">
                                        <div className="px-3 py-1 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Team Members</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {results.users.map((u) => (
                                                <motion.div
                                                    variants={itemVariants}
                                                    whileHover="hover"
                                                    key={u.id}
                                                    onClick={() => { onClose(); /* Could route to member profile or DM later */ }}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-[16px] bg-transparent hover:bg-white dark:hover:bg-slate-800 hover:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                                >
                                                    <div className="shrink-0 relative">
                                                        <Avatar user={u} size="md" className="rounded-[12px] shadow-sm border border-slate-200 dark:border-slate-700" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 truncate">{u.email}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default GlobalSearchModal;
