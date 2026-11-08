import React, { useState, useEffect } from 'react';
import { ShutterDevice } from '../types/shutter';
import { Moon, Sun, Lock } from 'lucide-react';

interface ScreensaverProps {
  shutters: ShutterDevice[];
  onWake: () => void;
}

export const Screensaver: React.FC<ScreensaverProps> = ({ shutters, onWake }) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const secondsString = time.toLocaleTimeString('fr-FR', { second: '2-digit' });
  const dateString = time.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Calculate overall shutter state
  const totalChannels = shutters.flatMap((s) => s.channels);
  const openCount = totalChannels.filter((c) => c.position > 50).length;
  const closedCount = totalChannels.length - openCount;

  return (
    <div
      onClick={onWake}
      className="absolute inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 cursor-pointer select-none text-slate-100 animate-fadeIn"
    >
      {/* Top subtle bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Mode Veille Éco</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-500" />
          <span>Écran Verrouillé</span>
        </div>
      </div>

      {/* Main Clock */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="flex items-baseline font-mono tracking-tighter text-white">
          <span className="text-5xl font-black tabular-nums">{timeString}</span>
          <span className="text-xl text-emerald-400 font-bold ml-1.5 tabular-nums">
            :{secondsString}
          </span>
        </div>
        <div className="text-xs text-slate-400 capitalize mt-1 tracking-wide font-medium">
          {dateString}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-3 mt-3 text-[11px] font-mono">
          <div className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{openCount} ouverts</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>{closedCount} fermés</span>
          </div>
        </div>
      </div>

      {/* Bottom Wake Touch Banner */}
      <div className="text-center py-1.5 border-t border-slate-900">
        <span className="text-[11px] text-slate-400 font-medium tracking-wide animate-pulse">
          Touchez l'écran pour déverrouiller
        </span>
      </div>
    </div>
  );
};
