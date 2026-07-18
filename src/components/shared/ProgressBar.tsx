import React from 'react';

interface ProgressBarProps {
  progress: number;
  statusText?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  statusText = 'Processing...',
  className = ''
}) => {
  const boundedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className={`w-full max-w-md mx-auto space-y-2 py-4 ${className}`}>
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
        <span>{statusText}</span>
        <span>{boundedProgress}%</span>
      </div>
      
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500 rounded-full transition-all duration-350 ease-out"
          style={{ width: `${boundedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
