import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  maxSizeMB?: number;
  label?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  maxSizeMB = 50,
  label
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    const validFiles: File[] = [];
    const allowedTypes = accept.split(',').map((t) => t.trim().toLowerCase());

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      // Basic type validation
      const matchesAccept = allowedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type;
        }
        if (type.endsWith('/*')) {
          const mimePrefix = type.replace('/*', '');
          return file.type.startsWith(mimePrefix);
        }
        return file.type === type;
      });

      if (!matchesAccept) {
        setError(`Invalid file type. Only ${accept} files are supported.`);
        return;
      }

      // Size validation
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File size exceeds the ${maxSizeMB}MB limit.`);
        return;
      }

      validFiles.push(file);
      if (!multiple) break; // If single file mode, stop after first
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative ${
          isDragOver
            ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10 scale-[0.99]'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm transition-transform duration-300 hover:scale-110">
            <Upload className="w-6 h-6 text-brand-500" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {label || t('tool.upload')}
            </p>
            <p className="text-[11px] text-slate-400">
              {t('tool.dragdrop')}
            </p>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold px-3 py-1 rounded bg-slate-100 dark:bg-slate-850">
            Max File Size: {maxSizeMB}MB | Formats: {accept.replace(/\./g, '').toUpperCase()}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-800 dark:hover:text-red-200 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
