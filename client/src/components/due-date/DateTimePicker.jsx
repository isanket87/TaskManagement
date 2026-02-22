import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { addDays, startOfWeek } from 'date-fns';
import { X, Check, Trash2, Clock } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate, useClick, useDismiss, useInteractions } from '@floating-ui/react';

const QUICK_OPTIONS = [
    { label: 'Today', getDate: () => new Date() },
    { label: 'Tomorrow', getDate: () => addDays(new Date(), 1) },
    { label: 'This weekend', getDate: () => { const d = new Date(); const day = d.getDay(); return addDays(d, day <= 6 ? 6 - day : 7); } },
    { label: 'Next week', getDate: () => addDays(startOfWeek(new Date()), 8) },
    { label: 'Next month', getDate: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1); } },
];

/**
 * A floating date-time picker that renders via a React portal so it is never
 * clipped by overflow:hidden/overflow:auto ancestors.
 *
 * Props:
 *  - referenceRef  : ref attached to the trigger element
 *  - value         : current ISO date string (or null)
 *  - hasDueTime    : boolean
 *  - onApply(date, hasDueTime) : callback
 *  - onClear()     : callback
 *  - onClose()     : callback
 */
const DateTimePicker = ({ referenceRef, value, hasDueTime: initialHasDueTime = false, onApply, onClear, onClose }) => {
    const [selected, setSelected] = useState(value ? new Date(value) : undefined);
    const [hasTime, setHasTime] = useState(initialHasDueTime);
    const [hour, setHour] = useState(value ? new Date(value).getHours() % 12 || 12 : 9);
    const [minute, setMinute] = useState(value ? new Date(value).getMinutes() : 0);
    const [ampm, setAmpm] = useState(value ? (new Date(value).getHours() >= 12 ? 'PM' : 'AM') : 'AM');

    const { refs, floatingStyles } = useFloating({
        elements: { reference: referenceRef?.current },
        placement: 'bottom-end',
        middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
        whileElementsMounted: autoUpdate,
        open: true,
    });

    const handleApply = () => {
        if (!selected) return;
        const finalDate = new Date(selected);
        if (hasTime) {
            let h = hour % 12;
            if (ampm === 'PM') h += 12;
            finalDate.setHours(h, minute, 0, 0);
        } else {
            finalDate.setHours(12, 0, 0, 0);
        }
        onApply(finalDate, hasTime);
    };

    const picker = (
        <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 9999 }}
            className="card shadow-2xl w-72 p-4"
        >
            {/* Quick options */}
            <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Select</p>
                <div className="flex flex-wrap gap-1.5">
                    {QUICK_OPTIONS.map((opt) => (
                        <button
                            key={opt.label}
                            onClick={() => setSelected(opt.getDate())}
                            className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-400 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar */}
            <div className="flex justify-center -mx-1">
                <DayPicker
                    mode="single"
                    selected={selected}
                    onSelect={setSelected}
                    className="!m-0"
                    classNames={{
                        root: 'text-sm',
                        nav_button: 'p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded',
                        caption: 'flex justify-center items-center relative mb-2',
                        caption_label: 'text-sm font-semibold text-gray-900 dark:text-gray-100',
                        head_cell: 'text-xs text-gray-500 font-medium w-8 text-center',
                        cell: 'w-8 h-8',
                        day: 'w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors text-gray-700 dark:text-gray-300',
                        day_selected: '!bg-primary-600 !text-white',
                        day_today: 'font-bold text-primary-600 dark:text-primary-400',
                    }}
                />
            </div>

            {/* Time picker */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Time</span>
                    </div>
                    <button
                        onClick={() => setHasTime((h) => !h)}
                        className={`relative w-8 h-4 rounded-full transition-colors ${hasTime ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${hasTime ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
                {hasTime && (
                    <div className="flex items-center gap-1 justify-center">
                        <input
                            type="number" min={1} max={12} value={hour}
                            onChange={(e) => setHour(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-10 text-center input py-1 px-1"
                        />
                        <span className="text-gray-500 font-bold">:</span>
                        <input
                            type="number" min={0} max={59} value={String(minute).padStart(2, '0')}
                            onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-10 text-center input py-1 px-1"
                        />
                        <button
                            onClick={() => setAmpm((a) => (a === 'AM' ? 'PM' : 'AM'))}
                            className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            {ampm}
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                    onClick={onClear}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear date
                </button>
                <div className="flex-1" />
                <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
                <button
                    onClick={handleApply}
                    disabled={!selected}
                    className="btn btn-primary btn-sm"
                >
                    <Check className="w-4 h-4" />
                    Apply
                </button>
            </div>
        </div>
    );

    return createPortal(picker, document.body);
};

export default DateTimePicker;
