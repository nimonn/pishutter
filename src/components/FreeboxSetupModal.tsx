import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Server,
  Search,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { DiscoveredFreeboxTile, FreeboxStatus, ShutterDevice } from '../types/shutter';

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
  const [step, setStep] = useState<'idle' | 'waiting_press' | 'granted' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [logMessage, setLogMessage] = useState<string>('');
  const [discoveredTiles, setDiscoveredTiles] = useState<DiscoveredFreeboxTile[]>([]);
  const [discoverError, setDiscoverError] = useState<string>('');

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
          setDiscoverError(
            "Aucun équipement domotique trouvé sur la Freebox. Vérifiez qu'ils apparaissent bien dans l'app Freebox Home."
          );
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

  const handleImportAll = () => {
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
            <Server className="w-5 h-5 text-emerald-400" />
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              Connexion Freebox & Appairage Interrupteurs
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
          >
            Fermer
          </button>
        </div>

        {/* Host URL & Demo toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Adresse Freebox :
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="http://mafreebox.freebox.fr"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Mode Fonctionnement :
            </label>
            <button
              onClick={() => setIsDemo(!isDemo)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                isDemo
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              }`}
            >
              {isDemo ? 'Mode Démo (Simulateur)' : 'Mode Réel Freebox'}
            </button>
          </div>
        </div>

        {/* Step 1: Association Freebox OS */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              Étape 1 — Autoriser PiShutter sur la Freebox
            </span>
            <span className="text-[10px] font-mono text-slate-400">API v8 / Home</span>
          </div>

          {step === 'idle' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-400 leading-relaxed">
                Cliquez pour envoyer la demande d'accès, puis validez avec la{' '}
                <strong className="text-slate-200">flèche droite</strong> sur l'écran de votre Freebox.
              </p>
              <button
                onClick={handleRequestAuth}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <KeyRound className="w-4 h-4" />
                1. Demander l'accès à la Freebox
              </button>
            </div>
          )}

          {step === 'waiting_press' && (
            <div className="space-y-2">
              <div className="p-2.5 bg-amber-950/60 border border-amber-600/40 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong>Action requise :</strong> Regardez l'écran de votre Freebox et appuyez sur la{' '}
                  <strong>FLÈCHE DROITE</strong> pour accepter.
                </div>
              </div>
              <button
                onClick={handleCheckTrack}
                disabled={loading}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                2. Vérifier la validation
              </button>
            </div>
          )}

          {step === 'granted' && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-600/40 rounded-lg text-xs text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Freebox associée !</span>
              </div>
              <button
                onClick={() => setStep('idle')}
                className="text-[11px] text-slate-300 underline hover:text-white"
              >
                Réassocier
              </button>
            </div>
          )}

          {logMessage && (
            <div className="text-[11px] font-mono text-slate-400 break-words">{logMessage}</div>
          )}
        </div>

        {/* Step 2: Permission Home & Discovery */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              Étape 2 — Découvrir vos interrupteurs Freebox Home
            </span>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              Dans <strong>Freebox OS</strong> (<code>http://mafreebox.freebox.fr</code> → Paramètres → Gestion des accès → Applications → <em>PiShutter</em>), cochez la permission{' '}
              <strong className="text-emerald-300">Gestion de l'alarme et maison</strong>.
            </div>
          </div>

          <button
            onClick={handleDiscoverDevices}
            disabled={discovering}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Search className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
            {discovering ? 'Recherche en cours...' : 'Scanner mes interrupteurs Freebox'}
          </button>

          {discoverError && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-700/50 rounded-lg text-xs text-rose-200">
              {discoverError}
            </div>
          )}

          {discoveredTiles.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-emerald-400">
                {discoveredTiles.length} équipement(s) détecté(s) :
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {discoveredTiles.map((t, i) => (
                  <div
                    key={`${t.nodeId}-${i}`}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{t.label}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Node #{t.nodeId} · Type: {t.type}
                        {t.positionEndpointId ? ` · Pos EP #${t.positionEndpointId}` : ''}
                        {t.upEndpointId ? ` · Up EP #${t.upEndpointId}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {onImportDiscovered && (
                <button
                  onClick={handleImportAll}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importer ces interrupteurs dans PiShutter
                </button>
              )}
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
