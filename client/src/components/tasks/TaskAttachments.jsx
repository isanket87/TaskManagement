import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { File, FileText, Image, Paperclip, Download, Trash2, Loader2 } from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const getFileIcon = (type) => {
    if (!type) return <File size={20} className="text-gray-400" />;
    if (type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText size={20} className="text-orange-500" />;
    return <File size={20} className="text-gray-500" />;
};

const TaskAttachments = ({ taskId }) => {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);

    const { data: attachments, isLoading } = useQuery({
        queryKey: ['task-attachments', taskId],
        queryFn: async () => {
            const res = await taskService.getAttachments(taskId);
            return res.data.data.attachments;
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (file) => taskService.uploadAttachment(taskId, file),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-attachments', taskId]);
            toast.success('File uploaded');
            setUploading(false);
        },
        onError: () => {
            toast.error('Failed to upload file');
            setUploading(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (attachmentId) => taskService.deleteAttachment(taskId, attachmentId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-attachments', taskId]);
            toast.success('File deleted');
        },
        onError: () => toast.error('Failed to delete file'),
    });

    const onDrop = (acceptedFiles) => {
        if (!acceptedFiles?.length) return;
        setUploading(true);
        uploadMutation.mutate(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxSize: 10 * 1024 * 1024, // 10MB
        multiple: false,
    });

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    ) : (
                        <Paperclip className="w-8 h-8 text-slate-400" />
                    )}
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {uploading
                            ? 'Uploading file...'
                            : isDragActive
                                ? 'Drop the file here'
                                : 'Click or drag a file here to attach'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Max size: 10MB
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    Attached Files
                    <span className="text-xs font-normal text-slate-500">
                        {attachments?.length || 0} files
                    </span>
                </h4>

                {isLoading ? (
                    <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
                ) : !attachments?.length ? (
                    <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-xl text-center bg-white dark:bg-slate-900">
                        <File className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No attachments yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                        {attachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                                        {getFileIcon(file.type)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        title="Download"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Download size={16} />
                                    </a>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(file.id); }}
                                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        {deleteMutation.variables === file.id && deleteMutation.isPending ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskAttachments;
