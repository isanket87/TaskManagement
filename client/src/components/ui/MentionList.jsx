import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '../../utils/helpers';
import Avatar from './Avatar';

const MentionList = forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = index => {
        const item = props.items[index];
        if (item) {
            props.command({ id: item.id, label: item.label });
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
                No users found
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 flex flex-col min-w-[200px] max-h-[250px] overflow-y-auto">
            {props.items.map((item, index) => (
                <button
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full",
                        index === selectedIndex && "bg-slate-100 dark:bg-slate-700"
                    )}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    {item.user ? (
                        <Avatar user={item.user} size="xs" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 grid place-items-center text-xs font-bold shrink-0">
                            {item.label?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {item.label}
                    </span>
                </button>
            ))}
        </div>
    );
});

MentionList.displayName = 'MentionList';

export default MentionList;
