import React, { useState } from 'react';
import { Maximize2, Monitor, Cpu, Sparkles, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { PiSystemInfo } from '../types/shutter';

interface KeDeiFrameProps {
  children: React.ReactNode;
  isKioskOnly: boolean;
  onToggleKioskOnly: () => void;
  piInfo: PiSystemInfo | null;
}

export const KeDeiFrame: React.FC<KeDeiFrameProps> = ({
  children,
  isKioskOnly,
  onToggleKioskOnly,
  piInfo,
}) => {
  const [scale, setScale] = useState<number>(1.25);
  const [showPcbDetails, setShowPcbDetails] = useState<boolean>(true);
  const [lastTouchCoords, setLastTouchCoords] = useState<{ x: number; y: number } | null>(null);

  // If in pure kiosk mode (e.g. running on the Pi 3 directly), render borderless 480x320 full viewport
  if (isKioskOnly) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
        <div
          className="relative w-[480px] h-[320px] bg-slate-950 overflow-hidden"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setLastTouchCoords({
              x: Math.round(e.clientX - rect.left),
              y: Math.round(e.clientY - rect.top),
            });
          }}
        >
          {children}

          {/* Quick toggle button to return to simulator if needed on desktop */}
          <button
            onClick={onToggleKioskOnly}
            className="absolute bottom-1 right-1 opacity-20 hover:opacity-100 bg-slate-900 text-slate-400 hover:text-white px-2 py-0.5 rounded text-[9px] font-mono border border-slate-700 z-50 transition-opacity"
            title="Quitter le mode Kiosk pur"
          >
            Quitter Kiosk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 md:p-6 select-none font-sans">
      {/* Top Simulator Control Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              KeDei 3.5" SPI TFTLCD <span className="text-slate-400 font-normal">v6.3</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Raspberry Pi 3 Model B · Contrôleur Tactile XPT2046 · Résolution 480×320
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setScale((s) => Math.max(1.0, Number((s - 0.25).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Réduire zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-300 tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.25).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Agrandir zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Kiosk Mode Toggle */}
          <button
            onClick={onToggleKioskOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium rounded-lg text-xs shadow-sm transition-all"
            title="Lancer en plein écran (Mode Kiosk pour Raspberry Pi)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Plein écran (Pi 480×320)</span>
          </button>
        </div>
      </header>

      {/* Center Device Frame */}
      <main className="my-auto py-4 flex flex-col items-center justify-center">
        {/* Physical KeDei PCB with Screen */}
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          {/* Raspberry Pi & KeDei PCB Frame */}
          <div className="relative rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-2 border-emerald-900/60 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.1)] p-4 pt-3 pb-5">
            {/* Silkscreen Brand & Spec Labels on the PCB */}
            <div className="flex items-center justify-between text-[8px] font-mono tracking-wider text-emerald-400/80 mb-2 uppercase px-1">
              <span>KeDei 3.5" TFTLCD SPI 480x320</span>
              <span>VER 6.3 (2016-11)</span>
              <span>XPT2046 TOUCH</span>
            </div>

            {/* GPIO Connector Pin header simulation (left side) */}
            <div className="absolute -left-2 top-10 bottom-10 w-2 flex flex-col justify-around py-2 opacity-50 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1 bg-amber-400/80 rounded-sm shadow-sm" />
              ))}
            </div>

            {/* Bezel around the Active TFT Display Area */}
            <div className="relative rounded-lg p-2 bg-slate-950 border border-slate-800 shadow-inner">
              {/* Exact 480x320 Display Window */}
              <div
                className="relative w-[480px] h-[320px] bg-slate-950 rounded overflow-hidden shadow-2xl"
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLastTouchCoords({
                    x: Math.round((e.clientX - rect.left) / scale),
                    y: Math.round((e.clientY - rect.top) / scale),
                  });
                }}
              >
                {/* Active App Screen */}
                {children}

                {/* Simulated Glass glare overlay (subtle) */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05]" />
              </div>
            </div>

            {/* Bottom PCB Silkscreen & Touch Calibrator Coordinates */}
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mt-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>RPi3 MODEL B GPIO PIN 1-26</span>
              </div>
              <div>
                {lastTouchCoords ? (
                  <span className="text-emerald-400 font-mono">
                    Tactile X: {lastTouchCoords.x}px | Y: {lastTouchCoords.y}px
                  </span>
                ) : (
                  <span>Contrôleur SPI XPT2046</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Telemetry Strip */}
      <footer className="w-full max-w-4xl border-t border-slate-850 pt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-medium">Raspberry Pi 3</span>
          <span>·</span>
          <span>CPU Temp: {piInfo?.cpuTemperature || '48.2 °C'}</span>
          <span>·</span>
          <span>Écran: KeDei SPI 480×320 (XPT2046)</span>
        </div>

        <div className="text-right text-slate-500">
          Sur le Raspberry Pi, lancez en mode Kiosk avec : <code className="bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">chromium-browser --kiosk http://localhost:3000</code>
        </div>
      </footer>
    </div>
  );
};
