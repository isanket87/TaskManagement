import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Search, Trash2, Download, FileText, Image as ImageIcon, Film, Music, File, X, CloudUpload } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import * as fileService from '../services/fileService';
import toast from 'react-hot-toast';
import PageWrapper from '../components/layout/PageWrapper';
import { cn } from '../utils/helpers';
import Avatar from '../components/ui/Avatar';

const fileIcon = (type) => {
    const icons = { image: ImageIcon, video: Film, audio: Music, document: FileText };
    const Icon = icons[type] || File;
    const colors = { 
        image: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400', 
        video: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400', 
        audio: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', 
        document: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', 
        other: 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 dark:text-slate-400' 
    };
    return (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 ${colors[type] || colors.other}`}>
            <Icon size={24} />
        </div>
    );
};

const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

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
            if (previewFile) setPreviewFile(null);
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
    }, [projectId, queryClient]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

    const typeOptions = [
        { id: '', label: 'All Files' },
        { id: 'image', label: 'Images' },
        { id: 'document', label: 'Documents' },
        { id: 'video', label: 'Videos' },
        { id: 'audio', label: 'Audio' },
        { id: 'other', label: 'Other' }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05, duration: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
    };

    return (
        <PageWrapper title="Files">
            <div className="p-6 max-w-7xl mx-auto space-y-8 bg-[#f1f5f9] dark:bg-gray-950 min-h-full">
                {/* Header & Controls */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                                <CloudUpload size={20} className="text-white" />
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Project Assets</h1>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage all attachments, documents, and media for this project.</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="relative group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                placeholder="Search files..."
                                className="pl-11 pr-4 py-3 text-sm font-bold bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[16px] outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white shadow-sm transition-all focus:bg-white dark:focus:bg-slate-900 w-full sm:w-64" 
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Animated Pills Filter */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 flex-wrap items-center bg-white/40 dark:bg-slate-900/20 backdrop-blur-lg p-2 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] max-w-fit">
                    {typeOptions.map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => setTypeFilter(t.id)}
                            className={cn(
                                "relative px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-[14px] transition-all duration-300",
                                typeFilter === t.id ? "text-white shadow-lg shadow-indigo-500/20 relative z-10" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5"
                            )}
                        >
                            {typeFilter === t.id && (
                                <motion.div layoutId="activeFilter" className="absolute inset-0 bg-indigo-600 rounded-[14px] -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                            )}
                            {t.label}
                        </button>
                    ))}
                </motion.div>

                {/* Drag and Drop Zone */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <motion.div 
                        {...getRootProps()} 
                        whileHover={{ scale: 1.01 }}
                        animate={{
                            borderColor: isDragActive ? '#6366f1' : 'rgba(148, 163, 184, 0.3)',
                            backgroundColor: isDragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.4)',
                        }}
                        className="group relative border-2 border-dashed rounded-[32px] px-6 py-12 text-center cursor-pointer transition-colors backdrop-blur-md overflow-hidden dark:bg-slate-900/40"
                    >
                        {/* Glow effect when dragging */}
                        {isDragActive && <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />}
                        
                        <input {...getInputProps()} />
                        <motion.div 
                            animate={{ y: isDragActive ? -10 : 0, scale: isDragActive ? 1.1 : 1 }}
                            className="relative z-10 w-20 h-20 mx-auto rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center mb-4 transition-all"
                        >
                            <Upload size={32} className={cn("transition-colors duration-300", isDragActive ? 'text-indigo-600' : 'text-slate-400')} />
                        </motion.div>
                        <h3 className="relative z-10 text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Drop files to upload</h3>
                        <p className="relative z-10 text-sm text-slate-500 dark:text-slate-400 font-medium">PNG, JPG, PDF, MP4, and more.</p>
                    </motion.div>
                </motion.div>

                {/* Uploading progress sequence */}
                <AnimatePresence>
                    {Object.keys(uploadingFiles).length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                            {Object.entries(uploadingFiles).map(([key, pct]) => (
                                <motion.div layout key={key} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-[20px] border border-indigo-200 dark:border-indigo-500/30 p-4 shadow-lg shadow-indigo-500/5">
                                    <div className="flex items-center justify-between text-sm mb-2 font-bold">
                                        <span className="text-slate-700 dark:text-slate-300 truncate">{key.slice(0, -13)}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">{pct}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-indigo-500 rounded-full" />
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* File grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[4/3] rounded-[24px] bg-white/40 dark:bg-slate-800/40 animate-pulse backdrop-blur-sm" />)}
                    </div>
                ) : files.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 rounded-[32px] bg-slate-50 dark:bg-slate-900 shadow-inner flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 border border-slate-100 dark:border-white/5 transform -rotate-12"><File size={48} /></div>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Vault empty</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Use the drag zone above to add your first asset.</p>
                    </motion.div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 relative z-10">
                        <AnimatePresence>
                            {files.map(file => (
                                <motion.div 
                                    variants={itemVariants}
                                    layout
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={file.id} 
                                    className="group relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-[24px] overflow-hidden hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col h-full"
                                    onClick={() => setPreviewFile(file)}
                                >
                                    {/* Thumbnail / icon */}
                                    <div className="aspect-[4/3] bg-slate-50/50 dark:bg-black/20 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800/50 relative">
                                        <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors z-10" />
                                        {file.type === 'image' && file.thumbnailUrl
                                            ? <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" />
                                            : <div className="transform group-hover:scale-110 transition-transform duration-500 ease-out">{fileIcon(file.type)}</div>}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate" title={file.name}>{file.name}</p>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-2">{formatSize(file.size)}</p>
                                        
                                        <div className="mt-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                            <button onClick={(e) => { e.stopPropagation(); window.open(`/api/files/${file.storageKey}/raw`, '_blank'); }}
                                                className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase text-slate-500 transition-colors flex items-center justify-center gap-1.5"><Download size={12} /> Get</button>
                                            <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(file.id); }}
                                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded-xl text-slate-500 transition-colors flex items-center justify-center shrink-0"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* File preview lightbox */}
                <AnimatePresence>
                    {previewFile && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="fixed inset-0 bg-slate-900/80 backdrop-blur-3xl z-[100] flex items-center justify-center p-4 sm:p-12 overflow-y-auto" 
                            onClick={() => setPreviewFile(null)}
                        >
                            <button className="absolute top-6 right-6 text-white/50 hover:text-white p-3 hover:bg-white/10 rounded-2xl transition-all" onClick={() => setPreviewFile(null)}>
                                <X size={28} />
                            </button>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/20 my-auto" 
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="bg-slate-100/50 dark:bg-black/30 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden relative group">
                                    {previewFile.type === 'image' ? (
                                        <img src={`/api/files/${previewFile.storageKey}/raw`} alt={previewFile.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="p-16 flex flex-col items-center gap-6">
                                            {fileIcon(previewFile.type)}
                                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight text-center">{previewFile.name}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-4">
                                        <Avatar user={previewFile.uploadedBy} size="lg" className="shadow-md" />
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-lg">{previewFile.name}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md">{formatSize(previewFile.size)}</span>
                                                <span className="text-xs font-bold text-slate-500">Uploaded by {previewFile.uploadedBy?.name || 'Unknown'}</span>
                                                <span className="text-xs font-bold text-slate-400">&middot;</span>
                                                <span className="text-xs font-bold text-slate-500">{format(new Date(previewFile.createdAt), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                                        <button onClick={() => deleteMutation.mutate(previewFile.id)} className="p-4 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
                                            <Trash2 size={20} />
                                        </button>
                                        <a href={`/api/files/${previewFile.storageKey}/raw`} download={previewFile.name}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[20px] shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all">
                                            <Download size={16} /> Download
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageWrapper>
    );
};

export default ProjectFilesPage;
