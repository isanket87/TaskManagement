import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, X } from 'lucide-react';
import { useState, useRef } from 'react';
import DateTimePicker from '../due-date/DateTimePicker';
import useTaskStore from '../../store/taskStore';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';

const BulkActionBar = ({ projectId, onBulkDelete, onComplete }) => {
    const { selectedTaskIds, clearSelection } = useTaskStore();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const triggerRef = useRef(null);

    const handleBulkDueDate = async (date, hasDueTime) => {
        try {
            await taskService.bulkUpdateDueDate(selectedTaskIds, date?.toISOString(), hasDueTime);
            toast.success(`Updated ${selectedTaskIds.length} tasks`);
            setShowDatePicker(false);
            clearSelection();
            onComplete?.();
        } catch {
            toast.error('Failed to update due dates');
        }
    };

    if (selectedTaskIds.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 card shadow-2xl px-4 py-3 flex items-center gap-3 border border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900"
            >
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
                </span>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

                <div>
                    <div ref={triggerRef}>
                        <button
                            onClick={() => setShowDatePicker((o) => !o)}
                            className="btn btn-secondary btn-sm gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            Set Due Date
                        </button>
                    </div>
                    {showDatePicker && (
                        <DateTimePicker
                            referenceRef={triggerRef}
                            onApply={handleBulkDueDate}
                            onClear={() => handleBulkDueDate(null, false)}
                            onClose={() => setShowDatePicker(false)}
                        />
                    )}
                </div>

                <button onClick={onBulkDelete} className="btn btn-danger btn-sm gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                </button>

                <button onClick={clearSelection} className="btn btn-ghost btn-sm">
                    <X className="w-4 h-4" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default BulkActionBar;
