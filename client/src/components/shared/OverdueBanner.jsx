import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const OverdueBanner = ({ overdueCount }) => {
    const [dismissed, setDismissed] = useState(false);
    const navigate = useNavigate();

    if (!overdueCount || dismissed) return null;

    return (
        <AnimatePresence>
            {!dismissed && overdueCount > 0 && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-red-500 text-white shadow-sm"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                        <p className="text-sm font-medium flex-1">
                            You have {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'} that need attention.
                        </p>
                        <button
                            onClick={() => navigate('/dashboard?filter=overdue')}
                            className="flex items-center gap-1.5 text-sm font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            View
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors ml-2"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OverdueBanner;
