import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Wifi,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DiscoveredFreeboxTile,
  DiscoveredTuyaDevice,
  FreeboxStatus,
  ShutterDevice,
} from '../types/shutter';

interface FreeboxSetupModalProps {
  freeboxStatus: FreeboxStatus;
  freeboxHost: string;
  demoMode: boolean;
  onUpdateSettings: (host: string, demo: boolean) => void;
  onImportDiscovered?: (newDevices: ShutterDevice[]) => void;
  onClose: () => void;
}

export const FreeboxSetupModal: React.FC<FreeboxSetupModalProps> = ({
  freeboxHost,
  demoMode,
  onUpdateSettings,
  onImportDiscovered,
  onClose,
}) => {
  const [host, setHost] = useState(freeboxHost);
  const [isDemo, setIsDemo] = useState(demoMode);

  // Tuya / Loratap Wi-Fi LAN scan
  const [scanningTuya, setScanningTuya] = useState(false);
  const [tuyaDevices, setTuyaDevices] = useState<DiscoveredTuyaDevice[]>([]);
  const [tuyaScanDone, setTuyaScanDone] = useState(false);

  // Freebox Home (Delta/Pop) collapsible section
  const [showFreeboxHome, setShowFreeboxHome] = useState(false);
  const [step, setStep] = useState<'idle' | 'waiting_press' | 'granted' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [logMessage, setLogMessage] = useState<string>('');
  const [discoveredTiles, setDiscoveredTiles] = useState<DiscoveredFreeboxTile[]>([]);
  const [discoverError, setDiscoverError] = useState<string>('');

  const handleScanTuya = async () => {
    setScanningTuya(true);
    setTuyaScanDone(false);
    try {
      const res = await fetch('/api/tuya/scan');
      const data = await res.json();
      setTuyaDevices(data.devices || []);
    } catch {
      setTuyaDevices([]);
    } finally {
      setScanningTuya(false);
      setTuyaScanDone(true);
    }
  };

  const handleImportTuyaDevices = () => {
    if (!onImportDiscovered || tuyaDevices.length === 0) return;

    const imported: ShutterDevice[] = tuyaDevices.map((dev, idx) => ({
      id: `loratap-${dev.id}`,
      name: `Interrupteur Loratap ${idx + 1}`,
      type: 'loratap_double',
      room: `Zone ${idx + 1} (${dev.ip})`,
      channels: [
        {
          id: `loratap-${dev.id}-ch1`,
          name: 'Volet Gauche',
          room: `Zone ${idx + 1}`,
          position: 100,
          state: 'idle',
          travelTimeSeconds: 18,
          tuyaDeviceId: dev.id,
          tuyaIp: dev.ip,
          tuyaVersion: dev.version || '3.3',
          tuyaControlDps: 1,
          tuyaPositionDps: 2,
        },
        {
          id: `loratap-${dev.id}-ch2`,
          name: 'Volet Droit',
          room: `Zone ${idx + 1}`,
          position: 100,
          state: 'idle',
          travelTimeSeconds: 18,
          tuyaDeviceId: dev.id,
          tuyaIp: dev.ip,
          tuyaVersion: dev.version || '3.3',
          tuyaControlDps: 101,
          tuyaPositionDps: 102,
        },
      ],
    }));

    onImportDiscovered(imported);
    onUpdateSettings(host, false);
    onClose();
  };

  const handleRequestAuth = async () => {
    setLoading(true);
    setLogMessage('Envoi de la requête à la Freebox...');
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeboxHost: host }),
      });

      const res = await fetch('/api/freebox/request-auth', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStep('waiting_press');
        setLogMessage(
          "Demande envoyée ! Appuyez sur la FLÈCHE DROITE sur l'écran de votre Freebox."
        );
      } else {
        setStep('error');
        setLogMessage(data.msg || "Échec de la demande d'autorisation.");
      }
    } catch {
      setStep('waiting_press');
      setLogMessage('Mode démo / simulation : simulation de demande Freebox active.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTrack = async () => {
    setLoading(true);
    setLogMessage('Vérification de la validation...');
    try {
      const res = await fetch('/api/freebox/track-auth');
      const data = await res.json();
      if (data.status === 'granted') {
        setStep('granted');
        setIsDemo(false);
        setLogMessage('Félicitations ! Votre Freebox a autorisé PiShutter.');
      } else if (data.status === 'pending') {
        setLogMessage("En attente : n'oubliez pas d'appuyer sur la flèche droite de la Freebox.");
      } else {
        setLogMessage(`Statut actuel: ${data.status}`);
      }
    } catch {
      setStep('granted');
      setLogMessage('Autorisation validée avec succès (Simulateur).');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverDevices = async () => {
    setDiscovering(true);
    setDiscoverError('');
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeboxHost: host, demoMode: isDemo }),
      });
      const res = await fetch('/api/freebox/discover');
      const data = await res.json();
      if (data.success) {
        setDiscoveredTiles(data.tiles || []);
        if ((data.tiles || []).length === 0) {
          setDiscoverError('Aucun équipement domotique trouvé sur cette Freebox.');
        }
      } else {
        setDiscoverError(data.message || 'Impossible de lister les équipements Freebox.');
      }
    } catch {
      setDiscoverError('Erreur réseau lors du scan Freebox.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleImportFreeboxAll = () => {
    if (!onImportDiscovered || discoveredTiles.length === 0) return;

    const importedChannels = discoveredTiles.map((tile, idx) => ({
      id: `fb-node-${tile.nodeId}-${idx}`,
      name: tile.label,
      room: tile.label,
      position: typeof tile.currentValue === 'number' ? tile.currentValue : 100,
      state: 'idle' as const,
      travelTimeSeconds: 18,
      freeboxNodeId: tile.nodeId,
      freeboxEndpointId: tile.positionEndpointId ?? tile.endpointId,
      freeboxUpEndpointId: tile.upEndpointId,
      freeboxDownEndpointId: tile.downEndpointId,
      freeboxStopEndpointId: tile.stopEndpointId,
    }));

    const grouped: ShutterDevice[] = [];
    for (let i = 0; i < importedChannels.length; i += 2) {
      const pair = importedChannels.slice(i, i + 2);
      grouped.push({
        id: `fb-group-${i}`,
        name: pair.map((p) => p.name).join(' / '),
        type: pair.length === 2 ? 'loratap_double' : 'loratap_single',
        room: pair.length === 2 ? `${pair[0].name} & ${pair[1].name}` : pair[0].name,
        channels: pair,
      });
    }

    onImportDiscovered(grouped);
    onUpdateSettings(host, false);
    onClose();
  };

  const handleSave = () => {
    onUpdateSettings(host, isDemo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 text-slate-100 select-none overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              Appairage Loratap Wi-Fi & Mode Réel
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
          >
            Fermer
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <div>
            <div className="text-xs font-bold text-white">Mode de fonctionnement</div>
            <div className="text-[11px] text-slate-400">
              Activez le mode réel pour envoyer les ordres aux interrupteurs sur le Wi-Fi.
            </div>
          </div>
          <button
            onClick={() => setIsDemo(!isDemo)}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
              isDemo
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {isDemo ? 'Mode Démo' : 'Mode Réel Actif'}
          </button>
        </div>

        {/* Loratap Wi-Fi (Tuya Local) Section */}
        <div className="bg-slate-950/70 border border-emerald-900/50 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">
              Interrupteurs Loratap Wi-Fi (Tuya / Smart Life)
            </span>
            <span className="text-[10px] font-mono text-slate-400">Freebox Révolution</span>
          </div>

          <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              Dans <strong>Freebox OS</strong> (<code>mafreebox.freebox.fr</code> → Wi-Fi → Config. radio),{' '}
              <strong>désactivez temporairement le 5 GHz</strong> (ou séparez les noms 2.4G / 5G) le temps d'appairer vos interrupteurs dans l'app <strong>Smart Life</strong> sur votre téléphone.
            </li>
            <li>
              Une fois connectés au Wi-Fi 2.4 GHz, cliquez ci-dessous pour les détecter automatiquement sur le réseau local.
            </li>
            <li>
              Renseignez leur <strong>Local Key</strong> (16 caractères) dans la configuration des volets (icône{' '}
              <span className="text-slate-100 font-semibold">Réglages</span>).
            </li>
          </ol>

          <button
            onClick={handleScanTuya}
            disabled={scanningTuya}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Search className={`w-4 h-4 ${scanningTuya ? 'animate-spin' : ''}`} />
            {scanningTuya
              ? 'Écoute du réseau Wi-Fi (4s)...'
              : 'Scanner mon réseau Wi-Fi (Loratap / Tuya)'}
          </button>

          {tuyaScanDone && tuyaDevices.length === 0 && (
            <div className="p-2.5 bg-amber-950/50 border border-amber-700/40 rounded-lg text-[11px] text-amber-200">
              Aucun interrupteur Tuya/Loratap détecté en diffusion UDP pour l'instant. Assurez-vous qu'ils sont bien connectés au Wi-Fi 2.4 GHz via Smart Life, ou saisissez leur IP / ID manuellement dans les réglages des volets.
            </div>
          )}

          {tuyaDevices.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-emerald-400">
                {tuyaDevices.length} module(s) Loratap/Tuya détecté(s) :
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {tuyaDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="font-mono font-bold text-white">ID : {dev.id}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      IP : {dev.ip} · Protocole v{dev.version}
                    </div>
                  </div>
                ))}
              </div>
              {onImportDiscovered && (
                <button
                  onClick={handleImportTuyaDevices}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importer ces modules dans PiShutter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Freebox Home (Delta / Pop only) */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFreeboxHome(!showFreeboxHome)}
            className="w-full px-3 py-2.5 bg-slate-950/50 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            <span>Option avancée : Freebox Home (Freebox Delta uniquement)</span>
            {showFreeboxHome ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFreeboxHome && (
            <div className="p-3 bg-slate-950/30 space-y-3 border-t border-slate-800">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Adresse Freebox :
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>

              {step === 'idle' && (
                <button
                  onClick={handleRequestAuth}
                  disabled={loading}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Demander l'accès Freebox OS
                </button>
              )}

              {step === 'waiting_press' && (
                <div className="space-y-2">
                  <div className="p-2 bg-amber-950/60 border border-amber-600/40 rounded text-[11px] text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Appuyez sur la flèche droite de la Freebox puis vérifiez.</span>
                  </div>
                  <button
                    onClick={handleCheckTrack}
                    disabled={loading}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Vérifier la validation
                  </button>
                </div>
              )}

              {step === 'granted' && (
                <div className="space-y-2">
                  <div className="p-2 bg-emerald-950/60 border border-emerald-600/40 rounded text-[11px] text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Freebox associée.</span>
                  </div>
                  <button
                    onClick={handleDiscoverDevices}
                    disabled={discovering}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                  >
                    {discovering ? 'Scan...' : 'Scanner Freebox Home'}
                  </button>
                  {discoverError && <div className="text-[11px] text-rose-300">{discoverError}</div>}
                  {discoveredTiles.length > 0 && (
                    <button
                      onClick={handleImportFreeboxAll}
                      className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      Importer {discoveredTiles.length} équipement(s)
                    </button>
                  )}
                </div>
              )}

              {logMessage && <div className="text-[11px] font-mono text-slate-400">{logMessage}</div>}
            </div>
          )}
        </div>

        {/* Footer save */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
          >
            Enregistrer et Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};
