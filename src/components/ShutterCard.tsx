import React from 'react';
import { ArrowUp, ArrowDown, Square } from 'lucide-react';
import { ShutterChannel } from '../types/shutter';

interface ShutterCardProps {
  channel: ShutterChannel;
  compact?: boolean;
  onCommand: (channelId: string, action: 'up' | 'down' | 'stop' | 'set_position', targetPos?: number) => void;
}

export const ShutterCard: React.FC<ShutterCardProps> = ({
  channel,
  compact = false,
  onCommand,
}) => {
  // Height of shutter slats: 0% open = 100% height covered; 100% open = 0% covered
  const closedPercentage = 100 - channel.position;

  return (
    <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl p-2 h-full justify-between shadow-sm select-none">
      {/* Header: Title & Position */}
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-800/80">
        <div className="truncate">
          <div className="text-xs font-bold text-slate-100 truncate tracking-tight">{channel.name}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate">{channel.room}</div>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400">
            {channel.position}%
          </span>
          <div className="text-[9px] uppercase tracking-wider font-mono text-slate-400">
            {channel.state === 'opening' ? '↑ Monte' : channel.state === 'closing' ? '↓ Descend' : channel.position === 0 ? 'Fermé' : channel.position === 100 ? 'Ouvert' : 'Arrêté'}
          </div>
        </div>
      </div>

      {/* Center: Visual Window Simulation + Slat Graphic */}
      <div className="relative my-1.5 h-20 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Background window light / view */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-sky-300/10 to-amber-200/20 transition-opacity duration-300"
          style={{ opacity: channel.position / 100 }}
        />

        {/* Window grid dividers */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-20 border border-slate-700">
          <div className="border-r border-b border-slate-700"></div>
          <div className="border-b border-slate-700"></div>
          <div className="border-r border-slate-700"></div>
          <div></div>
        </div>

        {/* Shutter Slats container (animated lowering/raising) */}
        <div
          className="absolute top-0 left-0 right-0 bg-slate-800/95 border-b-2 border-emerald-500/80 transition-all duration-700 ease-out flex flex-col justify-end shadow-md overflow-hidden"
          style={{ height: `${closedPercentage}%` }}
        >
          {/* Individual slat horizontal lines */}
          <div className="w-full h-full flex flex-col justify-between py-0.5 opacity-70">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-full h-[1px] bg-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.4)]" />
            ))}
          </div>
          {/* Bottom slat handle bar */}
          <div className="w-full h-2 bg-slate-700 border-t border-slate-600 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-slate-500 rounded-full" />
          </div>
        </div>

        {/* Movement badge indicator */}
        {channel.state !== 'idle' && channel.state !== 'stopped' && (
          <div className="absolute z-10 px-2 py-0.5 rounded bg-emerald-500/90 text-slate-950 font-bold text-[10px] uppercase tracking-wider animate-pulse shadow-md">
            {channel.state === 'opening' ? '▲ Montée en cours' : '▼ Descente en cours'}
          </div>
        )}
      </div>

      {/* Bottom Controls: Ergonomic Resistive Touch Hitboxes (>= 44px height) */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {/* Monter / Up */}
        <button
          onClick={() => onCommand(channel.id, 'up')}
          className="h-11 flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-slate-100 rounded-lg border border-slate-700/80 active:scale-[0.96] transition-all touch-manipulation"
          title="Ouvrir le volet"
          aria-label="Monter volet"
        >
          <ArrowUp className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">HAUT</span>
        </button>

        {/* Stop / Arrêter */}
        <button
          onClick={() => onCommand(channel.id, 'stop')}
          className="h-11 flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-amber-600 text-slate-100 rounded-lg border border-slate-700/80 active:scale-[0.96] transition-all touch-manipulation"
          title="Arrêter le mouvement"
          aria-label="Stop volet"
        >
          <Square className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">STOP</span>
        </button>

        {/* Descendre / Down */}
        <button
          onClick={() => onCommand(channel.id, 'down')}
          className="h-11 flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-100 rounded-lg border border-slate-700/80 active:scale-[0.96] transition-all touch-manipulation"
          title="Fermer le volet"
          aria-label="Descendre volet"
        >
          <ArrowDown className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">BAS</span>
        </button>
      </div>

      {/* Quick Level Presets for resistive touch tap */}
      <div className="grid grid-cols-4 gap-1 mt-1.5 pt-1 border-t border-slate-800/60">
        {[
          { label: '0%', val: 0, title: 'Fermé' },
          { label: '25%', val: 25, title: '25%' },
          { label: '50%', val: 50, title: 'Aération' },
          { label: '100%', val: 100, title: 'Ouvert' },
        ].map((preset) => (
          <button
            key={preset.val}
            onClick={() => onCommand(channel.id, 'set_position', preset.val)}
            className={`h-6 text-[10px] font-mono font-bold rounded flex items-center justify-center border transition-colors touch-manipulation ${
              channel.position === preset.val
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200 active:bg-slate-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
