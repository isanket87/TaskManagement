import React from 'react';
import { cn } from '../../utils/helpers';

const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && <label className="label">{label}</label>}
            <input
                ref={ref}
                className={cn('input', error && 'border-red-400 focus:ring-red-500/20 focus:border-red-400', className)}
                {...props}
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
