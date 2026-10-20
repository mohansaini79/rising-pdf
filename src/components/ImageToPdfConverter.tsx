import React, { useState, useRef } from 'react';
import {
  Upload,
  ArrowRight,
  RotateCw,
  Trash2,
  MoveLeft,
  MoveRight,
  Settings,
  FileText,
  Sliders,
  CheckCircle,
  Eye,
  Cloud,
  Download,
  Sparkles,
  Edit3
} from 'lucide-react';
import { ImageItem, PdfConversionSettings, PageSize, PageOrientation, FitMode, CloudDocument } from '../types';
import { PdfEngine, normalizeImageToDataUrl } from '../services/pdfEngine';
import { CloudStorageService } from '../services/cloudStorage';
import { HistoryService } from '../services/historyService';

interface ImageToPdfConverterProps {
  onOpenInEditor: (pdfDataUrl: string, title: string) => void;
  onDocumentSavedToCloud: () => void;
}

export const ImageToPdfConverter: React.FC<ImageToPdfConverterProps> = ({
  onOpenInEditor,
  onDocumentSavedToCloud,
}) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [documentTitle, setDocumentTitle] = useState('Studio_Document_Export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [generatedPdf, setGeneratedPdf] = useState<{
    pdfBytes: Uint8Array;
    blobUrl: string;
    pageCount: number;
    sizeBytes: number;
    dataUrl: string;
  } | null>(null);

  const [savedToCloud, setSavedToCloud] = useState(false);

  // PDF Settings State
  const [settings, setSettings] = useState<PdfConversionSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 5,
    fitMode: 'contain',
    backgroundColor: '#FFFFFF',
    imageQuality: 0.9,
    addPageNumbers: true,
    pageNumberPosition: 'bottom-center',
    headerTitle: 'The Rising Tribe Studios',
    footerText: 'Confidential & Proprietary',
    compressOutput: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File Upload Handlers
  const handleFiles = async (fileList: FileList | File[]) => {
    const newItems: ImageItem[] = [];
    setIsProcessing(true);
    setProgressMsg('Loading and normalizing images...');

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const normalized = await normalizeImageToDataUrl(file, 'image/jpeg', 0.95);
        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          size: file.size,
          type: file.type,
          dataUrl: normalized.dataUrl,
          width: normalized.width,
          height: normalized.height,
          rotation: 0,
        });
      } catch (err) {
        console.error('Failed to parse image file', file.name, err);
      }
    }

    setImages((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
    setProgressMsg('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Reorder images
  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setImages(updated);
  };

  // Rotate image
  const rotateImage = async (index: number) => {
    const item = images[index];
    const nextRot = (item.rotation + 90) % 360;

    // Redraw rotated image on canvas to produce permanent rotated dataUrl
    const img = new Image();
    img.src = item.dataUrl;
    await new Promise((res) => (img.onload = res));

    const canvas = document.createElement('canvas');
    if (nextRot % 180 === 90) {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    } else {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((nextRot * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const updated = [...images];
      updated[index] = {
        ...item,
        rotation: 0, // Reset logical rotation since pixels are now baked
        dataUrl: rotatedDataUrl,
        width: canvas.width,
        height: canvas.height,
      };
      setImages(updated);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Presets
  const applyPreset = (preset: 'portfolio' | 'contract' | 'borderless' | 'blueprint') => {
    if (preset === 'portfolio') {
      setSettings((s) => ({
        ...s,
        pageSize: 'a4',
        orientation: 'auto',
        margin: 8,
        fitMode: 'contain',
        backgroundColor: '#FFFFFF',
        headerTitle: 'The Rising Tribe Studios · Folio',
        footerText: 'Design Series 2026',
        addPageNumbers: true,
      }));
    } else if (preset === 'contract') {
      setSettings((s) => ({
        ...s,
        pageSize: 'letter',
        orientation: 'portrait',
        margin: 15,
        fitMode: 'contain',
        backgroundColor: '#FFFFFF',
        headerTitle: 'The Rising Tribe Studios · Master Agreement',
        footerText: 'Strictly Confidential · Page',
        addPageNumbers: true,
      }));
    } else if (preset === 'borderless') {
      setSettings((s) => ({
        ...s,
        pageSize: 'fit',
        orientation: 'auto',
        margin: 0,
        fitMode: 'stretch',
        backgroundColor: '#FFFFFF',
        headerTitle: '',
        footerText: '',
        addPageNumbers: false,
      }));
    } else if (preset === 'blueprint') {
      setSettings((s) => ({
        ...s,
        pageSize: 'a3',
        orientation: 'landscape',
        margin: 10,
        fitMode: 'contain',
        backgroundColor: '#0F172A',
        headerTitle: 'The Rising Tribe Architectural Archive',
        footerText: 'Revision 2.4 · Scale 1:100',
        addPageNumbers: true,
      }));
    }
  };

  // Load Curated Sample Set
  const loadSampleSet = () => {
    setIsProcessing(true);
    setProgressMsg('Generating sample studio assets...');

    // Generate 3 elegant canvas-based studio sample slides
    const createSampleSlide = (
      title: string,
      subtitle: string,
      bgHex: string,
      accentHex: string,
      motif: 'architectural' | 'editorial' | 'grid'
    ): ImageItem => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle geometric lines
      ctx.strokeStyle = `${accentHex}25`;
      ctx.lineWidth = 2;
      for (let x = 100; x < canvas.width; x += 150) {
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.lineTo(x, canvas.height - 100);
        ctx.stroke();
      }

      // Elegant inner border frame
      ctx.strokeStyle = `${accentHex}40`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);

      // Central graphic card
      ctx.fillStyle = `${accentHex}10`;
      ctx.fillRect(160, 240, canvas.width - 320, 560);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(160, 240, canvas.width - 320, 560);

      // Studio Typography
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 54px sans-serif';
      ctx.fillText(title, 220, 420);

      ctx.fillStyle = accentHex;
      ctx.font = '500 24px sans-serif';
      ctx.fillText('THE RISING TRIBE STUDIOS · DESIGN FOLIO', 220, 340);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '400 26px sans-serif';
      ctx.fillText(subtitle, 220, 480);

      ctx.font = '400 20px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`ASSET NO: ${Math.floor(1000 + Math.random() * 9000)} · SPEC: 1600x1200 · 300 DPI EQUIV`, 220, 720);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      return {
        id: `sample-${Date.now()}-${Math.random()}`,
        name: title.toLowerCase().replace(/\s+/g, '_'),
        size: 320000,
        type: 'image/jpeg',
        dataUrl,
        width: 1600,
        height: 1200,
        rotation: 0,
      };
    };

    const s1 = createSampleSlide('Urban Monolith Architecture', 'High-density monolithic structural design study', '#090D15', '#F59E0B', 'architectural');
    const s2 = createSampleSlide('Brushed Metal Brand Identity', 'Precision material exploration & tactile tactile identity system', '#0D131F', '#38BDF8', 'editorial');
    const s3 = createSampleSlide('Spatial Acoustics & Studio Layout', 'Acoustic baffle placement and ambient studio sound architecture', '#111724', '#10B981', 'grid');

    setImages([s1, s2, s3]);
    setDocumentTitle('Rising_Tribe_Studio_Folio');
    setIsProcessing(false);
    setProgressMsg('');
  };

  // Convert Images to PDF
  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgressMsg(`Generating PDF with ${images.length} pages...`);
    setSavedToCloud(false);

    try {
      const result = await PdfEngine.convertImagesToPdf(images, settings);

      // Convert Uint8Array to base64 dataUrl for saving and embedding
      let binary = '';
      const len = result.pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(result.pdfBytes[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:application/pdf;base64,${base64}`;

      setGeneratedPdf({
        ...result,
        dataUrl,
      });

      // Record conversion in history
      await HistoryService.addRecord({
        title: documentTitle || 'Studio Document',
        actionType: 'convert_image_pdf',
        pageCount: result.pageCount,
        sizeBytes: result.sizeBytes,
        details: `Compiled ${images.length} images to ${settings.pageSize.toUpperCase()} (${settings.orientation})`,
        status: 'Completed',
        pdfDataUrl: dataUrl,
      });
    } catch (err) {
      console.error('PDF conversion failed:', err);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // Save to Cloud Vault
  const handleSaveToCloud = async () => {
    if (!generatedPdf) return;
    setIsProcessing(true);
    setProgressMsg('Saving and synchronizing document to Studio Cloud Vault...');

    try {
      const thumb = await PdfEngine.generateThumbnail(generatedPdf.pdfBytes);
      const docRecord: CloudDocument = {
        id: `doc-${Date.now()}`,
        title: documentTitle || 'Studio Document',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: generatedPdf.pageCount,
        sizeBytes: generatedPdf.sizeBytes,
        tags: ['Studio', 'Portfolio', settings.pageSize.toUpperCase()],
        cloudSyncStatus: 'synced',
        thumbnailUrl: thumb,
        pdfDataUrl: generatedPdf.dataUrl,
        versions: [
          {
            version: 1,
            timestamp: Date.now(),
            note: 'Initial image conversion export',
            sizeBytes: generatedPdf.sizeBytes,
          },
        ],
      };

      await CloudStorageService.saveDocument(docRecord);

      // Record cloud sync in history
      await HistoryService.addRecord({
        title: docRecord.title,
        actionType: 'cloud_sync',
        pageCount: docRecord.pageCount,
        sizeBytes: docRecord.sizeBytes,
        details: `Synchronized to The Rising Tribe Cloud Vault`,
        status: 'Cloud Synced',
        thumbnailUrl: thumb,
        pdfDataUrl: generatedPdf.dataUrl,
      });

      setSavedToCloud(true);
      onDocumentSavedToCloud();
    } catch (e) {
      console.error('Failed to save to cloud vault:', e);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      {/* Hero header with official logo */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-start gap-3.5">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_vz4sbhvz4sbhvz4s_4b141ba5.png"
            alt="The Rising Tribe"
            className="h-12 w-12 rounded-2xl object-contain border border-sky-500/30 bg-[#070D18] p-1 shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
              <span>The Rising Tribe Studios</span>
              <span aria-hidden="true">·</span>
              <span>Android Suite</span>
              <span aria-hidden="true">·</span>
              <span>Cloud Enabled</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Image to PDF Studio
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Convert JPG, PNG, and WebP collections into publication-grade PDF documents with
              precise margins, page numbering, custom studio layout presets, and instant cloud sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <button
            onClick={loadSampleSet}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 hover:border-sky-500/40 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <span>Load Sample Studio Folio</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Management & Upload */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-amber-500/60 bg-[#0C121E]/60 p-8 text-center transition-all cursor-pointer hover:bg-[#0E1524]"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
              <Upload className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              Drop studio images here, or <span className="text-amber-400 underline">browse files</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supports JPEG, PNG, WebP, SVG · Batch conversion supported
            </p>
          </div>

          {/* Image List Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-white">{images.length}</span>
              <span>Images Selected</span>
              {images.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {formatSize(images.reduce((acc, curr) => acc + curr.size, 0))}
                  </span>
                </>
              )}
            </div>

            {images.length > 0 && (
              <button
                onClick={() => setImages([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Image Cards Grid */}
          {images.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-[#0B101C] p-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-400">No images uploaded yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload image assets or click "Load Sample Studio Folio" above to begin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-[#0B101C] p-3 transition-colors hover:border-slate-700"
                >
                  {/* Sequence number */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 text-xs font-mono font-semibold text-amber-400 tabular-nums">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-black">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{img.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono tabular-nums">
                        {img.width} × {img.height}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatSize(img.size)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveImage(idx, 'left')}
                      disabled={idx === 0}
                      title="Move Up"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'right')}
                      disabled={idx === images.length - 1}
                      title="Move Down"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => rotateImage(idx)}
                      title="Rotate 90° Clockwise"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      title="Remove"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: PDF Output Settings & Conversion Trigger */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0C121E] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Page Layout & Specification</h2>
              </div>
            </div>

            {/* Document Title */}
            <div className="mt-4">
              <label className="text-xs text-slate-400">Document Title</label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Document Title"
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Presets Bar */}
            <div className="mt-4">
              <label className="text-xs text-slate-400">Studio Presets</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {[
                  { id: 'portfolio', label: 'Portfolio Folio' },
                  { id: 'contract', label: 'Contract Standard' },
                  { id: 'borderless', label: 'Borderless Raw' },
                  { id: 'blueprint', label: 'Architectural Blueprint' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id as any)}
                    className="rounded-lg border border-slate-800 hover:border-amber-500/40 bg-slate-900/60 hover:bg-slate-900 py-1.5 px-2.5 text-left text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Size & Orientation */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Page Size</label>
                <select
                  value={settings.pageSize}
                  onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as PageSize })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="a4">A4 (Standard)</option>
                  <option value="letter">US Letter</option>
                  <option value="legal">Legal</option>
                  <option value="a3">A3 (Poster / Blueprint)</option>
                  <option value="a5">A5 (Booklet)</option>
                  <option value="fit">Fit to Image Size</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Orientation</label>
                <select
                  value={settings.orientation}
                  onChange={(e) =>
                    setSettings({ ...settings, orientation: e.target.value as PageOrientation })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            {/* Margins & Image Fit */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Page Margin</label>
                <select
                  value={settings.margin}
                  onChange={(e) => setSettings({ ...settings, margin: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="0">None (0 mm)</option>
                  <option value="5">Compact (5 mm)</option>
                  <option value="10">Standard (10 mm)</option>
                  <option value="20">Spacious (20 mm)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Image Fit</label>
                <select
                  value={settings.fitMode}
                  onChange={(e) => setSettings({ ...settings, fitMode: e.target.value as FitMode })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="contain">Contain (Keep Proportion)</option>
                  <option value="stretch">Fill Entire Printable Area</option>
                </select>
              </div>
            </div>

            {/* Header & Footer Text */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400">Header Label</label>
                <input
                  type="text"
                  value={settings.headerTitle}
                  onChange={(e) => setSettings({ ...settings, headerTitle: e.target.value })}
                  placeholder="e.g. The Rising Tribe Studios"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Footer Tagline</label>
                <input
                  type="text"
                  value={settings.footerText}
                  onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                  placeholder="e.g. Strictly Confidential"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Page Numbers Toggle */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60">
              <span className="text-xs text-slate-300">Include Page Numbers</span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, addPageNumbers: !settings.addPageNumbers })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings.addPageNumbers ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.addPageNumbers ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Convert Button */}
            <button
              onClick={handleConvert}
              disabled={images.length === 0 || isProcessing}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold tracking-wide transition-all shadow-md ${
                images.length > 0 && !isProcessing
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10 cursor-pointer active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>{progressMsg || 'Processing...'}</span>
                </>
              ) : (
                <>
                  <span>Compile {images.length} Pages to PDF</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Generated PDF Output Card */}
          {generatedPdf && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#0C121E] via-[#0F1524] to-[#12192B] p-6 shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>PDF Compiled Successfully</span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                <span>{documentTitle}.pdf</span>
                <span className="font-mono tabular-nums">
                  {generatedPdf.pageCount} Pages · {formatSize(generatedPdf.sizeBytes)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={generatedPdf.blobUrl}
                  download={`${documentTitle}.pdf`}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 px-3 text-xs font-semibold text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </a>

                <button
                  onClick={() => onOpenInEditor(generatedPdf.dataUrl, documentTitle)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 py-2.5 px-3 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Open in PDF Editor</span>
                </button>
              </div>

              {/* Cloud Save Action */}
              <button
                onClick={handleSaveToCloud}
                disabled={savedToCloud || isProcessing}
                className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs font-semibold transition-colors ${
                  savedToCloud
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'border border-amber-500/40 hover:bg-amber-500/10 text-amber-300'
                }`}
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>{savedToCloud ? 'Saved to Studio Cloud Vault' : 'Save to Cloud Vault'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
