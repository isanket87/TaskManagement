import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

const Button = React.forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    className,
    ...props
}, ref) => {
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
        outline: 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm',
    };
    const sizeClasses = {
        xs: 'px-2 py-1 text-xs rounded-md',
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
    };

    return (
        <motion.button
            ref={ref}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
            disabled={disabled || isLoading}
            className={cn('btn', variantClasses[variant], sizeClasses[size], className)}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </motion.button>
    );
});

Button.displayName = 'Button';
export default Button;
