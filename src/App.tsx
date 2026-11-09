import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Wifi,
  Sliders,
  Moon,
  Terminal,
  Zap,
  ArrowUp,
  ArrowDown,
  Square,
  Wind,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ShutterDevice, ShutterChannel, FreeboxStatus, PiSystemInfo } from './types/shutter';
import { ShutterCard } from './components/ShutterCard';
import { KeDeiFrame } from './components/KeDeiFrame';
import { Screensaver } from './components/Screensaver';
import { QuickPresets } from './components/QuickPresets';
import { FreeboxSetupModal } from './components/FreeboxSetupModal';
import { PiGuideModal } from './components/PiGuideModal';
import { ShutterEditorModal } from './components/ShutterEditorModal';

const INITIAL_SHUTTERS: ShutterDevice[] = [
  {
    id: 'loratap-salon-1',
    name: 'Interrupteur Double Salon',
    type: 'loratap_double',
    room: 'Salon & Séjour',
    channels: [
      {
        id: 'volet-salon-gauche',
        name: 'Baie Vitrée (Gauche)',
        room: 'Salon',
        position: 100,
        state: 'idle',
        travelTimeSeconds: 18,
      },
      {
        id: 'volet-salon-droit',
        name: 'Fenêtre Principale (Droit)',
        room: 'Salon',
        position: 100,
        state: 'idle',
        travelTimeSeconds: 16,
      },
    ],
  },
  {
    id: 'loratap-chambre-1',
    name: 'Interrupteur Double Chambres',
    type: 'loratap_double',
    room: 'Chambre & Bureau',
    channels: [
      {
        id: 'volet-chambre-parentale',
        name: 'Chambre Parentale',
        room: 'Chambre',
        position: 0,
        state: 'idle',
        travelTimeSeconds: 16,
      },
      {
        id: 'volet-bureau',
        name: 'Bureau Télétravail',
        room: 'Bureau',
        position: 50,
        state: 'idle',
        travelTimeSeconds: 15,
      },
    ],
  },
];

export default function App() {
  const [shutters, setShutters] = useState<ShutterDevice[]>(INITIAL_SHUTTERS);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number>(0);
  const [isKioskOnly, setIsKioskOnly] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get('kiosk') === '1'
  );
  const [currentTime, setCurrentTime] = useState<string>('');

  // Modals
  const [showScreensaver, setShowScreensaver] = useState<boolean>(false);
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
  const [showFreeboxModal, setShowFreeboxModal] = useState<boolean>(false);
  const [showPiGuideModal, setShowPiGuideModal] = useState<boolean>(false);
  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);

  // Freebox & System State
  const [freeboxHost, setFreeboxHost] = useState<string>('http://mafreebox.freebox.fr');
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [freeboxStatus, setFreeboxStatus] = useState<FreeboxStatus>({
    connected: true,
    boxModel: 'Freebox Delta / Pop',
    apiVersion: 'v8.0',
    authenticated: true,
    simulated: true,
  });
  const [piInfo, setPiInfo] = useState<PiSystemInfo | null>(null);

  // Inactivity timeout for auto-screensaver (3 minutes)
  const lastInteractionRef = useRef<number>(Date.now());

  // Clock tick & screensaver auto-trigger
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      // Auto screensaver check (3 minutes idle)
      if (!showScreensaver && Date.now() - lastInteractionRef.current > 180000) {
        setShowScreensaver(true);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [showScreensaver]);

  // Reset interaction timer on pointer events
  const handleUserActivity = () => {
    lastInteractionRef.current = Date.now();
  };

  // Fetch initial config and system telemetry from server
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.shutters && cfg.shutters.length > 0) {
          setShutters(cfg.shutters);
        }
        if (cfg.freeboxHost) setFreeboxHost(cfg.freeboxHost);
        if (typeof cfg.demoMode === 'boolean') setDemoMode(cfg.demoMode);
      })
      .catch(() => {});

    fetch('/api/system/pi-info')
      .then((res) => res.json())
      .then((info) => setPiInfo(info))
      .catch(() => {});
  }, []);

  // Movement animation engine for simulated shutter physical relays
  useEffect(() => {
    const interval = setInterval(() => {
      setShutters((prevShutters) => {
        let hasChanges = false;
        const updated = prevShutters.map((device) => {
          const updatedChannels = device.channels.map((chan) => {
            if (chan.state === 'opening') {
              hasChanges = true;
              const step = Math.round(100 / (chan.travelTimeSeconds * 5));
              const nextPos = Math.min(100, chan.position + Math.max(1, step));
              return {
                ...chan,
                position: nextPos,
                state: nextPos >= 100 ? ('stopped' as const) : ('opening' as const),
              };
            } else if (chan.state === 'closing') {
              hasChanges = true;
              const step = Math.round(100 / (chan.travelTimeSeconds * 5));
              const nextPos = Math.max(0, chan.position - Math.max(1, step));
              return {
                ...chan,
                position: nextPos,
                state: nextPos <= 0 ? ('stopped' as const) : ('closing' as const),
              };
            }
            return chan;
          });
          return { ...device, channels: updatedChannels };
        });

        return hasChanges ? updated : prevShutters;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Shutter command handler
  const handleShutterCommand = async (
    channelId: string,
    action: 'up' | 'down' | 'stop' | 'set_position',
    targetPosition?: number
  ) => {
    handleUserActivity();

    setShutters((prev) => {
      return prev.map((dev) => ({
        ...dev,
        channels: dev.channels.map((chan) => {
          if (chan.id === channelId) {
            if (action === 'up') return { ...chan, state: 'opening' };
            if (action === 'down') return { ...chan, state: 'closing' };
            if (action === 'stop') return { ...chan, state: 'stopped' };
            if (action === 'set_position' && typeof targetPosition === 'number') {
              return {
                ...chan,
                position: targetPosition,
                state: 'stopped',
              };
            }
          }
          return chan;
        }),
      }));
    });

    // Send to backend API
    try {
      await fetch('/api/shutters/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, action, targetPosition }),
      });
    } catch {}
  };

  // Group action (for current room or all home)
  const handleGroupAction = async (action: string, targetPos?: number) => {
    handleUserActivity();

    setShutters((prev) =>
      prev.map((dev) => ({
        ...dev,
        channels: dev.channels.map((chan) => {
          if (action === 'all_open') return { ...chan, state: 'opening' };
          if (action === 'all_close') return { ...chan, state: 'closing' };
          if (action === 'all_stop') return { ...chan, state: 'stopped' };
          if (action === 'all_preset' && typeof targetPos === 'number') {
            return { ...chan, position: targetPos, state: 'stopped' };
          }
          return chan;
        }),
      }))
    );

    try {
      await fetch('/api/shutters/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetPosition: targetPos }),
      });
    } catch {}
  };

  // Current selected Loratap double module
  const currentDevice = shutters[activeDeviceIndex] || shutters[0];

  return (
    <KeDeiFrame
      isKioskOnly={isKioskOnly}
      onToggleKioskOnly={() => setIsKioskOnly(!isKioskOnly)}
      piInfo={piInfo}
    >
      {/* 480x320 Native Resolution Screen Viewport */}
      <div
        onPointerDown={handleUserActivity}
        className="relative w-[480px] h-[320px] bg-slate-950 text-slate-100 flex flex-col justify-between p-2 select-none overflow-hidden touch-manipulation font-sans"
      >
        {/* TOP BAR (Height: ~30px) */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-1 shrink-0">
          {/* Left: Brand / System Clock */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums tracking-tight">{currentTime || '12:00'}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-300 font-medium">
              <span className="text-slate-100 font-bold">PiShutter</span>
              <span className="text-[9px] text-slate-400 font-mono">KeDei 3.5</span>
            </div>
          </div>

          {/* Right: Quick Utility Buttons (Min 36px touch targets) */}
          <div className="flex items-center gap-1">
            {/* Freebox status trigger */}
            <button
              onClick={() => setShowFreeboxModal(true)}
              className="h-7 px-1.5 flex items-center gap-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white active:bg-slate-800 transition-colors"
              title="Statut Freebox & Loratap"
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="font-mono">{demoMode ? 'Démo' : 'Freebox'}</span>
            </button>

            {/* Scenarios / Presets */}
            <button
              onClick={() => setShowPresetsModal(true)}
              className="h-7 w-7 flex items-center justify-center rounded bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 active:bg-slate-800 transition-colors"
              title="Scénarios Globaux"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>

            {/* Pi Guide */}
            <button
              onClick={() => setShowPiGuideModal(true)}
              className="h-7 w-7 flex items-center justify-center rounded bg-slate-900 border border-slate-800 text-sky-400 hover:text-sky-300 active:bg-slate-800 transition-colors"
              title="Guide Raspberry Pi & Pilote KeDei"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowEditorModal(true)}
              className="h-7 w-7 flex items-center justify-center rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:bg-slate-800 transition-colors"
              title="Configurer les volets Loratap"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Screensaver Standby */}
            <button
              onClick={() => setShowScreensaver(true)}
              className="h-7 w-7 flex items-center justify-center rounded bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 active:bg-slate-800 transition-colors"
              title="Mode Veille / Horloge Éco"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ROOM / LORATAP DEVICE SELECTOR TABS (Height: ~26px) */}
        <div className="flex items-center gap-1.5 my-1 overflow-x-auto no-scrollbar shrink-0">
          {shutters.map((dev, idx) => (
            <button
              key={dev.id}
              onClick={() => setActiveDeviceIndex(idx)}
              className={`h-6 px-2.5 rounded text-[11px] font-bold tracking-tight whitespace-nowrap transition-colors touch-manipulation flex items-center gap-1 ${
                activeDeviceIndex === idx
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:bg-slate-800'
              }`}
            >
              <span>{dev.room}</span>
              <span className="text-[9px] font-mono opacity-80">
                ({dev.channels.length} volets)
              </span>
            </button>
          ))}
        </div>

        {/* CENTRAL DECK: DUAL CHANNEL LORATAP ROLLER SHUTTER CARDS (Height: ~210px) */}
        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 overflow-hidden">
          {currentDevice && currentDevice.channels.length > 0 ? (
            currentDevice.channels.slice(0, 2).map((channel) => (
              <ShutterCard
                key={channel.id}
                channel={channel}
                onCommand={handleShutterCommand}
              />
            ))
          ) : (
            <div className="col-span-2 flex items-center justify-center text-xs text-slate-500">
              Aucun volet configuré pour cette pièce.
            </div>
          )}
        </div>

        {/* BOTTOM QUICK ACTIONS FOR CURRENT ROOM (Height: ~38px) */}
        <footer className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-slate-800/80 shrink-0">
          {/* Monter les 2 */}
          <button
            onClick={() => {
              if (currentDevice) {
                currentDevice.channels.forEach((c) => handleShutterCommand(c.id, 'up'));
              }
            }}
            className="h-8 bg-slate-900 border border-emerald-500/40 hover:bg-slate-800 active:bg-emerald-700 active:scale-95 text-slate-100 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all"
            title="Ouvrir les 2 volets de la pièce"
          >
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>OUVRIR (2)</span>
          </button>

          {/* Stop les 2 */}
          <button
            onClick={() => {
              if (currentDevice) {
                currentDevice.channels.forEach((c) => handleShutterCommand(c.id, 'stop'));
              }
            }}
            className="h-8 bg-slate-900 border border-amber-500/40 hover:bg-slate-800 active:bg-amber-700 active:scale-95 text-slate-100 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all"
            title="Arrêter les 2 volets"
          >
            <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>STOP</span>
          </button>

          {/* Descendre les 2 */}
          <button
            onClick={() => {
              if (currentDevice) {
                currentDevice.channels.forEach((c) => handleShutterCommand(c.id, 'down'));
              }
            }}
            className="h-8 bg-slate-900 border border-sky-500/40 hover:bg-slate-800 active:bg-sky-700 active:scale-95 text-slate-100 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all"
            title="Fermer les 2 volets de la pièce"
          >
            <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
            <span>FERMER (2)</span>
          </button>

          {/* Aération 50% */}
          <button
            onClick={() => {
              if (currentDevice) {
                currentDevice.channels.forEach((c) => handleShutterCommand(c.id, 'set_position', 50));
              }
            }}
            className="h-8 bg-slate-900 border border-purple-500/40 hover:bg-slate-800 active:bg-purple-700 active:scale-95 text-slate-100 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-all"
            title="Positionner à 50% pour aérer"
          >
            <Wind className="w-3.5 h-3.5 text-purple-400" />
            <span>AÉRATION</span>
          </button>
        </footer>

        {/* MODALS RENDERED INSIDE 480x320 CONTAINER */}
        {showScreensaver && (
          <Screensaver
            shutters={shutters}
            onWake={() => {
              setShowScreensaver(false);
              handleUserActivity();
            }}
          />
        )}

        {showPresetsModal && (
          <div className="absolute inset-0 z-40 bg-slate-950">
            <QuickPresets
              onGroupAction={handleGroupAction}
              onClose={() => setShowPresetsModal(false)}
            />
          </div>
        )}

        {showFreeboxModal && (
          <FreeboxSetupModal
            freeboxStatus={freeboxStatus}
            freeboxHost={freeboxHost}
            demoMode={demoMode}
            onUpdateSettings={(host, demo) => {
              setFreeboxHost(host);
              setDemoMode(demo);
              fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ freeboxHost: host, demoMode: demo }),
              });
            }}
            onClose={() => setShowFreeboxModal(false)}
          />
        )}

        {showPiGuideModal && (
          <PiGuideModal onClose={() => setShowPiGuideModal(false)} />
        )}

        {showEditorModal && (
          <ShutterEditorModal
            shutters={shutters}
            onSaveShutters={(newShutters) => {
              setShutters(newShutters);
              fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shutters: newShutters }),
              });
            }}
            onClose={() => setShowEditorModal(false)}
          />
        )}
      </div>
    </KeDeiFrame>
  );
}
