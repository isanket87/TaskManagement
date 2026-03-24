import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '../../utils/helpers';

const SlashCommandList = forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = index => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    if (!props.items.length) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 text-sm text-slate-500 min-w-[150px]">
                No matching commands
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 flex flex-col min-w-[280px] max-h-[320px] overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Basic Blocks
            </div>
            {props.items.map((item, index) => (
                <button
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full",
                        index === selectedIndex && "bg-slate-100 dark:bg-slate-700"
                    )}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    <div className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                        <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-200 leading-tight block">{item.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">{item.description}</span>
                    </div>
                </button>
            ))}
        </div>
    );
});

SlashCommandList.displayName = 'SlashCommandList';

export default SlashCommandList;
