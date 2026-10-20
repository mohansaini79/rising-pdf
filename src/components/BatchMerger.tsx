import React, { useState, useRef } from 'react';
import {
  FilePlus,
  ArrowRight,
  MoveUp,
  MoveDown,
  Trash2,
  CheckCircle,
  Download,
  Cloud,
  FileText,
  Merge,
  Layers,
  Sparkles
} from 'lucide-react';
import { PdfEngine } from '../services/pdfEngine';
import { CloudStorageService } from '../services/cloudStorage';
import { CloudDocument } from '../types';

interface BatchMergerProps {
  onOpenInEditor: (pdfDataUrl: string, title: string) => void;
  onDocumentSavedToCloud: () => void;
}

interface MergeItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  pdfBytes: Uint8Array;
  dataUrl: string;
}

export const BatchMerger: React.FC<BatchMergerProps> = ({
  onOpenInEditor,
  onDocumentSavedToCloud,
}) => {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [mergedTitle, setMergedTitle] = useState('Studio_Merged_Publication');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [mergedResult, setMergedResult] = useState<{
    pdfBytes: Uint8Array;
    blobUrl: string;
    dataUrl: string;
    pageCount: number;
    sizeBytes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setProgressMsg('Parsing PDF documents...');
    const newItems: MergeItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) continue;

      try {
        const arrayBuf = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        const info = await PdfEngine.getPdfInfo(bytes);

        let binary = '';
        const len = bytes.byteLength;
        for (let j = 0; j < len; j++) binary += String.fromCharCode(bytes[j]);
        const dataUrl = `data:application/pdf;base64,${btoa(binary)}`;

        newItems.push({
          id: `merge-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
          name: file.name.replace(/\.pdf$/i, ''),
          size: file.size,
          pageCount: info.pageCount,
          pdfBytes: bytes,
          dataUrl,
        });
      } catch (e) {
        console.error('Failed to parse PDF', file.name, e);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
    setProgressMsg('');
  };

  const moveItem = (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const list = [...items];
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    setItems(list);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMerge = async () => {
    if (items.length < 2) return;
    setIsProcessing(true);
    setProgressMsg(`Merging ${items.length} documents...`);

    try {
      const buffers = items.map((it) => it.pdfBytes);
      const res = await PdfEngine.mergePdfs(buffers);

      let binary = '';
      const len = res.pdfBytes.byteLength;
      for (let j = 0; j < len; j++) binary += String.fromCharCode(res.pdfBytes[j]);
      const dataUrl = `data:application/pdf;base64,${btoa(binary)}`;

      setMergedResult({
        ...res,
        dataUrl,
      });
    } catch (e) {
      console.error('Merge failed:', e);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleSaveToCloud = async () => {
    if (!mergedResult) return;
    setIsProcessing(true);
    setProgressMsg('Saving merged document to Studio Cloud Vault...');

    try {
      const thumb = await PdfEngine.generateThumbnail(mergedResult.pdfBytes);
      const docRecord: CloudDocument = {
        id: `doc-${Date.now()}`,
        title: mergedTitle || 'Studio Merged Document',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: mergedResult.pageCount,
        sizeBytes: mergedResult.sizeBytes,
        tags: ['Merged', 'Compilation', 'Multi-Doc'],
        cloudSyncStatus: 'synced',
        thumbnailUrl: thumb,
        pdfDataUrl: mergedResult.dataUrl,
        versions: [
          {
            version: 1,
            timestamp: Date.now(),
            note: `Merged from ${items.length} independent PDF documents`,
            sizeBytes: mergedResult.sizeBytes,
          },
        ],
      };

      await CloudStorageService.saveDocument(docRecord);
      onDocumentSavedToCloud();
    } catch (e) {
      console.error('Failed to save merged PDF to cloud:', e);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // Demo sample loader
  const loadDemoPdfs = async () => {
    setIsProcessing(true);
    setProgressMsg('Creating sample studio PDF documents...');

    // Create 2 distinct sample PDFs
    const makePdf = async (title: string, subtitle: string, pageCount: number): Promise<MergeItem> => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(title, 100, 200);
      ctx.fillStyle = '#D97706';
      ctx.font = '24px sans-serif';
      ctx.fillText(subtitle, 100, 260);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const converted = await PdfEngine.convertImagesToPdf(
        [
          {
            id: 'm1',
            name: title,
            size: 150000,
            type: 'image/jpeg',
            dataUrl,
            width: 1200,
            height: 1600,
            rotation: 0,
          },
        ],
        {
          pageSize: 'a4',
          orientation: 'portrait',
          margin: 5,
          fitMode: 'contain',
          backgroundColor: '#FFFFFF',
          imageQuality: 0.9,
          addPageNumbers: true,
          pageNumberPosition: 'bottom-center',
          headerTitle: 'The Rising Tribe Studios · Publication Series',
          footerText: 'Part of Unified Batch',
          compressOutput: false,
        }
      );

      let binary = '';
      const len = converted.pdfBytes.byteLength;
      for (let j = 0; j < len; j++) binary += String.fromCharCode(converted.pdfBytes[j]);
      const pdfDataUrl = `data:application/pdf;base64,${btoa(binary)}`;

      return {
        id: `demo-${Date.now()}-${Math.random()}`,
        name: title.replace(/\s+/g, '_'),
        size: converted.sizeBytes,
        pageCount: 1,
        pdfBytes: converted.pdfBytes,
        dataUrl: pdfDataUrl,
      };
    };

    const docA = await makePdf('Part I: Creative Blueprint & Brand Strategy', 'Initial Discovery Phase', 1);
    const docB = await makePdf('Part II: Technical Engineering Architecture', 'Implementation Roadmap', 1);

    setItems([docA, docB]);
    setIsProcessing(false);
    setProgressMsg('');
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
            <span>The Rising Tribe App Studio</span>
            <span aria-hidden="true">·</span>
            <span>Batch PDF Merger</span>
            <span aria-hidden="true">·</span>
            <span>Cloud Synchronized</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Batch PDF Merger
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Combine multiple PDF documents, presentations, and studio folios into a single cohesive
            file with lossless vector quality and unified page indexing.
          </p>
        </div>

        <button
          onClick={loadDemoPdfs}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-amber-500/40 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Load 2 Sample Documents</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Document List */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-amber-500/60 bg-[#0C121E]/60 p-8 text-center transition-all cursor-pointer hover:bg-[#0E1524]"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Merge className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              Drop PDF files here to merge, or <span className="text-amber-400 underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Arrange documents in the order you want them stitched together
            </p>
          </div>

          {/* Items List */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              <strong className="text-white">{items.length}</strong> Documents in Queue
            </span>
            <span>
              Total Pages:{' '}
              <strong className="text-white font-mono tabular-nums">
                {items.reduce((acc, curr) => acc + curr.pageCount, 0)}
              </strong>
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-[#0B101C] p-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-400">No documents queued for merge</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload 2 or more PDF files or click "Load 2 Sample Documents".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-[#0B101C] p-3 transition-colors hover:border-slate-700"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 text-xs font-mono font-semibold text-amber-400 tabular-nums">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{it.name}.pdf</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{it.pageCount} Pages</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatSize(it.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      title="Move Up"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                    >
                      <MoveUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === items.length - 1}
                      title="Move Down"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                    >
                      <MoveDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
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

        {/* Right: Merge compilation trigger */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0C121E] p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-white pb-3 border-b border-slate-800/80">
              Compilation Parameters
            </h2>

            <div className="mt-4">
              <label className="text-xs text-slate-400">Merged Document Title</label>
              <input
                type="text"
                value={mergedTitle}
                onChange={(e) => setMergedTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Input Documents:</span>
                <span className="font-semibold text-white">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Output Pages:</span>
                <span className="font-semibold text-white font-mono tabular-nums">
                  {items.reduce((acc, curr) => acc + curr.pageCount, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Combined Queue Size:</span>
                <span className="font-semibold text-white font-mono tabular-nums">
                  {formatSize(items.reduce((acc, curr) => acc + curr.size, 0))}
                </span>
              </div>
            </div>

            <button
              onClick={handleMerge}
              disabled={items.length < 2 || isProcessing}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold tracking-wide transition-all shadow-md ${
                items.length >= 2 && !isProcessing
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10 cursor-pointer active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>{progressMsg || 'Merging...'}</span>
                </>
              ) : (
                <>
                  <span>Merge {items.length} Documents</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Merge Result */}
          {mergedResult && (
            <div className="rounded-2xl border border-amber-500/30 bg-[#0C121E] p-6 shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>Merged Successfully</span>
              </div>

              <div className="mt-2 text-xs text-slate-400 border-b border-slate-800 pb-3 flex justify-between">
                <span>{mergedTitle}.pdf</span>
                <span className="font-mono tabular-nums">
                  {mergedResult.pageCount} Pages · {formatSize(mergedResult.sizeBytes)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={mergedResult.blobUrl}
                  download={`${mergedTitle}.pdf`}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 px-3 text-xs font-semibold text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => onOpenInEditor(mergedResult.dataUrl, mergedTitle)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 py-2.5 px-3 text-xs font-semibold text-slate-950 transition-colors"
                >
                  <span>Open in Editor</span>
                </button>
              </div>

              <button
                onClick={handleSaveToCloud}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 hover:bg-amber-500/10 py-2.5 px-3 text-xs font-semibold text-amber-300 transition-colors"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Save Merged to Cloud Vault</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
