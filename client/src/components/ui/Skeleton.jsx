import { cn } from '../../utils/helpers';

const Skeleton = ({ className }) => (
    <div className={cn('animate-pulse bg-slate-200 dark:bg-slate-700 rounded', className)} />
);

export const ProjectCardSkeleton = () => (
    <div className="card p-5 group">
        <Skeleton className="h-1 w-full rounded mb-4" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded mt-2" />
        <Skeleton className="h-2 w-full rounded mt-4" />
        <Skeleton className="h-3 w-1/2 rounded mt-4" />
    </div>
);

export const TaskCardSkeleton = () => (
    <div className="card p-4 space-y-3">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-3 w-3/4 rounded mt-2" />
        <Skeleton className="h-3 w-1/3 rounded mt-4" />
    </div>
);

export default Skeleton;
