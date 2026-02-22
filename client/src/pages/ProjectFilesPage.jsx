import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Search, Trash2, Download, FileText, Image, Film, Music, File, X, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import * as fileService from '../services/fileService';
import toast from 'react-hot-toast';

const fileIcon = (type) => {
    const icons = { image: Image, video: Film, audio: Music, document: FileText };
    const Icon = icons[type] || File;
    const colors = { image: 'text-purple-500', video: 'text-red-500', audio: 'text-green-500', document: 'text-blue-500', other: 'text-gray-500' };
    return <Icon size={24} className={colors[type] || colors.other} />;
};

const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const uploadProgress = {};

const ProjectFilesPage = () => {
    const { id: projectId } = useParams();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [uploadingFiles, setUploadingFiles] = useState({});
    const [previewFile, setPreviewFile] = useState(null);

    const { data: files = [], isLoading } = useQuery({
        queryKey: ['project-files', projectId, search, typeFilter],
        queryFn: async () => {
            const res = await fileService.getProjectFiles(projectId, { q: search, type: typeFilter });
            return res.data.data.files;
        },
        keepPreviousData: true,
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => fileService.deleteFile(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['project-files', projectId]);
            toast.success('File deleted');
        },
    });

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            const key = file.name + Date.now();
            setUploadingFiles(prev => ({ ...prev, [key]: 0 }));
            try {
                await fileService.uploadFile(file, null, projectId, (e) => {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setUploadingFiles(prev => ({ ...prev, [key]: pct }));
                });
                queryClient.invalidateQueries(['project-files', projectId]);
                toast.success(`${file.name} uploaded`);
            } catch { toast.error(`Failed to upload ${file.name}`); }
            setUploadingFiles(prev => { const n = { ...prev }; delete n[key]; return n; });
        }
    }, [projectId]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

    const typeOptions = ['', 'image', 'document', 'video', 'audio', 'other'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Files</h2>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
                            className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white" />
                    </div>
                    {/* Type filter */}
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 outline-none">
                        {typeOptions.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
                    </select>
                </div>
            </div>

            {/* Upload zone */}
            <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl px-6 py-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'}`}>
                <input {...getInputProps()} />
                <Upload size={32} className={`mx-auto mb-2 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">{isDragActive ? 'Drop files here…' : 'Drag & drop files here, or click to select'}</p>
            </div>

            {/* Uploading progress */}
            {Object.entries(uploadingFiles).map(([key, pct]) => (
                <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-primary-200 p-3">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-700 dark:text-gray-300 truncate">{key.slice(0, -13)}</span>
                        <span className="text-primary-600 font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            ))}

            {/* File grid */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-400">Loading…</div>
            ) : files.length === 0 ? (
                <div className="text-center py-12">
                    <File size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No files yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {files.map(file => (
                        <div key={file.id} className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setPreviewFile(file)}>
                            {/* Thumbnail / icon */}
                            <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                                {file.type === 'image' && file.thumbnailUrl
                                    ? <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
                                    : <div className="p-6">{fileIcon(file.type)}</div>}
                            </div>
                            <div className="p-3">
                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate" title={file.name}>{file.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={`/api/files/${file.storageKey}/raw`} download={file.name} onClick={e => e.stopPropagation()}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><Download size={13} /></a>
                                    <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(file.id); }}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"><Trash2 size={13} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* File preview lightbox */}
            {previewFile && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
                    <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-lg" onClick={() => setPreviewFile(null)}><X size={24} /></button>
                    <div className="max-w-3xl w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        {previewFile.type === 'image' ? (
                            <img src={`/api/files/${previewFile.storageKey}/raw`} alt={previewFile.name} className="w-full max-h-[60vh] object-contain bg-gray-100" />
                        ) : (
                            <div className="p-12 flex flex-col items-center gap-4">
                                {fileIcon(previewFile.type)}
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{previewFile.name}</p>
                            </div>
                        )}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{previewFile.name}</p>
                                <p className="text-sm text-gray-500">{formatSize(previewFile.size)} · Uploaded by {previewFile.uploadedBy?.name} · {format(new Date(previewFile.createdAt), 'MMM d, yyyy')}</p>
                            </div>
                            <a href={`/api/files/${previewFile.storageKey}/raw`} download={previewFile.name}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700">
                                <Download size={16} /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectFilesPage;
