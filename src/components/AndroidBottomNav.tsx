import React from 'react';
import { Image, Edit3, Layers, Clock, Cloud } from 'lucide-react';

interface AndroidBottomNavProps {
  activeTab: 'convert' | 'editor' | 'merger' | 'history' | 'vault';
  onSelectTab: (tab: 'convert' | 'editor' | 'merger' | 'history' | 'vault') => void;
  historyCount: number;
  vaultCount: number;
}

interface TabItem {
  id: 'convert' | 'editor' | 'merger' | 'history' | 'vault';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  historyCount,
  vaultCount,
}) => {
  const tabs: TabItem[] = [
    {
      id: 'convert',
      label: 'Convert',
      icon: Image,
    },
    {
      id: 'editor',
      label: 'Editor',
      icon: Edit3,
    },
    {
      id: 'merger',
      label: 'Merge',
      icon: Layers,
    },
    {
      id: 'history',
      label: 'History',
      icon: Clock,
      badge: historyCount > 0 ? historyCount : undefined,
    },
    {
      id: 'vault',
      label: 'Cloud Vault',
      icon: Cloud,
      badge: vaultCount > 0 ? vaultCount : undefined,
    },
  ];

  return (
    <div className="w-full shrink-0 border-t border-slate-800/80 bg-[#0A101C]/95 backdrop-blur-md pb-safe">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as any)}
              className="group flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 focus:outline-none"
            >
              {/* Material 3 active pill indicator */}
              <div
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-xs shadow-sky-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <IconComponent className="h-4 w-4" />

                {/* Badge */}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-500 px-1 font-mono text-[9px] font-bold text-slate-950">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-1 text-[11px] font-medium tracking-tight transition-colors ${
                  isActive ? 'font-bold text-sky-300' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Android Gesture Navigation Bar pill */}
      <div className="flex justify-center pb-2 pt-1">
        <div className="h-1 w-32 rounded-full bg-slate-600/70" />
      </div>
    </div>
  );
};
