import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Search,
  Filter,
  Download,
  Share2,
  Trash2,
  Edit3,
  HardDrive,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  Upload,
  ArrowUpDown,
  Star,
  Layers,
  Archive,
  RefreshCw
} from 'lucide-react';
import { CloudDocument, StudioStorageStats } from '../types';
import { CloudStorageService } from '../services/cloudStorage';
import { ShareModal } from './ShareModal';

interface CloudVaultProps {
  onOpenInEditor: (pdfDataUrl: string, title: string) => void;
  onRefreshStats: () => void;
}

export const CloudVault: React.FC<CloudVaultProps> = ({
  onOpenInEditor,
  onRefreshStats,
}) => {
  const [documents, setDocuments] = useState<CloudDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size-desc' | 'pages-desc'>('date-desc');
  const [activeShareDoc, setActiveShareDoc] = useState<CloudDocument | null>(null);

  const [stats, setStats] = useState<StudioStorageStats>({
    usedBytes: 0,
    totalBytes: 5 * 1024 * 1024 * 1024,
    documentCount: 0,
    lastSyncedAt: Date.now(),
    cloudHealth: 'healthy',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docs = await CloudStorageService.getAllDocuments();
      const storageStats = await CloudStorageService.getStorageStats();
      setDocuments(docs);
      setStats(storageStats);
      onRefreshStats();
    } catch (e) {
      console.error('Failed to load cloud vault docs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" from Studio Cloud Vault? This will permanently remove it from cloud storage.`)) {
      return;
    }
    await CloudStorageService.deleteDocument(id);
    fetchDocuments();
  };

  const handleToggleStar = async (doc: CloudDocument) => {
    const updated = { ...doc, isStarred: !doc.isStarred };
    await CloudStorageService.saveDocument(updated);
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      const newDoc: CloudDocument = {
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.pdf$/i, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: 1, // Will update when opened in editor
        sizeBytes: file.size,
        tags: ['Direct Upload', 'PDF'],
        cloudSyncStatus: 'synced',
        pdfDataUrl: dataUrl,
        versions: [
          {
            version: 1,
            timestamp: Date.now(),
            note: 'Original document uploaded',
            sizeBytes: file.size,
          },
        ],
      };
      await CloudStorageService.saveDocument(newDoc);
      fetchDocuments();
    };
    reader.readAsDataURL(file);
  };

  const handleExportBackup = () => {
    const jsonStr = CloudStorageService.exportVaultBackup(documents);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TheRisingTribe_CloudVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const count = await CloudStorageService.importVaultBackup(content);
        alert(`Successfully restored ${count} documents into Studio Cloud Vault.`);
        fetchDocuments();
      } catch (err) {
        alert('Failed to parse vault backup file. Please ensure it is a valid format.');
      }
    };
    reader.readAsText(file);
  };

  // Filter and sort
  const filteredDocs = documents
    .filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedTag === 'all') return true;
      if (selectedTag === 'starred') return !!d.isStarred;
      return d.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return b.updatedAt - a.updatedAt;
      if (sortBy === 'date-asc') return a.updatedAt - b.updatedAt;
      if (sortBy === 'size-desc') return b.sizeBytes - a.sizeBytes;
      if (sortBy === 'pages-desc') return b.pageCount - a.pageCount;
      return 0;
    });

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const quotaPercent = Math.min(100, Math.max(0.5, (stats.usedBytes / stats.totalBytes) * 100));

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      {/* Share Modal */}
      <ShareModal
        isOpen={!!activeShareDoc}
        onClose={() => setActiveShareDoc(null)}
        document={activeShareDoc}
      />

      {/* Hero & Cloud Status banner */}
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
              <span>Cloud Vault</span>
              <span aria-hidden="true">·</span>
              <span>Persistent Storage</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Cloud Document Vault
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Persistent cloud storage for The Rising Tribe Studios. Browse, restore revisions,
              dispatch to external clouds, or open directly in the studio editor.
            </p>
          </div>
        </div>

        {/* Cloud actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <input
            ref={backupInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportBackup}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUploadPdf}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-amber-500/40 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-amber-400" />
            <span>Upload PDF</span>
          </button>

          <button
            onClick={handleExportBackup}
            disabled={documents.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-amber-500/40 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <Archive className="h-3.5 w-3.5 text-amber-400" />
            <span>Vault Backup (.JSON)</span>
          </button>
        </div>
      </div>

      {/* Cloud Storage Quota & Telemetry Metric Card */}
      <div className="mb-8 rounded-2xl border border-slate-800 bg-[#0C121E] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Studio Storage Allocation</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {formatSize(stats.usedBytes)}
                </span>
                <span className="text-xs text-slate-400">of 5.0 GB Studio Cloud Tier</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div>
              <span className="text-slate-400">Active Documents: </span>
              <strong className="text-white font-mono tabular-nums">{stats.documentCount}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Cloud Synchronized</span>
            </div>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 rounded-full"
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or tag..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Filter Tabs (Functional segmented buttons) */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'starred', label: 'Starred' },
            { id: 'portfolio', label: 'Portfolio' },
            { id: 'contract', label: 'Contract' },
            { id: 'edited', label: 'Edited' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTag(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTag === tab.id
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="size-desc">Largest Size</option>
            <option value="pages-desc">Most Pages</option>
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-amber-400 animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading Studio Cloud Vault...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-[#0C121E] p-16 text-center shadow-inner">
          <FileText className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="mt-3 text-base font-semibold text-white">No Documents in Vault</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'No documents matched your query. Try searching for something else.'
              : 'Convert studio images or create annotations to save your first publication in the cloud.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col rounded-2xl border border-slate-800/80 bg-[#0C121E] p-4 transition-all hover:border-slate-700 hover:shadow-2xl hover:shadow-black/60"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => onOpenInEditor(doc.pdfDataUrl, doc.title)}
                className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-slate-800/60 bg-black cursor-pointer group-hover:border-amber-500/30 transition-colors flex items-center justify-center"
              >
                {doc.thumbnailUrl ? (
                  <img
                    src={doc.thumbnailUrl}
                    alt={doc.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <FileText className="h-8 w-8 text-amber-400/60" />
                    <span className="mt-2 text-xs font-mono text-slate-400">PDF PREVIEW</span>
                  </div>
                )}

                {/* Star icon top right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(doc);
                  }}
                  className="absolute top-2.5 right-2.5 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`h-4 w-4 ${
                      doc.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                    }`}
                  />
                </button>

                {/* Cloud synced badge top left */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  <Cloud className="h-2.5 w-2.5" />
                  <span>Cloud Synced</span>
                </div>
              </div>

              {/* Document Details */}
              <div className="mt-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                    {doc.title}
                  </h4>
                  {doc.versions?.length > 1 && (
                    <span className="shrink-0 font-mono text-[11px] text-amber-400/90 font-medium">
                      v{doc.versions.length}
                    </span>
                  )}
                </div>

                {/* Metadata in unboxed text discipline */}
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono tabular-nums">{doc.pageCount} Pages</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatSize(doc.sizeBytes)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(doc.updatedAt)}</span>
                </div>

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {doc.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons row */}
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenInEditor(doc.pdfDataUrl, doc.title)}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Open Editor</span>
                  </button>

                  <button
                    onClick={() => setActiveShareDoc(doc)}
                    title="Share & Cloud Dispatch"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>

                  <a
                    href={doc.pdfDataUrl}
                    download={`${doc.title}.pdf`}
                    title="Download Local PDF"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>

                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  title="Delete Document"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
