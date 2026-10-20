import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageToPdfConverter } from './components/ImageToPdfConverter';
import { PdfEditor } from './components/PdfEditor';
import { BatchMerger } from './components/BatchMerger';
import { CloudVault } from './components/CloudVault';
import { StudioStorageStats, CloudDocument } from './types';
import { CloudStorageService } from './services/cloudStorage';
import { PdfEngine } from './services/pdfEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'convert' | 'editor' | 'merger' | 'vault'>('convert');
  const [editorPdf, setEditorPdf] = useState<{ dataUrl: string; title: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [storageStats, setStorageStats] = useState<StudioStorageStats>({
    usedBytes: 0,
    totalBytes: 5 * 1024 * 1024 * 1024,
    documentCount: 0,
    lastSyncedAt: Date.now(),
    cloudHealth: 'healthy',
  });

  // Seed sample studio document if vault is completely empty on initial boot
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
            // Background
            ctx.fillStyle = '#080C14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Gold framing border
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 4;
            ctx.strokeRect(100, 100, canvas.width - 200, canvas.height - 200);

            // Monogram
            ctx.fillStyle = '#F59E0B';
            ctx.font = 'bold 72px sans-serif';
            ctx.fillText('THE RISING TRIBE APP STUDIO', 180, 300);

            ctx.fillStyle = '#F1F5F9';
            ctx.font = '500 36px sans-serif';
            ctx.fillText('PREMIER DIGITAL FOLIO & CLOUD ARCHIVE', 180, 380);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '400 24px sans-serif';
            ctx.fillText('Verified Sovereign Document Infrastructure · 2026 Edition', 180, 440);

            // Central showcase box
            ctx.fillStyle = '#101726';
            ctx.fillRect(180, 540, canvas.width - 360, 900);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(180, 540, canvas.width - 360, 900);

            ctx.fillStyle = '#F59E0B';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('STUDIO PROTOCOL SPECIFICATION', 240, 640);

            ctx.fillStyle = '#CBD5E1';
            ctx.font = '400 24px sans-serif';
            const specLines = [
              '1. Seamless Cloud Document Storage with local-first IndexedDB persistence.',
              '2. High-precision vector image compilation with custom margin controls.',
              '3. Multi-page PDF editing with digital signatures, security watermarks, and studio stamps.',
              '4. Instant cloud dispatch connectors for Google Drive, Dropbox, and Studio Archives.',
            ];
            specLines.forEach((line, idx) => {
              ctx.fillText(line, 240, 740 + idx * 70);
            });

            ctx.fillStyle = '#64748B';
            ctx.font = '400 20px monospace';
            ctx.fillText('DOC-ID: RTS-2026-CLOUD-VAULT · CHECKSUM: VERIFIED', 240, 1360);

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
                headerTitle: 'The Rising Tribe App Studio · Cloud Vault',
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
              title: 'The Rising Tribe App Studio · Master Folio',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              pageCount: 1,
              sizeBytes: starterPdf.sizeBytes,
              tags: ['Master Folio', 'Studio', 'Charter'],
              cloudSyncStatus: 'synced',
              thumbnailUrl: thumb,
              pdfDataUrl,
              versions: [
                {
                  version: 1,
                  timestamp: Date.now(),
                  note: 'System initialized charter document',
                  sizeBytes: starterPdf.sizeBytes,
                },
              ],
              isStarred: true,
            };

            await CloudStorageService.saveDocument(doc);
          }
        }
        refreshStats();
      } catch (err) {
        console.error('Failed to initialize starter document:', err);
      }
    })();
  }, []);

  const refreshStats = async () => {
    setIsSyncing(true);
    try {
      const stats = await CloudStorageService.getStorageStats();
      setStorageStats(stats);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        storageStats={storageStats}
        isSyncing={isSyncing}
        onNewProject={handleNewProject}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'convert' && (
          <ImageToPdfConverter
            onOpenInEditor={handleOpenInEditor}
            onDocumentSavedToCloud={refreshStats}
          />
        )}

        {activeTab === 'editor' && (
          <PdfEditor
            initialPdfDataUrl={editorPdf?.dataUrl}
            initialTitle={editorPdf?.title}
            onDocumentSavedToCloud={refreshStats}
          />
        )}

        {activeTab === 'merger' && (
          <BatchMerger
            onOpenInEditor={handleOpenInEditor}
            onDocumentSavedToCloud={refreshStats}
          />
        )}

        {activeTab === 'vault' && (
          <CloudVault
            onOpenInEditor={handleOpenInEditor}
            onRefreshStats={refreshStats}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060910] py-8 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">The Rising Tribe App Studio</span>
            <span aria-hidden="true">·</span>
            <span>Image to PDF & Cloud Document Vault</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <span>Lossless Vector Compilation</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Telemetry Privacy</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Storage Quota: 5.0 GB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
