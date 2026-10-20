import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-7 w-full select-none items-center justify-between px-6 text-[12px] font-semibold tracking-tight text-slate-300">
      {/* Clock */}
      <span className="font-mono tabular-nums text-slate-200">{timeStr}</span>

      {/* Front camera punch-hole cutout for authentic Android phone presence */}
      <div className="absolute left-1/2 top-1.5 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#030712] ring-1 ring-slate-800 shadow-inner flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-[#0d1627]" />
      </div>

      {/* Android System Icons */}
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-[10px] font-bold font-mono tracking-wider text-sky-400">5G</span>
        <Signal className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono tabular-nums text-slate-300">98%</span>
          <BatteryMedium className="h-3.5 w-3.5 text-slate-300" />
        </div>
      </div>
    </div>
  );
};
