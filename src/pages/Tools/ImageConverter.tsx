import React, { useState, useEffect } from 'react';
import { Download, Sliders, Check, AlertCircle, ArrowRight, FolderArchive, Trash2, Play } from 'lucide-react';
import JSZip from 'jszip';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import { useLanguage } from '../../context/LanguageContext';

interface ImageConverterProps {
  defaultFrom: 'jpeg' | 'png' | 'webp';
  defaultTo: 'jpeg' | 'png' | 'webp';
}

interface ConversionFile {
  id: string;
  file: File;
  originalSizeKb: number;
  originalUrl: string;
  convertedBlob: Blob | null;
  convertedUrl: string | null;
  convertedSizeKb: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMsg?: string;
}

export const ImageConverter: React.FC<ImageConverterProps> = ({ defaultFrom, defaultTo }) => {
  const { t } = useLanguage();
  const [filesList, setFilesList] = useState<ConversionFile[]>([]);
  const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp'>(defaultTo);
  const [quality, setQuality] = useState<number>(85);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);

  // Derive page headers dynamically based on defaultFrom/defaultTo
  const getToolMetadata = () => {
    const fromStr = defaultFrom === 'jpeg' ? 'JPG' : defaultFrom.toUpperCase();
    const toStr = defaultTo === 'jpeg' ? 'JPG' : defaultTo.toUpperCase();
    
    let titleKey = 'tool.jpgToPng.title';
    let descKey = 'tool.jpgToPng.desc';

    if (defaultFrom === 'jpeg' && defaultTo === 'png') {
      titleKey = 'tool.jpgToPng.title';
      descKey = 'tool.jpgToPng.desc';
    } else if (defaultFrom === 'png' && defaultTo === 'jpeg') {
      titleKey = 'tool.pngToJpg.title';
      descKey = 'tool.pngToJpg.desc';
    } else if (defaultFrom === 'webp' && defaultTo === 'jpeg') {
      titleKey = 'tool.webpToJpg.title';
      descKey = 'tool.webpToJpg.desc';
    } else if (defaultFrom === 'jpeg' && defaultTo === 'webp') {
      titleKey = 'tool.jpgToWebp.title';
      descKey = 'tool.jpgToWebp.desc';
    }

    return {
      toolId: `${defaultFrom}-to-${defaultTo}`,
      title: t(titleKey),
      description: t(descKey),
      fromLabel: fromStr,
      toLabel: toStr
    };
  };

  const metadata = getToolMetadata();

  // Reset tool when defaults change (navigating to different converter)
  useEffect(() => {
    clearTool();
    setTargetFormat(defaultTo);
  }, [defaultFrom, defaultTo]);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles: ConversionFile[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      originalSizeKb: Math.round(file.size / 1024),
      originalUrl: URL.createObjectURL(file),
      convertedBlob: null,
      convertedUrl: null,
      convertedSizeKb: 0,
      status: 'pending'
    }));

    setFilesList((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFilesList((prev) => {
      const fileToCancel = prev.find((f) => f.id === id);
      if (fileToCancel) {
        URL.revokeObjectURL(fileToCancel.originalUrl);
        if (fileToCancel.convertedUrl) URL.revokeObjectURL(fileToCancel.convertedUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const convertSingleFile = async (cf: ConversionFile, format: 'jpeg' | 'png' | 'webp', qual: number): Promise<ConversionFile> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = cf.originalUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            ...cf,
            status: 'error',
            errorMsg: 'Could not get canvas context'
          });
          return;
        }

        ctx.drawImage(img, 0, 0);

        const mimeType = `image/${format}`;
        const qualityFactor = format === 'png' ? undefined : qual / 100;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              if (cf.convertedUrl) URL.revokeObjectURL(cf.convertedUrl);
              const url = URL.createObjectURL(blob);
              resolve({
                ...cf,
                convertedBlob: blob,
                convertedUrl: url,
                convertedSizeKb: Math.round(blob.size / 1024),
                status: 'success'
              });
            } else {
              resolve({
                ...cf,
                status: 'error',
                errorMsg: 'Blob creation failed'
              });
            }
          },
          mimeType,
          qualityFactor
        );
      };
      img.onerror = () => {
        resolve({
          ...cf,
          status: 'error',
          errorMsg: 'Failed to load image file'
        });
      };
    });
  };

  const handleConvertAll = async () => {
    if (filesList.length === 0) return;
    setIsProcessingAll(true);

    const updatedList = [...filesList];

    for (let i = 0; i < updatedList.length; i++) {
      const cf = updatedList[i];
      if (cf.status === 'success') continue;

      setFilesList((prev) =>
        prev.map((item) => (item.id === cf.id ? { ...item, status: 'processing' } : item))
      );

      const result = await convertSingleFile(cf, targetFormat, quality);
      
      setFilesList((prev) =>
        prev.map((item) => (item.id === cf.id ? result : item))
      );
      updatedList[i] = result;
    }

    setIsProcessingAll(false);
  };

  const downloadSingleFile = (cf: ConversionFile) => {
    if (!cf.convertedBlob) return;
    const link = document.createElement('a');
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const baseName = cf.file.name.replace(/\.[^/.]+$/, "");
    link.href = URL.createObjectURL(cf.convertedBlob);
    link.download = `${baseName}_converted.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadZip = async () => {
    const successFiles = filesList.filter((f) => f.convertedBlob !== null);
    if (successFiles.length === 0) return;

    const zip = new JSZip();
    successFiles.forEach((cf) => {
      if (cf.convertedBlob) {
        const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
        const baseName = cf.file.name.replace(/\.[^/.]+$/, "");
        zip.file(`${baseName}_converted.${ext}`, cf.convertedBlob);
      }
    });

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `tools_cafe_converted_${targetFormat}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Could not generate ZIP file.');
    }
  };

  const clearTool = () => {
    filesList.forEach((f) => {
      URL.revokeObjectURL(f.originalUrl);
      if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
    });
    setFilesList([]);
  };

  const successCount = filesList.filter((f) => f.status === 'success').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId={metadata.toolId}
        title={metadata.title}
        description={metadata.description}
        category="image"
        categoryName="Image Tools"
      />

      {filesList.length === 0 ? (
        <div className="mt-8 max-w-2xl mx-auto">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            multiple={true}
            maxSizeMB={20}
            label={`Upload ${metadata.fromLabel} images to convert`}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Files Queue */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Conversion Queue ({filesList.length} files)
              </span>
              <button
                onClick={clearTool}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Clear All
              </button>
            </div>

            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[480px] overflow-y-auto">
                {filesList.map((cf) => (
                  <div key={cf.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        <img
                          src={cf.originalUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {cf.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {cf.originalSizeKb} KB
                          {cf.status === 'success' && (
                            <span className="text-green-500 dark:text-green-400 ml-2">
                              → {cf.convertedSizeKb} KB ({Math.round(((cf.originalSizeKb - cf.convertedSizeKb) / cf.originalSizeKb) * 100)}% saved)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-3">
                      {cf.status === 'pending' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Pending
                        </span>
                      )}
                      {cf.status === 'processing' && (
                        <div className="flex items-center gap-1.5 text-xs text-brand-500">
                          <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[9px] font-bold">Converting</span>
                        </div>
                      )}
                      {cf.status === 'success' && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 flex items-center gap-0.5">
                            <Check size={10} />
                            Ready
                          </span>
                          <button
                            onClick={() => downloadSingleFile(cf)}
                            className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg transition-colors cursor-pointer"
                            title="Download Converted File"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      )}
                      {cf.status === 'error' && (
                        <span
                          className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-0.5"
                          title={cf.errorMsg}
                        >
                          <AlertCircle size={10} />
                          Error
                        </span>
                      )}

                      <button
                        onClick={() => removeFile(cf.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Remove File"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFilesSelected(Array.from(files));
                  };
                  input.click();
                }}
                className="text-xs font-bold text-brand-500 hover:underline"
              >
                + Add More Files
              </button>
            </div>
          </div>

          {/* Right Column: Settings Panel */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                Converter Settings
              </h3>

              {/* Format selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Target Format
                </label>
                <div className="flex gap-2">
                  {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetFormat(fmt)}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg border transition-colors uppercase ${
                        targetFormat === fmt
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      {fmt === 'jpeg' ? 'JPG' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Settings */}
              {targetFormat !== 'png' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Quality Settings
                    </label>
                    <span className="text-xs font-bold text-brand-500">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConvertAll}
                disabled={isProcessingAll || filesList.length === 0}
                className="w-full py-3 bg-brand-500 hover:bg-brand-650 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play size={14} />
                Convert Files
              </button>

              {successCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderArchive size={14} />
                  Download Converted ZIP ({successCount} files)
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageConverter;
