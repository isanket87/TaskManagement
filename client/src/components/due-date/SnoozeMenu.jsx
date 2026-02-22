import { Bell, X } from 'lucide-react';
import { getSnoozeTimestamp } from '../../utils/dueDateUtils';
import { SNOOZE_OPTIONS } from '../../utils/constants';

const SnoozeMenu = ({ onSnooze, onClose }) => {
    return (
        <div className="card shadow-xl w-48 p-2 z-50">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Bell className="w-4 h-4" />
                    Snooze reminder
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            {SNOOZE_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => { onSnooze(getSnoozeTimestamp(opt.value)); onClose?.(); }}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

export default SnoozeMenu;
