import React, { useState, useEffect } from 'react';
import { Download, Maximize, RefreshCw, FileImage, Sliders, Lock, Unlock, ArrowRight, Check } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import { useLanguage } from '../../context/LanguageContext';

export const ImageResizer: React.FC = () => {
  const { t } = useLanguage();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [originalSizeKb, setOriginalSizeKb] = useState<number>(0);

  // Resize Settings
  const [resizeMode, setResizeMode] = useState<'pixels' | 'percentage'>('pixels');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [percentage, setPercentage] = useState<number>(50);

  // Output Settings
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [quality, setQuality] = useState<number>(85);

  // States for preview & processing
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [resizedSizeKb, setResizedSizeKb] = useState<number>(0);

  // File selection handler
  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

    // Clean up old URLs
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);

    const url = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalSizeKb(Math.round(file.size / 1024));
    setOriginalUrl(url);

    // Reset output
    setResizedBlob(null);
    setResizedUrl(null);
    setResizedSizeKb(0);

    // Read image dimensions
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setWidth(img.width);
      setHeight(img.height);
      setAspectRatio(img.width / img.height);
      setPercentage(100);
    };
  };

  // Keep dimensions in sync when percentage changes
  useEffect(() => {
    if (!originalFile || resizeMode !== 'percentage' || imageDimensions.width === 0) return;
    const factor = percentage / 100;
    const newWidth = Math.round(imageDimensions.width * factor);
    const newHeight = Math.round(imageDimensions.height * factor);
    setWidth(newWidth);
    setHeight(newHeight);
  }, [percentage, resizeMode, imageDimensions]);

  // Width changed manually
  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio && aspectRatio > 0) {
      setHeight(Math.round(val / aspectRatio));
    }
  };

  // Height changed manually
  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio && aspectRatio > 0) {
      setWidth(Math.round(val * aspectRatio));
    }
  };

  // Trigger local resizing
  const triggerResize = async () => {
    if (!originalUrl || width <= 0 || height <= 0) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = originalUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Use better scaling quality if available
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = `image/${outputFormat}`;
      const qualityFactor = outputFormat === 'png' ? undefined : quality / 100;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            if (resizedUrl) URL.revokeObjectURL(resizedUrl);
            setResizedBlob(blob);
            setResizedUrl(URL.createObjectURL(blob));
            setResizedSizeKb(Math.round(blob.size / 1024));
          }
          setIsProcessing(false);
        },
        mimeType,
        qualityFactor
      );
    } catch (err) {
      console.error('Error resizing image:', err);
      alert('Failed to resize image. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resizedBlob || !originalFile) return;
    const link = document.createElement('a');
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const baseName = originalFile.name.replace(/\.[^/.]+$/, "");
    link.href = URL.createObjectURL(resizedBlob);
    link.download = `${baseName}_resized_${width}x${height}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearTool = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    setOriginalFile(null);
    setOriginalUrl(null);
    setImageDimensions({ width: 0, height: 0 });
    setWidth(0);
    setHeight(0);
    setResizedBlob(null);
    setResizedUrl(null);
    setResizedSizeKb(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="image-resize"
        title={t('tool.imageResize.title')}
        description={t('tool.imageResize.desc')}
        category="image"
        categoryName="Image Tools"
      />

      {!originalFile ? (
        <div className="mt-8 max-w-2xl mx-auto">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            maxSizeMB={25}
            label="Upload an image to resize"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Visual Preview Panel */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Preview Pane
              </span>
              <button
                onClick={clearTool}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Upload New
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 min-h-[350px] relative overflow-hidden select-none">
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/70 z-20 flex flex-col items-center justify-center text-white p-4 text-center">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold">Resizing in progress...</p>
                </div>
              )}

              {resizedUrl ? (
                <div className="flex flex-col items-center space-y-4 max-w-full">
                  <img
                    src={resizedUrl}
                    alt="Resized preview"
                    className="max-h-[380px] object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                  />
                  <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold flex items-center gap-1.5">
                    <Check size={14} />
                    Resized successfully! {width} × {height} ({resizedSizeKb} KB)
                  </div>
                </div>
              ) : (
                originalUrl && (
                  <div className="flex flex-col items-center space-y-4 max-w-full">
                    <img
                      src={originalUrl}
                      alt="Original preview"
                      className="max-h-[380px] object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                    />
                    <div className="px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold">
                      Original: {imageDimensions.width} × {imageDimensions.height} ({originalSizeKb} KB)
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Column: Control Settings Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Info Card */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileImage size={16} className="text-brand-500" />
                Image Information
              </h3>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">
                    Original Resolution
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">
                    Original File Size
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {originalSizeKb >= 1024
                      ? `${(originalSizeKb / 1024).toFixed(2)} MB`
                      : `${originalSizeKb} KB`}
                  </span>
                </div>
              </div>
            </div>

            {/* Resize Settings Panel */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                Resize Settings
              </h3>

              {/* Mode Tabs */}
              <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-850">
                <button
                  type="button"
                  onClick={() => setResizeMode('pixels')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                    resizeMode === 'pixels'
                      ? 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  By Pixels
                </button>
                <button
                  type="button"
                  onClick={() => setResizeMode('percentage')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                    resizeMode === 'percentage'
                      ? 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  By Percentage
                </button>
              </div>

              {resizeMode === 'pixels' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={width || ''}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:border-brand-500 outline-none hover:border-slate-300 dark:hover:border-slate-700"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLockRatio(!lockRatio);
                        if (!lockRatio && aspectRatio > 0) {
                          setHeight(Math.round(width / aspectRatio));
                        }
                      }}
                      className={`p-2.5 mt-5 rounded-lg border ${
                        lockRatio
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-slate-200 dark:border-slate-850 text-slate-400'
                      }`}
                      title={lockRatio ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
                    >
                      {lockRatio ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>

                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={height || ''}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:border-brand-500 outline-none hover:border-slate-300 dark:hover:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Presets */}
                  <div className="flex gap-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPercentage(pct)}
                        className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                          percentage === pct
                            ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                            : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  {/* Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Scale Ratio
                      </label>
                      <span className="text-xs font-bold text-brand-500">{percentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={percentage}
                      onChange={(e) => setPercentage(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Output Format Settings */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100">
                Output Format
              </h3>

              {/* Format selection */}
              <div className="flex gap-2">
                {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      setOutputFormat(fmt);
                      setResizedUrl(null);
                      setResizedBlob(null);
                    }}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg border transition-colors uppercase ${
                      outputFormat === fmt
                        ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                        : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                ))}
              </div>

              {/* Quality Slider for JPG / WebP */}
              {outputFormat !== 'png' && (
                <div className="space-y-1.5 pt-2">
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
                    onChange={(e) => {
                      setQuality(parseInt(e.target.value));
                      setResizedUrl(null);
                      setResizedBlob(null);
                    }}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Resize & Download Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={triggerResize}
                disabled={isProcessing}
                className="w-full py-3 bg-brand-500 hover:bg-brand-650 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Maximize size={14} />
                Resize & Process
              </button>

              {resizedBlob && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} />
                  Download Resized Image
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

export default ImageResizer;
