import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Image, File, Trash2, Loader2, Paperclip } from 'lucide-react';
import { uploadAttachment, deleteAttachment } from '../../services/attachmentService';
import toast from 'react-hot-toast';

const FILE_ICONS = {
    'image/': Image,
    'application/pdf': FileText,
    'text/': FileText,
    default: File,
};

const getFileIcon = (type = '') => {
    for (const [prefix, Icon] of Object.entries(FILE_ICONS)) {
        if (type.startsWith(prefix) || type === prefix) return Icon;
    }
    return FILE_ICONS.default;
};

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentPanel = ({ taskId, attachments = [], onAttachmentsChange }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const inputRef = useRef(null);

    const handleUpload = useCallback(async (file) => {
        if (!file) return;
        const MAX = 10 * 1024 * 1024;
        if (file.size > MAX) return toast.error('File must be under 10MB');

        setUploading(true);
        setUploadProgress(0);
        try {
            const res = await uploadAttachment(taskId, file, (e) => {
                setUploadProgress(Math.round((e.loaded * 100) / e.total));
            });
            toast.success('File uploaded!');
            onAttachmentsChange?.([res.data.data.attachment, ...attachments]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (inputRef.current) inputRef.current.value = '';
        }
    }, [taskId, attachments, onAttachmentsChange]);

    const handleDelete = async (attachment) => {
        setDeleting(attachment.id);
        try {
            await deleteAttachment(taskId, attachment.id);
            toast.success('Attachment deleted');
            onAttachmentsChange?.(attachments.filter(a => a.id !== attachment.id));
        } catch {
            toast.error('Delete failed');
        } finally {
            setDeleting(null);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments
                    {attachments.length > 0 && (
                        <span className="text-xs font-normal text-gray-400">({attachments.length})</span>
                    )}
                </h4>
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                    <Upload className="w-3.5 h-3.5" /> Upload
                </button>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !uploading && inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${dragging
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                    onChange={(e) => handleUpload(e.target.files[0])}
                />

                {uploading ? (
                    <div className="space-y-2">
                        <Loader2 className="w-6 h-6 mx-auto text-primary-500 animate-spin" />
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                                className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">{uploadProgress}% uploaded</p>
                    </div>
                ) : (
                    <>
                        <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Drop a file here or <span className="text-primary-600 font-medium">browse</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Max 10MB</p>
                    </>
                )}
            </div>

            {/* Attachment list */}
            <AnimatePresence initial={false}>
                {attachments.map((att) => {
                    const Icon = getFileIcon(att.type);
                    return (
                        <motion.div
                            key={att.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900 group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 truncate block"
                                >
                                    {att.name}
                                </a>
                                <p className="text-xs text-gray-400">{att.type?.split('/')[1]?.toUpperCase()}</p>
                            </div>
                            <button
                                onClick={() => handleDelete(att)}
                                disabled={deleting === att.id}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                            >
                                {deleting === att.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                }
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {attachments.length === 0 && !uploading && (
                <p className="text-xs text-gray-400 text-center py-1">No attachments yet</p>
            )}
        </div>
    );
};

export default AttachmentPanel;
