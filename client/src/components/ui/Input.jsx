import React from 'react';
import { cn } from '../../utils/helpers';

const Input = React.forwardRef(({ className, label, error, required, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="label">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                ref={ref}
                className={cn('input', error && 'border-red-400 focus:ring-red-500/20 focus:border-red-400', className)}
                required={required}
                {...props}
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
