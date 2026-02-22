import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Download, FileSpreadsheet, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Papa from 'papaparse';
import { cn } from '../../utils/helpers';

const ImportCsvModal = ({ isOpen, onClose, onImport, isImporting }) => {
    const [file, setFile] = useState(null);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1
    });

    const handleDownloadTemplate = () => {
        const dummyData = [{
            Title: 'Example Task',
            Description: 'This is an imported task description',
            Status: 'todo',
            Priority: 'high',
            DueDate: new Date().toISOString().split('T')[0]
        }];
        const csv = Papa.unparse(dummyData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'task-import-template.csv';
        link.click();
    };

    const handleImport = () => {
        if (file) {
            onImport(file);
        }
    };

    // Reset file when modal closes
    const handleClose = () => {
        setFile(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Tasks from CSV" size="lg">
            <div className="space-y-6">
                {/* Information and Template */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">Import Configuration</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                        To ensure a smooth import, please format your CSV file with the following column headers: <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium text-pink-600 dark:text-pink-400">Title</code>, <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium text-pink-600 dark:text-pink-400">Description</code>, <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium text-pink-600 dark:text-pink-400">Status</code>, <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium text-pink-600 dark:text-pink-400">Priority</code>, and <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium text-pink-600 dark:text-pink-400">DueDate</code>.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="w-full sm:w-auto bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors shadow-sm">
                        <Download className="w-4 h-4 mr-2 text-indigo-500" />
                        Download Demo Template
                    </Button>
                </div>

                {/* Upload Area */}
                <div>
                    {!file ? (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                                isDragActive
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.02]"
                                    : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <input {...getInputProps()} />
                            <div className={cn(
                                "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                                isDragActive ? "bg-indigo-200 dark:bg-indigo-900/50" : "bg-indigo-100 dark:bg-indigo-900/30"
                            )}>
                                <UploadCloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                {isDragActive ? "Drop CSV here..." : "Upload your CSV file"}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Drag and drop your file here, or click to browse
                            </p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between bg-white dark:bg-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                title="Remove file"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file}
                        isLoading={isImporting}
                    >
                        Import Data
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ImportCsvModal;
