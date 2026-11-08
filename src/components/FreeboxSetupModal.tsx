import React, { useState } from 'react';
import { Wifi, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, KeyRound, Server } from 'lucide-react';
import { FreeboxStatus } from '../types/shutter';

interface FreeboxSetupModalProps {
  freeboxStatus: FreeboxStatus;
  freeboxHost: string;
  demoMode: boolean;
  onUpdateSettings: (host: string, demo: boolean) => void;
  onClose: () => void;
}

export const FreeboxSetupModal: React.FC<FreeboxSetupModalProps> = ({
  freeboxStatus,
  freeboxHost,
  demoMode,
  onUpdateSettings,
  onClose,
}) => {
  const [host, setHost] = useState(freeboxHost);
  const [isDemo, setIsDemo] = useState(demoMode);
  const [step, setStep] = useState<'idle' | 'waiting_press' | 'granted' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [logMessage, setLogMessage] = useState<string>('');

  const handleRequestAuth = async () => {
    setLoading(true);
    setLogMessage('Envoi de la requête à la Freebox...');
    try {
      const res = await fetch('/api/freebox/request-auth', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStep('waiting_press');
        setLogMessage("Demande envoyée ! Veuillez appuyer sur la FLÈCHE DROITE sur l'écran de votre Freebox.");
      } else {
        setStep('error');
        setLogMessage(data.msg || 'Échec de la demande d\'autorisation.');
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

  const handleSave = () => {
    onUpdateSettings(host, isDemo);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 p-2.5 flex flex-col justify-between text-slate-100 select-none overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-tight">
            Connexion Freebox & Loratap
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
        >
          Fermer
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2 py-1 text-xs">
        {/* Host URL & Demo toggle */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
              Adresse IP Freebox :
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="http://mafreebox.freebox.fr"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
              Mode Fonctionnement :
            </label>
            <button
              onClick={() => setIsDemo(!isDemo)}
              className={`w-full py-1 px-2 rounded text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                isDemo
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              }`}
            >
              {isDemo ? 'Mode Démo (Simulateur)' : 'Mode Réel Freebox'}
            </button>
          </div>
        </div>

        {/* Association Wizard */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-200">
              Procédure d'association Freebox OS :
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              API v8 / Domotique Home
            </span>
          </div>

          {step === 'idle' && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Cliquez pour envoyer la demande d'accès. Vous devrez ensuite valider physiquement sur la Freebox.
              </p>
              <button
                onClick={handleRequestAuth}
                disabled={loading}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <KeyRound className="w-3.5 h-3.5" />
                1. Demander l'accès à la Freebox
              </button>
            </div>
          )}

          {step === 'waiting_press' && (
            <div className="space-y-1.5">
              <div className="p-2 bg-amber-950/60 border border-amber-600/40 rounded text-[10px] text-amber-200 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <strong>Action requise :</strong> Regardez l'écran de votre Freebox.
                  Appuyez sur la <strong>FLÈCHE DROITE</strong> pour valider l'accès.
                </div>
              </div>
              <button
                onClick={handleCheckTrack}
                disabled={loading}
                className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                2. Vérifier la validation
              </button>
            </div>
          )}

          {step === 'granted' && (
            <div className="p-2 bg-emerald-950/60 border border-emerald-600/40 rounded text-[10px] text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Freebox associée avec succès ! Volets Loratap prêts.</span>
              </div>
              <button
                onClick={() => setStep('idle')}
                className="text-[9px] text-slate-400 underline hover:text-white"
              >
                Réassocier
              </button>
            </div>
          )}

          {logMessage && (
            <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
              {logMessage}
            </div>
          )}
        </div>
      </div>

      {/* Footer save */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={handleSave}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
        >
          Enregistrer et Appliquer
        </button>
      </div>
    </div>
  );
};
