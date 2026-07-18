import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, Wifi, Contact, MessageSquare, Link2 } from 'lucide-react';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';

export const QrGenerator: React.FC = () => {

  // Tab mode
  const [mode, setMode] = useState<'text' | 'wifi' | 'contact' | 'sms'>('text');

  // Input states
  const [textVal, setTextVal] = useState('https://akprinthub.com');
  
  // Wi-Fi inputs
  const [ssid, setSsid] = useState('My-WiFi-Network');
  const [wifiPassword, setWifiPassword] = useState('password123');
  const [security, setSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');

  // Contact inputs
  const [contactName, setContactName] = useState('Rahul Sharma');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [contactEmail, setContactEmail] = useState('rahul.sharma@email.com');
  const [contactCompany, setContactCompany] = useState('CSC Center Mumbai');
  const [contactAddr, setContactAddr] = useState('Andheri East, Mumbai');

  // SMS inputs
  const [smsPhone, setSmsPhone] = useState('+91 98765 43210');
  const [smsMsg, setSmsMsg] = useState('Hello! I would like to query about your printing services.');

  // Customization Options
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin] = useState<number>(4);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  // Center logo upload
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoObj, setLogoObj] = useState<HTMLImageElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compile QR Data string based on selected mode
  const getQrDataString = (): string => {
    switch (mode) {
      case 'wifi':
        return `WIFI:S:${ssid};T:${security};P:${wifiPassword};;`;
      case 'contact':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${contactName}\nTEL:${contactPhone}\nEMAIL:${contactEmail}\nORG:${contactCompany}\nADR:${contactAddr}\nEND:VCARD`;
      case 'sms':
        return `SMSTO:${smsPhone}:${smsMsg}`;
      case 'text':
      default:
        return textVal;
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoUrl) URL.revokeObjectURL(logoUrl);
    const url = URL.createObjectURL(file);
    setLogoUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setLogoObj(img);
    };
  };

  const clearLogo = () => {
    setLogoUrl(null);
    setLogoObj(null);
  };

  // Re-generate QR Code on canvas
  const generateQr = async () => {
    if (!canvasRef.current) return;

    const dataString = getQrDataString();
    if (!dataString) return;

    try {
      const options: QRCode.QRCodeRenderersOptions = {
        width: 300,
        margin: margin,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: fgColor,
          light: bgColor
        }
      };

      // Draw QR code onto canvas
      await QRCode.toCanvas(canvasRef.current, dataString, options);

      // Draw logo in the center if uploaded
      if (logoObj && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const qrSize = canvas.width;
          const logoSize = qrSize * 0.22; // 22% of QR code size
          const x = (qrSize - logoSize) / 2;
          const y = (qrSize - logoSize) / 2;

          // Draw a background white circle for cushioning the logo
          ctx.save();
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2 + 3, 0, Math.PI * 2);
          ctx.fill();

          // Clip logo into a clean circle or draw square with rounded corners
          ctx.beginPath();
          ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2, 0, Math.PI * 2);
          ctx.clip();

          // Draw logo image
          ctx.drawImage(logoObj, x, y, logoSize, logoSize);
          ctx.restore();
        }
      }
    } catch (err) {
      console.error("QR Code rendering failed: ", err);
    }
  };

  // Auto-generate QR when inputs/settings change
  useEffect(() => {
    generateQr();
  }, [mode, textVal, ssid, wifiPassword, security, contactName, contactPhone, contactEmail, contactCompany, contactAddr, smsPhone, smsMsg, fgColor, bgColor, margin, errorCorrection, logoObj]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    setProgress(30);

    setTimeout(() => {
      setProgress(70);
      const url = canvasRef.current!.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode_${Date.now()}.png`;
      a.click();
      setProgress(100);
      setIsProcessing(false);
    }, 500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="qr-generator"
        title="QR Code Generator"
        description="Create customized QR Codes for websites, Wi-Fi networks, SMS triggers, or vCard contacts with custom branding center-logos."
        category="qr"
        categoryName="QR Code Tools"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column - Editors (5 cols) */}
        <div className="lg:col-span-5 space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12 text-xs font-semibold">
          
          {/* QR Type Selector tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
            {[
              { id: 'text', icon: Link2, label: 'URL / Text' },
              { id: 'wifi', icon: Wifi, label: 'Wi-Fi' },
              { id: 'contact', icon: Contact, label: 'vCard' },
              { id: 'sms', icon: MessageSquare, label: 'SMS' }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id as any)}
                  className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-[9px] font-bold ${
                    mode === tab.id
                      ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-450 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form details cards */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-4 shadow-sm">
            
            {mode === 'text' && (
              <div className="space-y-1.5">
                <label>Website URL or Text</label>
                <textarea
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none leading-relaxed"
                  placeholder="Enter text or URL (e.g. https://google.com)"
                />
              </div>
            )}

            {mode === 'wifi' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label>Network Name (SSID)</label>
                  <input
                    type="text"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label>Network Password</label>
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label>Security Level</label>
                  <select
                    value={security}
                    onChange={(e) => setSecurity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Unsecured (None)</option>
                  </select>
                </div>
              </div>
            )}

            {mode === 'contact' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label>Contact Full Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label>Company / Org</label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Address City</label>
                    <input
                      type="text"
                      value={contactAddr}
                      onChange={(e) => setContactAddr(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'sms' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label>Recipient Phone Number</label>
                  <input
                    type="text"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>SMS Pre-filled Body Message</label>
                  <textarea
                    value={smsMsg}
                    onChange={(e) => setSmsMsg(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Style parameters card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-4 shadow-sm">
            <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Color & Styling Configs
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>Foreground Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-20 px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 uppercase text-[10px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label>Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-20 px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 uppercase text-[10px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>Margin (blocks)</label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  <option value={0}>0 Margin</option>
                  <option value={2}>2 Margins</option>
                  <option value={4}>4 Margins (Default)</option>
                  <option value={6}>6 Margins</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label>Error Correction</label>
                <select
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  <option value="L">Low (7% recovery)</option>
                  <option value="M">Medium (15% recovery)</option>
                  <option value="Q">Quartile (25% recovery)</option>
                  <option value="H">High (30% recovery - Logo safe)</option>
                </select>
              </div>
            </div>

            {/* Logo upload */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label>Embedding Center-Logo (Optional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="grow border-0 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {logoUrl && (
                  <button onClick={clearLogo} className="text-[10px] text-red-500 hover:underline">
                    Clear Logo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column - QR Canvas Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              QR Code Preview
            </h3>
          </div>

          {/* Renders Canvas Frame */}
          <div className="flex-1 rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card p-12 flex flex-col items-center justify-center min-h-[350px] shadow-lg relative">
            <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 select-none">
              <QrCode size={12} />
              <span>LIVE QR CANVAS PREVIEW</span>
            </div>

            {/* Target HTML5 Canvas */}
            <div className="p-4 bg-white rounded-xl shadow-md border border-slate-100 dark:border-slate-850">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>

            <p className="mt-4 text-[10px] text-slate-400 font-semibold max-w-xs text-center leading-relaxed">
              Updating form fields or colors automatically re-renders the QR canvas. Scan to test.
            </p>
          </div>

          {/* Downloads actions card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
            {isProcessing && <ProgressBar progress={progress} statusText="Compiling QR PNG file..." />}

            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
            >
              <Download size={15} />
              <span>Download QR Code Image (PNG)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QrGenerator;
