import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Trash2,
  Download,
  Edit3,
  Cloud,
  FileText,
  Layers,
  PenTool,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  Filter
} from 'lucide-react';
import { HistoryRecord, HistoryActionType } from '../types';
import { HistoryService } from '../services/historyService';

interface HistoryViewProps {
  onOpenInEditor: (pdfDataUrl: string, title: string) => void;
  onRefreshStats: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onOpenInEditor,
  onRefreshStats,
}) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const all = await HistoryService.getAllRecords();
      setRecords(all);
    } catch (e) {
      console.error('Failed to load history records', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteRecord = async (id: string) => {
    await HistoryService.deleteRecord(id);
    loadHistory();
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all studio history records? This cannot be undone.')) {
      return;
    }
    await HistoryService.clearAllHistory();
    loadHistory();
  };

  const handleExportCsv = async () => {
    const csvStr = await HistoryService.exportHistoryCsv();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TheRisingTribe_History_Log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTimestamp = (ts: number): string => {
    const diffMs = Date.now() - ts;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(ts).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionConfig = (type: HistoryActionType) => {
    switch (type) {
      case 'convert_image_pdf':
        return {
          label: 'Image to PDF',
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
          icon: FileText,
        };
      case 'edit_pdf':
        return {
          label: 'PDF Edit',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          icon: Edit3,
        };
      case 'sign_document':
        return {
          label: 'Digital Signature',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          icon: PenTool,
        };
      case 'merge_pdf':
        return {
          label: 'Batch Merge',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          icon: Layers,
        };
      case 'cloud_sync':
        return {
          label: 'Cloud Sync',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          icon: Cloud,
        };
      default:
        return {
          label: 'Document Action',
          color: 'text-slate-400 bg-slate-800 border-slate-700',
          icon: Clock,
        };
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.details.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'all') return true;
    return r.actionType === filterType;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Top Android Screen Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <span>The Rising Tribe</span>
            <span aria-hidden="true">·</span>
            <span>Audit & Activity Trails</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            History Records
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time chronological log of all PDF compilations, edits, signatures, and cloud operations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 hover:border-sky-500/40 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-400 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Search and Material 3 Filter Chips */}
      <div className="mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history by document title or action..."
            className="w-full rounded-2xl border border-slate-800 bg-[#0C1220] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'convert_image_pdf', label: 'Image to PDF' },
            { id: 'edit_pdf', label: 'PDF Edits' },
            { id: 'sign_document', label: 'Signatures' },
            { id: 'merge_pdf', label: 'Merges' },
            { id: 'cloud_sync', label: 'Cloud Saves' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterType(chip.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === chip.id
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Records List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading history records...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-[#0C1220] p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="mt-2 text-sm font-semibold text-white">No Activity Records Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery
              ? 'No records match your search filter.'
              : 'Every time you convert images, edit a PDF, or save to cloud, a record will be logged here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((item) => {
            const config = getActionConfig(item.actionType);
            const IconComp = config.icon;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0C1220] p-4 transition-all hover:border-slate-700 hover:shadow-lg"
              >
                {/* Left section: Icon + Info */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Action Icon Pill */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                        {item.title}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-400 line-clamp-1">{item.details}</p>

                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono text-slate-400">{formatTimestamp(item.timestamp)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{item.pageCount} Pages</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatSize(item.sizeBytes)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400 font-medium">{item.status}</span>
                    </div>
                  </div>
                </div>

                {/* Right section: Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 justify-end">
                  {item.pdfDataUrl && (
                    <>
                      <button
                        onClick={() => onOpenInEditor(item.pdfDataUrl!, item.title)}
                        className="flex items-center gap-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-2.5 py-1.5 text-xs font-semibold transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Re-Open</span>
                      </button>

                      <a
                        href={item.pdfDataUrl}
                        download={`${item.title}.pdf`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </>
                  )}

                  <button
                    onClick={() => handleDeleteRecord(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Remove Record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
