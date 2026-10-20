import React, { useState, useEffect } from 'react';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidTopBar } from './components/AndroidTopBar';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { ImageToPdfConverter } from './components/ImageToPdfConverter';
import { PdfEditor } from './components/PdfEditor';
import { BatchMerger } from './components/BatchMerger';
import { CloudVault } from './components/CloudVault';
import { HistoryView } from './components/HistoryView';
import { StudioStorageStats, CloudDocument, HistoryRecord } from './types';
import { CloudStorageService } from './services/cloudStorage';
import { HistoryService } from './services/historyService';
import { PdfEngine } from './services/pdfEngine';
import { Plus, Smartphone, Maximize2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'convert' | 'editor' | 'merger' | 'history' | 'vault'>('convert');
  const [editorPdf, setEditorPdf] = useState<{ dataUrl: string; title: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  const [storageStats, setStorageStats] = useState<StudioStorageStats>({
    usedBytes: 0,
    totalBytes: 5 * 1024 * 1024 * 1024,
    documentCount: 0,
    lastSyncedAt: Date.now(),
    cloudHealth: 'healthy',
  });

  // Seed sample studio document & history if empty on initial boot
  useEffect(() => {
    (async () => {
      try {
        const existingDocs = await CloudStorageService.getAllDocuments();
        if (existingDocs.length === 0) {
          // Generate an elegant initial starter document
          const canvas = document.createElement('canvas');
          canvas.width = 1600;
          canvas.height = 2200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#080C14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Crystalline Azure & Gold framing border
            ctx.strokeStyle = '#0284C7';
            ctx.lineWidth = 4;
            ctx.strokeRect(100, 100, canvas.width - 200, canvas.height - 200);

            // Title
            ctx.fillStyle = '#0EA5E9';
            ctx.font = 'bold 72px sans-serif';
            ctx.fillText('THE RISING TRIBE STUDIOS', 180, 300);

            ctx.fillStyle = '#F1F5F9';
            ctx.font = '500 36px sans-serif';
            ctx.fillText('TECHNOLOGY · INNOVATION · COMMUNITY', 180, 380);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '400 24px sans-serif';
            ctx.fillText('Verified Sovereign Document Infrastructure · 2026 Android Edition', 180, 440);

            // Central showcase box
            ctx.fillStyle = '#0C1322';
            ctx.fillRect(180, 540, canvas.width - 360, 900);
            ctx.strokeStyle = '#1E293B';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(180, 540, canvas.width - 360, 900);

            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('STUDIO PROTOCOL SPECIFICATION', 240, 640);

            ctx.fillStyle = '#CBD5E1';
            ctx.font = '400 24px sans-serif';
            const specLines = [
              '1. Seamless Cloud Document Storage with local-first IndexedDB persistence.',
              '2. High-precision vector image compilation with custom margin controls.',
              '3. Multi-page PDF editing with digital signatures, security watermarks, and studio stamps.',
              '4. Chronological history audit trails with instant re-opening and CSV export.',
            ];
            specLines.forEach((line, idx) => {
              ctx.fillText(line, 240, 740 + idx * 70);
            });

            ctx.fillStyle = '#64748B';
            ctx.font = '400 20px monospace';
            ctx.fillText('DOC-ID: TRT-2026-CLOUD-VAULT · VERIFIED APP BUILD', 240, 1360);

            const starterImg = canvas.toDataURL('image/jpeg', 0.95);
            const starterPdf = await PdfEngine.convertImagesToPdf(
              [
                {
                  id: 'starter-1',
                  name: 'Rising_Tribe_Master_Charter',
                  size: 420000,
                  type: 'image/jpeg',
                  dataUrl: starterImg,
                  width: 1600,
                  height: 2200,
                  rotation: 0,
                },
              ],
              {
                pageSize: 'a4',
                orientation: 'portrait',
                margin: 0,
                fitMode: 'contain',
                backgroundColor: '#080C14',
                imageQuality: 0.95,
                addPageNumbers: true,
                pageNumberPosition: 'bottom-center',
                headerTitle: 'The Rising Tribe Studios · Cloud Vault',
                footerText: 'Strictly Confidential · Sovereign Asset',
                compressOutput: false,
              }
            );

            let binary = '';
            const len = starterPdf.pdfBytes.byteLength;
            for (let i = 0; i < len; i++) binary += String.fromCharCode(starterPdf.pdfBytes[i]);
            const pdfDataUrl = `data:application/pdf;base64,${btoa(binary)}`;
            const thumb = await PdfEngine.generateThumbnail(starterPdf.pdfBytes);

            const doc: CloudDocument = {
              id: 'starter-doc-01',
              title: 'The Rising Tribe · Master Charter',
              createdAt: Date.now() - 3600000,
              updatedAt: Date.now() - 3600000,
              pageCount: 1,
              sizeBytes: starterPdf.sizeBytes,
              tags: ['Master Folio', 'Studio', 'Charter'],
              cloudSyncStatus: 'synced',
              thumbnailUrl: thumb,
              pdfDataUrl,
              versions: [
                {
                  version: 1,
                  timestamp: Date.now() - 3600000,
                  note: 'System initialized charter document',
                  sizeBytes: starterPdf.sizeBytes,
                },
              ],
              isStarred: true,
            };

            await CloudStorageService.saveDocument(doc);
          }
        }

        // Seed initial history records if empty
        const historyRecords = await HistoryService.getAllRecords();
        if (historyRecords.length === 0) {
          await HistoryService.addRecord({
            title: 'The Rising Tribe · Master Charter',
            actionType: 'cloud_sync',
            pageCount: 1,
            sizeBytes: 420000,
            details: 'Initial charter synchronized to Studio Cloud Vault',
            status: 'Cloud Synced',
          });

          await HistoryService.addRecord({
            title: 'Urban Studio Folio 2026',
            actionType: 'convert_image_pdf',
            pageCount: 3,
            sizeBytes: 1250000,
            details: 'Compiled 3 high-res images to A4 format',
            status: 'Completed',
          });
        }

        refreshData();
      } catch (err) {
        console.error('Failed to initialize starter document:', err);
      }
    })();
  }, []);

  const refreshData = async () => {
    setIsSyncing(true);
    try {
      const stats = await CloudStorageService.getStorageStats();
      const records = await HistoryService.getAllRecords();
      setStorageStats(stats);
      setHistoryCount(records.length);
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  const handleOpenInEditor = (pdfDataUrl: string, title: string) => {
    setEditorPdf({ dataUrl: pdfDataUrl, title });
    setActiveTab('editor');
  };

  const handleNewProject = () => {
    setEditorPdf(null);
    setActiveTab('convert');
  };

  // App Content Component (Used both in Phone Frame and Full Screen)
  const AppContent = (
    <div className="flex h-full w-full flex-col bg-[#080D17] text-slate-100 overflow-hidden relative select-none">
      {/* Android System Status Bar */}
      <AndroidStatusBar />

      {/* Android Top App Bar */}
      <AndroidTopBar
        storageStats={storageStats}
        isSyncing={isSyncing}
        isPhoneFrameMode={isPhoneFrameMode}
        onToggleFrameMode={() => setIsPhoneFrameMode(!isPhoneFrameMode)}
        onSelectTab={setActiveTab}
      />

      {/* Main Content Area (Scrollable view) */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {activeTab === 'convert' && (
          <ImageToPdfConverter
            onOpenInEditor={handleOpenInEditor}
            onDocumentSavedToCloud={refreshData}
          />
        )}

        {activeTab === 'editor' && (
          <PdfEditor
            initialPdfDataUrl={editorPdf?.dataUrl}
            initialTitle={editorPdf?.title}
            onDocumentSavedToCloud={refreshData}
          />
        )}

        {activeTab === 'merger' && (
          <BatchMerger
            onOpenInEditor={handleOpenInEditor}
            onDocumentSavedToCloud={refreshData}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            onOpenInEditor={handleOpenInEditor}
            onRefreshStats={refreshData}
          />
        )}

        {activeTab === 'vault' && (
          <CloudVault
            onOpenInEditor={handleOpenInEditor}
            onRefreshStats={refreshData}
          />
        )}
      </main>

      {/* Android Floating Action Button (FAB) on Convert or History view */}
      {activeTab === 'convert' && (
        <button
          onClick={handleNewProject}
          title="New Conversion Project"
          className="absolute right-5 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-slate-950 shadow-lg shadow-sky-500/30 transition-transform active:scale-90 hover:scale-105"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </button>
      )}

      {/* Android Material 3 Bottom Navigation Bar */}
      <AndroidBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          refreshData();
        }}
        historyCount={historyCount}
        vaultCount={storageStats.documentCount}
      />
    </div>
  );

  // If Phone Frame Mode is active on desktop screens, wrap inside Pixel 9 Pro device mockup
  if (isPhoneFrameMode) {
    return (
      <div className="min-h-screen w-full bg-[#04070D] flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden relative">
        {/* Ambient Studio Lighting Backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Desktop control bar */}
        <div className="mb-3 hidden sm:flex items-center gap-3 text-xs text-slate-400 z-10">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_vz4sbhvz4sbhvz4s_4b141ba5.png"
              alt="Logo"
              className="h-5 w-5 rounded object-contain"
            />
            <span className="font-semibold text-white">The Rising Tribe · Android App Studio</span>
          </div>
          <span aria-hidden="true">·</span>
          <span>Google Pixel 9 Pro Frame</span>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setIsPhoneFrameMode(false)}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium underline"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Switch to Full Screen</span>
          </button>
        </div>

        {/* Pixel Device Shell */}
        <div className="relative w-full max-w-[420px] h-[860px] max-h-[94vh] rounded-[48px] p-2.5 bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#0B0F19] ring-1 ring-slate-700/60 shadow-[0_25px_65px_-12px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col z-10">
          {/* Inner bezel and screen */}
          <div className="relative w-full h-full rounded-[40px] overflow-hidden flex flex-col bg-[#080D17]">
            {AppContent}
          </div>
        </div>
      </div>
    );
  }

  // Native Full Screen App Mode (Seamless on all devices, completely responsive)
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#080D17]">
      {AppContent}
    </div>
  );
}
