import React, { useState } from 'react';
import { X, Copy, Check, Share2, Download, ExternalLink, HardDrive } from 'lucide-react';
import { CloudDocument } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CloudDocument | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, document }) => {
  const [copied, setCopied] = useState(false);
  const [cloudService, setCloudService] = useState<'drive' | 'dropbox' | 'onedrive' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const shareUrl = `${window.location.origin}/#vault/${document.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = window.document.createElement('a');
    a.href = document.pdfDataUrl;
    a.download = `${document.title.replace(/\s+/g, '_')}.pdf`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const handleCloudExport = (service: 'drive' | 'dropbox' | 'onedrive') => {
    setCloudService(service);
    setExporting(true);
    setExportSuccess(null);

    // Simulate seamless cloud dispatch with receipt
    setTimeout(() => {
      setExporting(false);
      setExportSuccess(`Successfully synced to ${service.toUpperCase()} Cloud Storage.`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0E1422] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Share & Cloud Integration</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-400">Document Title</p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{document.title}</p>
        </div>

        {/* Share Link box */}
        <div className="mt-4">
          <label className="text-xs text-slate-400">Studio Cloud Vault Direct Link</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-transparent text-xs text-slate-300 font-mono outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 text-xs font-medium transition-colors shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Cloud Storage Connectors */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-300">Seamless Cloud Sync & Dispatch</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronize this studio document directly with external cloud storage drives:
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => handleCloudExport('drive')}
              disabled={exporting}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-800 hover:border-amber-500/40 bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 transition-colors"
            >
              <HardDrive className="h-4 w-4 text-amber-400" />
              <span>Google Drive</span>
            </button>

            <button
              onClick={() => handleCloudExport('dropbox')}
              disabled={exporting}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-800 hover:border-blue-500/40 bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-blue-400" />
              <span>Dropbox</span>
            </button>

            <button
              onClick={() => handleCloudExport('onedrive')}
              disabled={exporting}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-cyan-400" />
              <span>OneDrive</span>
            </button>
          </div>

          {exporting && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-amber-400 border-t-transparent rounded-full" />
              <span>Transmitting document to {cloudService?.toUpperCase()} Vault...</span>
            </div>
          )}

          {exportSuccess && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <Check className="h-3.5 w-3.5" />
              <span>{exportSuccess}</span>
            </div>
          )}
        </div>

        {/* Modal actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800/80">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Local PDF</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
