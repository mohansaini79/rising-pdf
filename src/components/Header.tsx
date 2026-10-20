import React from 'react';
import { Cloud, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { StudioStorageStats } from '../types';

interface HeaderProps {
  activeTab: 'convert' | 'editor' | 'merger' | 'vault';
  onSelectTab: (tab: 'convert' | 'editor' | 'merger' | 'vault') => void;
  storageStats: StudioStorageStats;
  isSyncing: boolean;
  onNewProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  storageStats,
  isSyncing,
  onNewProject,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080C14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand title, one line wordmark */}
        <button
          onClick={() => onSelectTab('convert')}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 group focus:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/30 text-amber-400 group-hover:border-amber-400 transition-colors">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors">
            The Rising Tribe App Studio
          </span>
        </button>

        {/* Zone 2: 4 nav links, single-line labels */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('convert')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              activeTab === 'convert' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Image to PDF
          </button>
          <button
            onClick={() => onSelectTab('editor')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              activeTab === 'editor' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            PDF Editor
          </button>
          <button
            onClick={() => onSelectTab('merger')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              activeTab === 'merger' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Batch Merger
          </button>
          <button
            onClick={() => onSelectTab('vault')}
            className={`flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              activeTab === 'vault' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            <span>Cloud Vault</span>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 tabular-nums">
              {storageStats.documentCount}
            </span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action with Cloud Sync status */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Cloud Sync Status Indicator */}
          <div
            onClick={() => onSelectTab('vault')}
            className="hidden sm:flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title={`Cloud Storage: ${formatBytes(storageStats.usedBytes)} used of 5 GB`}
          >
            {isSyncing ? (
              <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className="font-mono tabular-nums text-slate-400">
              {formatBytes(storageStats.usedBytes)}
            </span>
          </div>

          <button
            onClick={onNewProject}
            className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-amber-500/10 cursor-pointer active:scale-95"
          >
            <span>New Document</span>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <div className="flex md:hidden border-t border-slate-800/60 bg-[#0B101B] px-4 py-2 gap-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => onSelectTab('convert')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'convert' ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Image to PDF
        </button>
        <button
          onClick={() => onSelectTab('editor')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'editor' ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          PDF Editor
        </button>
        <button
          onClick={() => onSelectTab('merger')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'merger' ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Batch Merger
        </button>
        <button
          onClick={() => onSelectTab('vault')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'vault' ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Cloud Vault ({storageStats.documentCount})
        </button>
      </div>
    </header>
  );
};
