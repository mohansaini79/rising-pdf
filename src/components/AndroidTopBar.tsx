import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  MoreVertical,
  Smartphone,
  Maximize2,
  HardDrive,
  Info,
  ShieldCheck,
  CheckCircle,
  X
} from 'lucide-react';
import { StudioStorageStats } from '../types';

interface AndroidTopBarProps {
  storageStats: StudioStorageStats;
  isSyncing: boolean;
  isPhoneFrameMode: boolean;
  onToggleFrameMode: () => void;
  onSelectTab: (tab: 'convert' | 'editor' | 'merger' | 'history' | 'vault') => void;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  storageStats,
  isSyncing,
  isPhoneFrameMode,
  onToggleFrameMode,
  onSelectTab,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showAboutSheet, setShowAboutSheet] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <>
      <div className="flex h-14 w-full select-none items-center justify-between border-b border-slate-800/80 bg-[#0B1220]/95 px-4 backdrop-blur-md">
        {/* Left: App Logo & Brand Title */}
        <div
          onClick={() => onSelectTab('convert')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Logo container using user's uploaded logo */}
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-sky-500/30 bg-[#070D18] shadow-md group-hover:border-sky-400 transition-colors flex items-center justify-center p-0.5">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_vz4sbhvz4sbhvz4s_4b141ba5.png"
              alt="The Rising Tribe Logo"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white group-hover:text-sky-300 transition-colors leading-none">
              The Rising Tribe
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-sky-400 uppercase mt-0.5">
              App Studio
            </span>
          </div>
        </div>

        {/* Right: Cloud indicator, Phone Frame Switch, and Android 3-dot menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Cloud Sync Status */}
          <button
            onClick={() => onSelectTab('vault')}
            title={`Cloud Storage: ${formatBytes(storageStats.usedBytes)}`}
            className="flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:border-sky-500/40 transition-colors"
          >
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 text-sky-400 animate-spin" />
            ) : (
              <Cloud className="h-3 w-3 text-sky-400" />
            )}
            <span className="font-mono tabular-nums text-slate-300">
              {formatBytes(storageStats.usedBytes)}
            </span>
          </button>

          {/* Device Frame Toggle (Phone mockup vs Full screen) */}
          <button
            onClick={onToggleFrameMode}
            title={isPhoneFrameMode ? 'Switch to Full Screen App' : 'Switch to Phone Mockup Frame'}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
          >
            {isPhoneFrameMode ? (
              <Maximize2 className="h-4 w-4 text-sky-400" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
          </button>

          {/* Android Overflow 3-dot button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Material 3 Popup Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-slate-800 bg-[#0F172A] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSelectTab('vault');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <HardDrive className="h-4 w-4 text-sky-400" />
                    <span>Cloud Storage (5.0 GB)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSelectTab('history');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Activity History Log</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleFrameMode();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Smartphone className="h-4 w-4 text-amber-400" />
                    <span>{isPhoneFrameMode ? 'Full Screen App Mode' : 'Android Phone Frame'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowAboutSheet(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Info className="h-4 w-4 text-slate-400" />
                    <span>About The Rising Tribe</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* About The Rising Tribe Bottom Sheet */}
      {showAboutSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-[#0D1525] p-6 shadow-2xl">
            {/* Handle bar on mobile sheet */}
            <div className="mx-auto h-1 w-12 rounded-full bg-slate-700 mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_vz4sbhvz4sbhvz4s_4b141ba5.png"
                  alt="The Rising Tribe"
                  className="h-9 w-9 rounded-xl object-contain border border-sky-500/30"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">The Rising Tribe Studios</h3>
                  <p className="text-[11px] text-sky-400">Technology · Innovation · Community</p>
                </div>
              </div>

              <button
                onClick={() => setShowAboutSheet(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>The Rising Tribe App Studio</strong> is an enterprise-grade mobile PDF
                workstation engineered for precision document workflows:
              </p>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li>Batch Image-to-PDF compilation with zero raster degradation</li>
                <li>Full interactive PDF annotations, digital signatures, and studio stamps</li>
                <li>Seamless cloud vault integration with persistent local-first synchronization</li>
                <li>Comprehensive activity history records with audit trail tracking</li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Android Edition 2026.1</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Studio Build</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
