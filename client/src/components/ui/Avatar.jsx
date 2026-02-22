import { getInitials } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

const Avatar = ({ user, size = 'md', className }) => {
    const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };

    if (user?.avatar) {
        return (
            <img
                src={user.avatar}
                alt={user.name}
                className={cn('rounded-full object-cover ring-2 ring-white dark:ring-gray-900', sizes[size], className)}
            />
        );
    }

    const initials = getInitials(user?.name || user?.email || '?');
    const colors = ['bg-primary-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500', 'bg-cyan-500'];
    const color = colors[(user?.name || '').length % colors.length] || colors[0];

    return (
        <div
            title={user?.name}
            className={cn(
                'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white dark:ring-gray-900',
                color, sizes[size], className
            )}
        >
            {initials}
        </div>
    );
};

export default Avatar;
