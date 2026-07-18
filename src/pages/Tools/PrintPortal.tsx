import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Printer, Trash2, CheckCircle2, DollarSign, FileText, Play, Volume2 } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';

interface PrintJob {
  id: string;
  filename: string;
  size: string;
  pages: number;
  type: 'bw' | 'color';
  duplex: 'single' | 'double';
  copies: number;
  totalCost: number;
  status: 'pending' | 'completed';
  timestamp: string;
  customerName: string;
}

export const PrintPortal: React.FC = () => {

  // Mode: customer submission vs operator dashboard
  const [viewMode, setViewMode] = useState<'customer' | 'operator'>('customer');

  // Customer Form State
  const [customerName, setCustomerName] = useState('John Doe');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pagesCount, setPagesCount] = useState<number>(1);
  const [printType, setPrintType] = useState<'bw' | 'color'>('bw');
  const [duplexMode, setDuplexMode] = useState<'single' | 'double'>('single');
  const [copies, setCopies] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  // Operator state
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [bwRate, setBwRate] = useState<number>(2);
  const [colorRate, setColorRate] = useState<number>(10);
  const [earnings, setEarnings] = useState<number>(0);

  // Sync settings and jobs
  useEffect(() => {
    // Load print rates
    const savedBw = localStorage.getItem('bw_price');
    if (savedBw) setBwRate(parseFloat(savedBw));
    
    const savedColor = localStorage.getItem('color_price');
    if (savedColor) setColorRate(parseFloat(savedColor));

    // Load jobs
    const savedJobs = localStorage.getItem('print_jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    }

    // Load earnings
    const savedEarnings = localStorage.getItem('print_earnings');
    if (savedEarnings) setEarnings(parseFloat(savedEarnings));
  }, [viewMode]);

  // Audio notifier play via AudioContext (no external files needed)
  const playPing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First note
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.3);

      // Second note slightly delayed
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 150);

    } catch (e) {
      console.warn("AudioContext block: ", e);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    setSubmittedJobId(null);

    // Try to inspect PDF page count
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
        setPagesCount(pdfDoc.getPageCount() || 1);
      } catch (err) {
        console.warn("Could not read PDF metadata: ", err);
        setPagesCount(1);
      }
    } else {
      // Standard image files count as 1 page
      setPagesCount(1);
    }
  };

  // Bill calculations
  const singlePageRate = printType === 'bw' ? bwRate : colorRate;
  const costPerCopy = pagesCount * singlePageRate;
  const totalCost = costPerCopy * copies;

  const handleSubmitJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsSubmitting(true);
    setSubmitProgress(10);

    const interval = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setSubmitProgress(100);

      // Create Print Job object
      const jobId = 'PRNT-' + Math.floor(1000 + Math.random() * 9000);
      const newJob: PrintJob = {
        id: jobId,
        filename: selectedFile.name,
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        pages: pagesCount,
        type: printType,
        duplex: duplexMode,
        copies: copies,
        totalCost: totalCost,
        status: 'pending',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        customerName: customerName
      };

      // Save to localStorage list
      const savedJobs = localStorage.getItem('print_jobs');
      const list: PrintJob[] = savedJobs ? JSON.parse(savedJobs) : [];
      list.unshift(newJob);
      localStorage.setItem('print_jobs', JSON.stringify(list));

      // Trigger audio notification
      playPing();

      setSubmittedJobId(jobId);
      setIsSubmitting(false);
      setSelectedFile(null);
    }, 1200);
  };

  // Operator Actions
  const handleMarkCompleted = (idx: number) => {
    const list = [...jobs];
    const target = list[idx];
    if (target.status === 'completed') return;

    target.status = 'completed';
    const newEarnings = earnings + target.totalCost;
    setEarnings(newEarnings);

    localStorage.setItem('print_jobs', JSON.stringify(list));
    localStorage.setItem('print_earnings', newEarnings.toString());
    setJobs(list);
  };

  const handleDeleteJob = (idx: number) => {
    const list = jobs.filter((_, i) => i !== idx);
    localStorage.setItem('print_jobs', JSON.stringify(list));
    setJobs(list);
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all printing history?")) {
      localStorage.removeItem('print_jobs');
      localStorage.removeItem('print_earnings');
      setJobs([]);
      setEarnings(0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="print-portal"
        title="Print Shop Upload Portal"
        description="Instant local file transfer for walk-in print shop customers. Skip registration, scan, and submit files directly."
        category="print"
        categoryName="Print Portal"
      />

      {/* Tabs */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('customer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'customer'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-600 dark:text-slate-350'
            }`}
          >
            Customer Upload screen
          </button>
          <button
            onClick={() => setViewMode('operator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'operator'
                ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-800 shadow-md'
                : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-600 dark:text-slate-350'
            }`}
          >
            <Printer size={13} />
            <span>Operator Print Queue</span>
          </button>
        </div>

        {viewMode === 'operator' && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400">
            <DollarSign size={13} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Today's Revenue: ₹{earnings}
            </span>
          </div>
        )}
      </div>

      {viewMode === 'customer' ? (
        // Customer screen
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Submission panel */}
          <div className="lg:col-span-7 space-y-6">
            
            {submittedJobId && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 text-emerald-800 dark:text-emerald-350 flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-500" />
                <div className="text-xs">
                  <h4 className="font-bold text-sm">File Submitted Successfully!</h4>
                  <p className="mt-1 font-medium">
                    Your Print Job ID is <strong className="text-emerald-600 dark:text-emerald-300">{submittedJobId}</strong>.
                  </p>
                  <p className="mt-2 text-slate-450 dark:text-slate-400 text-[10px] leading-relaxed">
                    Please inform the counter operator of your ID to print your sheets. You can make payments at the counter.
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-5">
                Upload & print details
              </h3>

              <form onSubmit={handleSubmitJob} className="space-y-5 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="space-y-1.5">
                  <label>Your Name / Contact Info</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    placeholder="Enter name (e.g. John Doe)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label>Select Document File (PDF or Image)</label>
                  <FileUpload
                    onFilesSelected={handleFileSelect}
                    accept="application/pdf,image/*"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-850">
                      <FileText size={16} className="text-brand-500 shrink-0" />
                      <div className="truncate grow font-medium">
                        <span className="text-slate-700 dark:text-slate-300 block truncate">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-400">
                          {pagesCount} Page(s) • {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 dark:border-slate-850">
                    <div className="space-y-1.5">
                      <label>Color Mode</label>
                      <select
                        value={printType}
                        onChange={(e) => setPrintType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      >
                        <option value="bw">Black & White (₹{bwRate}/page)</option>
                        <option value="color">Color (₹{colorRate}/page)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label>Duplex Mode</label>
                      <select
                        value={duplexMode}
                        onChange={(e) => setDuplexMode(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      >
                        <option value="single">Single-Sided</option>
                        <option value="double">Double-Sided (Duplex)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label>Copies</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={copies}
                        onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSubmitting && <ProgressBar progress={submitProgress} statusText="Uploading file..." />}

                {selectedFile && !isSubmitting && (
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
                  >
                    <Printer size={15} />
                    <span>Upload & Submit Print Job</span>
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Pricing Estimation Panel */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-5 text-xs font-semibold">
              <h3 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Price Calculator
              </h3>

              <div className="space-y-3.5 text-slate-650 dark:text-slate-350">
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-850">
                  <span>Number of Pages:</span>
                  <span>{pagesCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-850">
                  <span>Page Rate:</span>
                  <span>₹{singlePageRate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-850">
                  <span>Copies:</span>
                  <span>x{copies}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white font-bold">
                  <span className="text-sm">Estimated Total:</span>
                  <span className="text-sm text-brand-600 dark:text-brand-400">₹{totalCost}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 text-[10px] text-slate-400 font-semibold leading-relaxed">
                <Volume2 size={16} className="text-slate-400 shrink-0" />
                <span>Submitting plays an alert chime in the operator terminal!</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        // Operator terminal queue
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-xs font-bold">
            <div className="flex items-center gap-2">
              <Printer className="text-brand-500" />
              <span>Operator Terminal (Active Queue)</span>
            </div>
            <button
              onClick={handleClearAll}
              className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold"
            >
              <Trash2 size={12} />
              <span>Reset Printing Queue</span>
            </button>
          </div>

          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-500 dark:text-slate-400">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850">
                  <tr>
                    <th className="px-5 py-3.5">ID / Time</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">File Details</th>
                    <th className="px-5 py-3.5">Settings</th>
                    <th className="px-5 py-3.5">Total Cost</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  {jobs.length > 0 ? (
                    jobs.map((job, idx) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-700 dark:text-slate-200 block">{job.id}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{job.timestamp}</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-750 dark:text-slate-200">
                          {job.customerName}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-slate-650 dark:text-slate-350 block truncate max-w-xs" title={job.filename}>
                            {job.filename}
                          </span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-450 block mt-0.5">
                            {job.pages} Pages • {job.size}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="uppercase text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {job.type === 'bw' ? 'B&W' : 'Color'}
                          </span>
                          <span className="uppercase text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded ml-1.5">
                            {job.duplex === 'single' ? 'Simplex' : 'Duplex'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">
                            x{job.copies} Copies
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-brand-600 dark:text-brand-400">
                          ₹{job.totalCost}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            job.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2 justify-center">
                            {job.status === 'pending' ? (
                              <button
                                onClick={() => handleMarkCompleted(idx)}
                                className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold text-[10px] flex items-center gap-1.5"
                              >
                                <Play size={10} />
                                <span>Simulate Print</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>Printed</span>
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteJob(idx)}
                              className="p-1 text-slate-350 hover:text-red-500"
                              title="Delete Job"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        Print Queue is currently empty. Open the "Customer Upload" tab and submit a test print job file!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintPortal;
