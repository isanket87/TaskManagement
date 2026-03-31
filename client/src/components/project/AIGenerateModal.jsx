import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import useWorkspaceStore from '../../store/workspaceStore';
import { cn } from '../../utils/helpers';

export default function AIGenerateModal({ isOpen, onClose }) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const { workspace } = useWorkspaceStore();
    const navigate = useNavigate();

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            const res = await projectService.generateProject(workspace.slug, prompt);
            toast.success("Gen-Create successful!");
            
            // Navigate directly to the new project board
            if (res.data?.data?.id) {
                navigate(`/workspace/${workspace.slug}/projects/${res.data.data.id}`);
            }
            onClose();
            setPrompt('');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to generate project");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Wrapper */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={!isGenerating ? onClose : undefined}
                    >
                        <div 
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-100 dark:border-indigo-500/20 overflow-hidden my-auto shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            
                            {/* Animated Background Gradients */}
                            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-fuchsia-500/20 dark:bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Header */}
                            <div className="relative border-b border-slate-100 dark:border-slate-800 p-6 flex items-start justify-between">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                        <Sparkles className="text-white w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 dark:from-indigo-400 dark:to-fuchsia-400">
                                            Gen-Create Project
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Describe a goal. AI builds the board and backlog.
                                        </p>
                                    </div>
                                </div>
                                {!isGenerating && (
                                    <button 
                                        onClick={onClose}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Body */}
                            <form onSubmit={handleGenerate} className="relative p-6 pt-8">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl opacity-20 group-focus-within:opacity-100 blur transition duration-500"></div>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="e.g. 'Build a modern mobile app login screen with social auth'"
                                            rows={4}
                                            disabled={isGenerating}
                                            className="relative w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                            autoFocus
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {['Launch a Q3 Marketing Campaign', 'Redesign our landing page', 'Plan team offsite'].map(suggestion => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setPrompt(suggestion)}
                                                disabled={isGenerating}
                                                className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isGenerating}
                                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!prompt.trim() || isGenerating}
                                        className={cn(
                                            "relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all overflow-hidden",
                                            !prompt.trim() || isGenerating 
                                                ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed" 
                                                : "bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                                        )}
                                    >
                                        {isGenerating && (
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        )}
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>AI is thinking...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Generate</span>
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
