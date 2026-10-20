import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Type,
  PenTool,
  Award,
  Stamp,
  Highlighter,
  EyeOff,
  RotateCw,
  Trash2,
  Copy,
  Download,
  Cloud,
  Share2,
  FileText,
  Sparkles,
  Check,
  Move,
  Layers,
  ShieldAlert,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  AnnotationItem,
  WatermarkSettings,
  CloudDocument,
} from '../types';
import { PdfEngine } from '../services/pdfEngine';
import { CloudStorageService } from '../services/cloudStorage';
import { SignatureModal } from './SignatureModal';
import { ShareModal } from './ShareModal';

interface PdfEditorProps {
  initialPdfDataUrl?: string;
  initialTitle?: string;
  onDocumentSavedToCloud: () => void;
}

export const PdfEditor: React.FC<PdfEditorProps> = ({
  initialPdfDataUrl,
  initialTitle,
  onDocumentSavedToCloud,
}) => {
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(initialPdfDataUrl || null);
  const [documentTitle, setDocumentTitle] = useState<string>(initialTitle || 'Studio_Document');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoomScale, setZoomScale] = useState(1.1);

  // Tools state
  type EditorTool = 'select' | 'text' | 'signature' | 'stamp' | 'watermark' | 'highlight' | 'redact';
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Annotations list
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Watermark state
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    text: 'CONFIDENTIAL',
    color: '#94A3B8',
    opacity: 0.2,
    fontSize: 48,
    rotation: -45,
    applyToAllPages: true,
  });
  const [showWatermarkDrawer, setShowWatermarkDrawer] = useState(false);

  // Page rotations & custom order
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [pageOrder, setPageOrder] = useState<number[]>([]);

  // Modals
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareDocumentRecord, setShareDocumentRecord] = useState<CloudDocument | null>(null);

  // Status & processing
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text inline input modal
  const [textInputVal, setTextInputVal] = useState('Official Note');
  const [textColor, setTextColor] = useState('#0F172A');
  const [textSize, setTextSize] = useState(14);

  // Update when prop changes
  useEffect(() => {
    if (initialPdfDataUrl) {
      setPdfDataUrl(initialPdfDataUrl);
      if (initialTitle) setDocumentTitle(initialTitle);
      setCurrentPage(1);
      setAnnotations([]);
    }
  }, [initialPdfDataUrl, initialTitle]);

  // Load and inspect PDF info when pdfDataUrl changes
  useEffect(() => {
    if (!pdfDataUrl) return;

    let isMounted = true;
    (async () => {
      try {
        const info = await PdfEngine.getPdfInfo(pdfDataUrl);
        if (isMounted) {
          setPageCount(info.pageCount);
          setPageOrder(Array.from({ length: info.pageCount }, (_, i) => i));
        }
      } catch (err) {
        console.error('Failed to get PDF info:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [pdfDataUrl]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDataUrl || !canvasRef.current) return;

    let isMounted = true;
    setIsRendering(true);

    const targetOriginalPageIndex = pageOrder.length > 0 ? pageOrder[currentPage - 1] + 1 : currentPage;

    PdfEngine.renderPageToCanvas(pdfDataUrl, targetOriginalPageIndex, canvasRef.current, zoomScale)
      .then((res) => {
        if (isMounted) {
          setIsRendering(false);
        }
      })
      .catch((err) => {
        console.error('Failed to render PDF page onto canvas:', err);
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pdfDataUrl, currentPage, zoomScale, pageOrder]);

  // Handle local PDF upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setPdfDataUrl(dataUrl);
      setDocumentTitle(file.name.replace(/\.pdf$/i, ''));
      setCurrentPage(1);
      setAnnotations([]);
      setPageRotations({});
      setPageOrder([]);
    };
    reader.readAsDataURL(file);
  };

  // Click on canvas to drop annotation
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const pageIdx = currentPage - 1;

    if (activeTool === 'text') {
      const newAnn: AnnotationItem = {
        id: `ann-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'text',
        x: xPct,
        y: yPct,
        width: 30,
        height: 6,
        text: textInputVal || 'Studio Note',
        fontSize: textSize,
        color: textColor,
        backgroundColor: '#FFFFFF',
        opacity: 1,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnId(newAnn.id);
      setActiveTool('select');
    } else if (activeTool === 'highlight') {
      const newAnn: AnnotationItem = {
        id: `ann-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'highlight',
        x: xPct,
        y: yPct,
        width: 25,
        height: 4,
        color: '#FACC15',
        opacity: 0.4,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnId(newAnn.id);
      setActiveTool('select');
    } else if (activeTool === 'redact') {
      const newAnn: AnnotationItem = {
        id: `ann-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'redact',
        x: xPct,
        y: yPct,
        width: 28,
        height: 5,
        color: '#0A0F1D',
        opacity: 1.0,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnId(newAnn.id);
      setActiveTool('select');
    }
  };

  // Add signature
  const handleAddSignature = (sigDataUrl: string) => {
    const pageIdx = currentPage - 1;
    const newAnn: AnnotationItem = {
      id: `sig-${Date.now()}`,
      pageIndex: pageIdx,
      type: 'signature',
      x: 35,
      y: 65,
      width: 28,
      height: 12,
      imageDataUrl: sigDataUrl,
      opacity: 1.0,
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnId(newAnn.id);
    setActiveTool('select');
  };

  // Add studio stamp
  const handleAddStamp = (stampText: string, stampColor: string) => {
    // Generate a sleek vector stamp canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;

    // Border
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Inner subtle border
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    // Stamp text
    ctx.fillStyle = stampColor;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stampText, canvas.width / 2, 70);

    ctx.font = '500 14px sans-serif';
    ctx.fillText('THE RISING TRIBE STUDIOS', canvas.width / 2, 105);

    const dataUrl = canvas.toDataURL('image/png');

    const pageIdx = currentPage - 1;
    const newAnn: AnnotationItem = {
      id: `stamp-${Date.now()}`,
      pageIndex: pageIdx,
      type: 'stamp',
      x: 55,
      y: 15,
      width: 26,
      height: 10,
      imageDataUrl: dataUrl,
      opacity: 0.9,
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnId(newAnn.id);
    setActiveTool('select');
  };

  // Rotate Page
  const handleRotatePage = (pageIdx: number) => {
    setPageRotations((prev) => ({
      ...prev,
      [pageIdx]: ((prev[pageIdx] || 0) + 90) % 360,
    }));
  };

  // Delete page
  const handleDeletePage = (pageIdx: number) => {
    if (pageOrder.length <= 1) return;
    const updated = pageOrder.filter((_, idx) => idx !== pageIdx);
    setPageOrder(updated);
    setPageCount(updated.length);
    if (currentPage > updated.length) {
      setCurrentPage(updated.length);
    }
  };

  // Duplicate page
  const handleDuplicatePage = (pageIdx: number) => {
    const origIndex = pageOrder[pageIdx];
    const updated = [...pageOrder];
    updated.splice(pageIdx + 1, 0, origIndex);
    setPageOrder(updated);
    setPageCount(updated.length);
  };

  // Move page up/down
  const handleMovePage = (pageIdx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? pageIdx - 1 : pageIdx + 1;
    if (targetIdx < 0 || targetIdx >= pageOrder.length) return;
    const updated = [...pageOrder];
    const [item] = updated.splice(pageIdx, 1);
    updated.splice(targetIdx, 0, item);
    setPageOrder(updated);
    setCurrentPage(targetIdx + 1);
  };

  // Bake and Compile Edited PDF bytes
  const compileEditedPdfBytes = async (): Promise<{ pdfBytes: Uint8Array; blobUrl: string; dataUrl: string; sizeBytes: number }> => {
    if (!pdfDataUrl) throw new Error('No PDF loaded');

    // Convert dataUrl to Uint8Array
    const b64 = pdfDataUrl.split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const result = await PdfEngine.applyEditsToPdf(bytes, {
      annotations,
      watermark,
      pageRotations,
      pageOrder,
    });

    let binary = '';
    const len = result.pdfBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(result.pdfBytes[i]);
    }
    const outDataUrl = `data:application/pdf;base64,${btoa(binary)}`;

    return {
      pdfBytes: result.pdfBytes,
      blobUrl: result.blobUrl,
      dataUrl: outDataUrl,
      sizeBytes: result.sizeBytes,
    };
  };

  // Download edited PDF
  const handleDownload = async () => {
    try {
      setIsSaving(true);
      const { blobUrl } = await compileEditedPdfBytes();
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${documentTitle}_edited.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download edited PDF:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save to Cloud Vault
  const handleSaveToCloudVault = async () => {
    try {
      setIsSaving(true);
      const { pdfBytes, dataUrl, sizeBytes } = await compileEditedPdfBytes();
      const thumb = await PdfEngine.generateThumbnail(pdfBytes);

      const docId = `doc-${Date.now()}`;
      const docRecord: CloudDocument = {
        id: docId,
        title: `${documentTitle} (Studio Edit)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: pageOrder.length || pageCount,
        sizeBytes,
        tags: ['Edited', 'Cloud Vault', 'Signed'],
        cloudSyncStatus: 'synced',
        thumbnailUrl: thumb,
        pdfDataUrl: dataUrl,
        versions: [
          {
            version: 1,
            timestamp: Date.now(),
            note: 'Studio annotations, watermark & signature baked',
            sizeBytes,
          },
        ],
      };

      await CloudStorageService.saveDocument(docRecord);
      setPdfDataUrl(dataUrl); // Set updated compiled PDF as new source
      setAnnotations([]); // Clear staged annotations since they are now baked in!
      setSaveSuccessMsg('All edits compiled & synced to Studio Cloud Vault');
      setTimeout(() => setSaveSuccessMsg(null), 3500);

      onDocumentSavedToCloud();
    } catch (err) {
      console.error('Failed to save to cloud vault:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Share Modal
  const handleShare = async () => {
    try {
      setIsSaving(true);
      const { pdfBytes, dataUrl, sizeBytes } = await compileEditedPdfBytes();
      const thumb = await PdfEngine.generateThumbnail(pdfBytes);

      const docRecord: CloudDocument = {
        id: `share-${Date.now()}`,
        title: documentTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: pageOrder.length || pageCount,
        sizeBytes,
        tags: ['Shared', 'Studio Folio'],
        cloudSyncStatus: 'synced',
        thumbnailUrl: thumb,
        pdfDataUrl: dataUrl,
        versions: [],
      };

      setShareDocumentRecord(docRecord);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Share generation failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Load sample PDF document if none provided
  const loadDefaultSamplePdf = async () => {
    setIsRendering(true);
    // Create an elegant 2-page sample PDF
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2200;
    const ctx = canvas.getContext('2d')!;

    // Page 1
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 100, canvas.width - 200, canvas.height - 200);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('THE RISING TRIBE STUDIOS', 180, 260);

    ctx.fillStyle = '#D97706';
    ctx.font = '500 28px sans-serif';
    ctx.fillText('DOCUMENT ARCHITECTURE & DESIGN CONTRACT', 180, 320);

    ctx.fillStyle = '#334155';
    ctx.font = '400 32px sans-serif';
    ctx.fillText('1. Executive Scope of Engineering & Aesthetic Direction', 180, 440);

    ctx.fillStyle = '#64748B';
    ctx.font = '400 24px sans-serif';
    const lines = [
      'This document represents the official studio publication guidelines for digital media assets.',
      'All image-to-PDF compilation operations adhere to lossless raster standards and high DPI.',
      'Signatures, security stamps, and watermarks applied herein are cryptographically embedded.',
      'Cloud synchronization ensures tamper-evident revision trails across enterprise workspaces.',
    ];
    lines.forEach((l, idx) => ctx.fillText(l, 180, 520 + idx * 50));

    // Studio signature line
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, 1800);
    ctx.lineTo(700, 1800);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '400 22px sans-serif';
    ctx.fillText('Authorized Studio Principal Signature', 180, 1840);

    const page1Data = canvas.toDataURL('image/jpeg', 0.95);

    const converted = await PdfEngine.convertImagesToPdf(
      [
        {
          id: 's1',
          name: 'Rising_Tribe_Master_Agreement_p1',
          size: 450000,
          type: 'image/jpeg',
          dataUrl: page1Data,
          width: 1600,
          height: 2200,
          rotation: 0,
        },
      ],
      {
        pageSize: 'a4',
        orientation: 'portrait',
        margin: 5,
        fitMode: 'contain',
        backgroundColor: '#FFFFFF',
        imageQuality: 0.92,
        addPageNumbers: true,
        pageNumberPosition: 'bottom-center',
        headerTitle: 'The Rising Tribe Studios · Master Document',
        footerText: 'Confidential & Proprietary',
        compressOutput: false,
      }
    );

    let binary = '';
    const len = converted.pdfBytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(converted.pdfBytes[i]);
    const outDataUrl = `data:application/pdf;base64,${btoa(binary)}`;

    setPdfDataUrl(outDataUrl);
    setDocumentTitle('Rising_Tribe_Master_Agreement');
    setCurrentPage(1);
    setIsRendering(false);
  };

  // If no PDF loaded yet, show the import / starter hub
  if (!pdfDataUrl) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-[#0C121E] p-8 sm:p-12 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <FileText className="h-8 w-8" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-amber-400">
            <span>The Rising Tribe App Studio</span>
            <span aria-hidden="true">·</span>
            <span>Document Editor</span>
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            PDF Studio Editor
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Annotate documents with custom typography, draw and apply digital signatures, embed
            official studio stamps, apply security watermarks, and redact sensitive fields.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3 text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Open PDF from Computer</span>
            </button>

            <button
              onClick={loadDefaultSamplePdf}
              className="flex items-center gap-2 rounded-xl border border-slate-700 hover:border-amber-500/40 bg-slate-900/90 hover:bg-slate-900 px-5 py-3 text-xs font-medium text-slate-200 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Load Studio Contract Template</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active page annotations
  const pageAnnotations = annotations.filter((a) => a.pageIndex === currentPage - 1);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#070B12] overflow-hidden">
      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleAddSignature}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={shareDocumentRecord}
      />

      {/* Top Studio Control Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#0A0F1A] px-4">
        {/* Document Title & Pages */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="rounded bg-transparent px-2 py-1 text-sm font-semibold text-white hover:bg-slate-900 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[200px] truncate"
          />

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded p-1 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono tabular-nums text-slate-200">
              Page {currentPage} of {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
              className="rounded p-1 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Studio Tools Segmented Bar */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTool('select')}
            title="Selection / Pointer"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTool === 'select'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Select</span>
          </button>

          <button
            onClick={() => setActiveTool('text')}
            title="Add Text Annotation"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTool === 'text'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Text</span>
          </button>

          <button
            onClick={() => setIsSignatureModalOpen(true)}
            title="Add Digital Signature"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Sign</span>
          </button>

          <button
            onClick={() => setShowWatermarkDrawer(!showWatermarkDrawer)}
            title="Toggle Watermark Settings"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              watermark.enabled
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Watermark</span>
          </button>

          <button
            onClick={() => setActiveTool('highlight')}
            title="Highlight Box"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTool === 'highlight'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Highlight</span>
          </button>

          <button
            onClick={() => setActiveTool('redact')}
            title="Blackout Redaction Block"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTool === 'redact'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Redact</span>
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden xl:flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
              className="p-1 hover:text-white"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs tabular-nums text-slate-300 w-12 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
              className="p-1 hover:text-white"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleSaveToCloudVault}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all shadow-sm shadow-amber-500/10 cursor-pointer active:scale-95"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
            <span>Save to Cloud</span>
          </button>
        </div>
      </div>

      {/* Success alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-center text-xs font-medium text-emerald-400 flex items-center justify-center gap-2">
          <Check className="h-3.5 w-3.5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Studio Body: Sidebar + Stage + Side Drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Thumbnails Strip */}
        <div className="w-48 shrink-0 border-r border-slate-800/80 bg-[#090E17] p-3 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <span className="text-xs font-semibold text-slate-300">Pages ({pageCount})</span>
          </div>

          {Array.from({ length: pageCount }).map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentPage(idx + 1)}
              className={`group relative rounded-xl border p-2 transition-all cursor-pointer ${
                currentPage === idx + 1
                  ? 'border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/5'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              {/* Page Number */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-medium text-slate-400 tabular-nums">
                  Page {idx + 1}
                </span>
                {pageRotations[idx] ? (
                  <span className="text-[10px] font-mono text-amber-400">
                    +{pageRotations[idx]}°
                  </span>
                ) : null}
              </div>

              {/* Page Preview Placeholder Box */}
              <div className="h-28 w-full rounded border border-slate-800 bg-white/90 flex items-center justify-center overflow-hidden">
                <div className="text-center p-2">
                  <div className="w-12 h-1 bg-slate-300 mx-auto mb-1" />
                  <div className="w-16 h-1 bg-slate-200 mx-auto mb-1" />
                  <div className="w-10 h-1 bg-slate-200 mx-auto" />
                </div>
              </div>

              {/* Page action buttons */}
              <div className="mt-2 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotatePage(idx);
                    }}
                    title="Rotate 90°"
                    className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                  >
                    <RotateCw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicatePage(idx);
                    }}
                    title="Duplicate Page"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMovePage(idx, 'up')}
                    }
                    disabled={idx === 0}
                    title="Move Up"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMovePage(idx, 'down')}
                    }
                    disabled={idx === pageCount - 1}
                    title="Move Down"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePage(idx);
                  }}
                  disabled={pageCount <= 1}
                  title="Delete Page"
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-20"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Center Stage: Interactive Page Canvas */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[#070B12] relative">
          {isRendering && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-xs text-amber-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                <span>Rendering High-Resolution Page...</span>
              </div>
            </div>
          )}

          {/* Page Container with Canvas and Annotation Layer */}
          <div
            onClick={handleCanvasClick}
            className={`relative rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all ${
              activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          >
            <canvas ref={canvasRef} className="block rounded-lg max-w-full" />

            {/* Live Watermark Overlay (Visual feedback) */}
            {watermark.enabled && watermark.text.trim() && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
                style={{
                  transform: `rotate(${watermark.rotation}deg)`,
                }}
              >
                <span
                  style={{
                    color: watermark.color,
                    opacity: watermark.opacity,
                    fontSize: `${watermark.fontSize * zoomScale}px`,
                    fontWeight: 700,
                  }}
                  className="tracking-widest uppercase select-none font-bold"
                >
                  {watermark.text}
                </span>
              </div>
            )}

            {/* Annotations Overlay Layer */}
            {pageAnnotations.map((ann) => (
              <div
                key={ann.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAnnId(ann.id);
                }}
                className={`absolute group cursor-pointer transition-shadow ${
                  selectedAnnId === ann.id
                    ? 'ring-2 ring-amber-500 rounded'
                    : 'hover:ring-1 hover:ring-amber-500/50'
                }`}
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.width}%`,
                  height: `${ann.height}%`,
                }}
              >
                {/* Text Type */}
                {ann.type === 'text' && (
                  <div
                    style={{
                      color: ann.color,
                      fontSize: `${(ann.fontSize || 12) * zoomScale}px`,
                      backgroundColor: ann.backgroundColor || 'transparent',
                    }}
                    className="font-semibold p-1 leading-tight select-none truncate"
                  >
                    {ann.text}
                  </div>
                )}

                {/* Highlight Type */}
                {ann.type === 'highlight' && (
                  <div
                    style={{
                      backgroundColor: ann.color || '#FACC15',
                      opacity: ann.opacity || 0.35,
                    }}
                    className="w-full h-full rounded-xs"
                  />
                )}

                {/* Redaction Type */}
                {ann.type === 'redact' && (
                  <div className="w-full h-full bg-[#0A0F1D] rounded-xs shadow-inner" />
                )}

                {/* Signature / Stamp Type */}
                {(ann.type === 'signature' || ann.type === 'stamp') && ann.imageDataUrl && (
                  <img
                    src={ann.imageDataUrl}
                    alt="Annotation"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                )}

                {/* Delete affordance when selected */}
                {selectedAnnId === ann.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                      setSelectedAnnId(null);
                    }}
                    className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow-md hover:bg-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Drawer: Tool Properties & Studio Stamps */}
        <div className="w-72 shrink-0 border-l border-slate-800/80 bg-[#090E17] p-4 overflow-y-auto space-y-6">
          {/* Studio Stamps Palette */}
          <div>
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800/60">
              <Award className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white">Studio Official Stamps</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Apply verified insignia stamps directly to this document page:
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { text: 'APPROVED', color: '#10B981' },
                { text: 'CONFIDENTIAL', color: '#EF4444' },
                { text: 'REVIEWED', color: '#3B82F6' },
                { text: 'ORIGINAL', color: '#F59E0B' },
                { text: 'FINAL v1.0', color: '#8B5CF6' },
                { text: 'VOID', color: '#64748B' },
              ].map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleAddStamp(s.text, s.color)}
                  className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 p-2 text-center text-xs font-bold transition-all hover:scale-102"
                  style={{ color: s.color }}
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>

          {/* Text Tool Inspector */}
          {activeTool === 'text' && (
            <div className="rounded-xl border border-slate-800 bg-[#0C121F] p-3 space-y-3">
              <h4 className="text-xs font-semibold text-amber-400">Text Annotation Inspector</h4>
              <div>
                <label className="text-xs text-slate-400">Content</label>
                <input
                  type="text"
                  value={textInputVal}
                  onChange={(e) => setTextInputVal(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Size</label>
                  <input
                    type="number"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="mt-1 h-7 w-full cursor-pointer rounded border border-slate-800 bg-slate-900"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Click anywhere on the document canvas to place this text.
              </p>
            </div>
          )}

          {/* Watermark Drawer */}
          {showWatermarkDrawer && (
            <div className="rounded-xl border border-amber-500/30 bg-[#0C121F] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-amber-400">Security Watermark</h4>
                <button
                  onClick={() => setWatermark({ ...watermark, enabled: !watermark.enabled })}
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    watermark.enabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {watermark.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400">Watermark Text</label>
                <input
                  type="text"
                  value={watermark.text}
                  onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                  placeholder="e.g. CONFIDENTIAL"
                  className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Opacity</span>
                  <span className="font-mono tabular-nums">{Math.round(watermark.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.05"
                  value={watermark.opacity}
                  onChange={(e) => setWatermark({ ...watermark, opacity: Number(e.target.value) })}
                  className="w-full accent-amber-500 mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Angle</span>
                  <span className="font-mono tabular-nums">{watermark.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={watermark.rotation}
                  onChange={(e) => setWatermark({ ...watermark, rotation: Number(e.target.value) })}
                  className="w-full accent-amber-500 mt-1"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">All Pages</span>
                <input
                  type="checkbox"
                  checked={watermark.applyToAllPages}
                  onChange={(e) => setWatermark({ ...watermark, applyToAllPages: e.target.checked })}
                  className="accent-amber-500 h-4 w-4"
                />
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Studio Editor Tips</p>
            <p>· Click placed annotations to select or delete them.</p>
            <p>· Click "Save to Cloud" to bake annotations permanently into a new cloud vault version.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
