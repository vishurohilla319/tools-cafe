import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Download, Minimize, RefreshCw, FileImage, Sliders } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

export const ImageCompressor: React.FC = () => {
  const { t } = useLanguage();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSizeKb, setOriginalSizeKb] = useState<number>(0);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  // Settings
  const [quality, setQuality] = useState<number>(75);
  const [targetSizeKb, setTargetSizeKb] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  // Outputs
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number>(0);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    
    // Revoke previous URLs
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);

    setOriginalFile(file);
    setOriginalSizeKb(Math.round(file.size / 1024));
    setOriginalUrl(URL.createObjectURL(file));
    
    // Reset outputs
    setCompressedFile(null);
    setCompressedSizeKb(0);
    setCompressedUrl(null);
    setTargetSizeKb('');
  };

  const handleProgress = (progressVal: number) => {
    setProgress(progressVal);
  };

  const compressImage = async () => {
    if (!originalFile) return;

    setIsProcessing(true);
    setProgress(15);

    try {
      // Calculate max size in MB
      let maxSizeMB = originalFile.size / (1024 * 1024); // default to original
      const targetSizeNum = parseFloat(targetSizeKb);
      if (!isNaN(targetSizeNum) && targetSizeNum > 0) {
        maxSizeMB = targetSizeNum / 1024;
      } else {
        // If no target KB is set, reduce based on quality percentage
        maxSizeMB = (originalFile.size * (quality / 100)) / (1024 * 1024);
      }

      // Ensure we don't scale larger than original
      maxSizeMB = Math.min(maxSizeMB, originalFile.size / (1024 * 1024));

      const options = {
        maxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: `image/${outputFormat}`,
        initialQuality: quality / 100,
        onProgress: handleProgress
      };

      setProgress(40);
      const compressedBlob = await imageCompression(originalFile, options);
      
      const fileExtension = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
      const baseName = originalFile.name.replace(/\.[^/.]+$/, "");
      const newFile = new File([compressedBlob], `${baseName}_compressed.${fileExtension}`, {
        type: `image/${outputFormat}`,
        lastModified: Date.now()
      });

      setCompressedFile(newFile);
      setCompressedSizeKb(Math.round(newFile.size / 1024));
      
      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      setCompressedUrl(URL.createObjectURL(newFile));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Compression failed. Please make sure you uploaded a valid image format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTool = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setOriginalFile(null);
    setOriginalUrl(null);
    setCompressedFile(null);
    setCompressedUrl(null);
    setOriginalSizeKb(0);
    setCompressedSizeKb(0);
    setTargetSizeKb('');
  };

  const savingsPercentage = originalSizeKb && compressedSizeKb
    ? Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="compress-image"
        title={t('tool.compressImage.title')}
        description={t('tool.compressImage.desc')}
        category="image"
        categoryName="Image Tools"
      />

      {!originalFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept="image/*"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload Image (JPG, JPEG, PNG, WebP)"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header controls */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Image Compression Workspace
              </h3>
              <button
                onClick={clearTool}
                className="text-[10px] text-slate-400 hover:text-brand-500 font-bold hover:underline"
              >
                Upload Different Image
              </button>
            </div>

            {/* Live side-by-side comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Original Preview */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-4 flex flex-col justify-between shadow-sm">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center relative">
                  {originalUrl && (
                    <img
                      src={originalUrl}
                      alt="Original Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                  <span className="absolute top-2 left-2 bg-slate-900/85 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                    Original
                  </span>
                </div>
                
                <div className="mt-4 flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-450 dark:text-slate-400">File Size:</span>
                  <span className="text-slate-800 dark:text-slate-250 font-bold">
                    {originalSizeKb > 1024
                      ? `${(originalSizeKb / 1024).toFixed(2)} MB`
                      : `${originalSizeKb} KB`}
                  </span>
                </div>
              </div>

              {/* Compressed Preview */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-4 flex flex-col justify-between shadow-sm">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center relative">
                  {compressedUrl ? (
                    <img
                      src={compressedUrl}
                      alt="Compressed Preview"
                      className="max-h-full max-w-full object-contain animate-fade-in"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 flex flex-col items-center justify-center">
                      <FileImage className="w-8 h-8 opacity-40 mb-2" />
                      <span className="text-[10px]">Generate compression to preview</span>
                    </div>
                  )}
                  
                  {compressedUrl && (
                    <span className="absolute top-2 left-2 bg-brand-600 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase shadow-sm">
                      Compressed
                    </span>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-450 dark:text-slate-400">File Size:</span>
                  {compressedSizeKb > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 font-bold">
                        {compressedSizeKb > 1024
                          ? `${(compressedSizeKb / 1024).toFixed(2)} MB`
                          : `${compressedSizeKb} KB`}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[9px]">
                        -{savingsPercentage}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-bold">-- KB</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Configuration sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                <span>Compression Settings</span>
              </h3>

              <div className="space-y-5 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Output format */}
                <div className="space-y-1.5">
                  <label>Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['jpeg', 'png', 'webp'].map((f) => (
                      <button
                        key={f}
                        onClick={() => { setOutputFormat(f as any); setCompressedUrl(null); }}
                        className={`py-1.5 rounded-lg border text-center font-bold text-[10px] uppercase ${
                          outputFormat === f
                            ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {f === 'jpeg' ? 'JPG' : f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label>Quality</label>
                    <span className="font-bold text-brand-600">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => { setQuality(parseInt(e.target.value)); setCompressedUrl(null); }}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Smaller Size</span>
                    <span>Better Quality</span>
                  </div>
                </div>

                {/* Target size in KB */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label>Target Size (Optional)</label>
                    <span className="text-[10px] text-slate-400">Limit: {originalSizeKb} KB</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={targetSizeKb}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (parseFloat(val) <= originalSizeKb && parseFloat(val) >= 0)) {
                          setTargetSizeKb(val);
                          setCompressedUrl(null);
                        }
                      }}
                      className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">
                      KB
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress and actions */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
                {isProcessing && <ProgressBar progress={progress} statusText="Compressing Image..." />}

                {compressedUrl ? (
                  <div className="space-y-2">
                    <a
                      href={compressedUrl}
                      download={compressedFile?.name}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={15} />
                      <span>Download Image</span>
                    </a>
                    
                    <button
                      onClick={compressImage}
                      className="w-full py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw size={13} />
                      <span>Compress Again</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={compressImage}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                  >
                    <Minimize size={14} />
                    <span>Compress Image</span>
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ImageCompressor;
