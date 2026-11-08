import React from 'react';
import { Sun, Moon, Wind, OctagonAlert, CheckCheck } from 'lucide-react';

interface QuickPresetsProps {
  onGroupAction: (action: string, targetPosition?: number) => void;
  onClose?: () => void;
}

export const QuickPresets: React.FC<QuickPresetsProps> = ({
  onGroupAction,
  onClose,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-950 p-2.5 text-slate-100 justify-between select-none">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5">
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Scénarios Globaux (Tous Volets)
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
          >
            Retour
          </button>
        )}
      </div>

      {/* Grid of 4 large touch buttons for resistive screen */}
      <div className="grid grid-cols-2 gap-2 my-auto">
        {/* Tout Ouvrir */}
        <button
          onClick={() => {
            onGroupAction('all_open');
            if (onClose) onClose();
          }}
          className="h-20 bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-600/60 active:scale-[0.97] rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all touch-manipulation"
        >
          <Sun className="w-6 h-6 text-amber-400 mb-1" />
          <span className="text-xs font-bold text-white tracking-tight">TOUT OUVRIR</span>
          <span className="text-[10px] text-emerald-300/80 font-mono">100% · Plein Jour</span>
        </button>

        {/* Tout Fermer */}
        <button
          onClick={() => {
            onGroupAction('all_close');
            if (onClose) onClose();
          }}
          className="h-20 bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-600/60 active:scale-[0.97] rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all touch-manipulation"
        >
          <Moon className="w-6 h-6 text-indigo-400 mb-1" />
          <span className="text-xs font-bold text-white tracking-tight">TOUT FERMER</span>
          <span className="text-[10px] text-indigo-300/80 font-mono">0% · Nuit Totale</span>
        </button>

        {/* Aération / 50% */}
        <button
          onClick={() => {
            onGroupAction('all_preset', 50);
            if (onClose) onClose();
          }}
          className="h-20 bg-gradient-to-br from-sky-950/80 to-slate-900 border border-sky-600/60 active:scale-[0.97] rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all touch-manipulation"
        >
          <Wind className="w-6 h-6 text-sky-400 mb-1" />
          <span className="text-xs font-bold text-white tracking-tight">AÉRATION (50%)</span>
          <span className="text-[10px] text-sky-300/80 font-mono">Mi-hauteur / Brise</span>
        </button>

        {/* Stop Général */}
        <button
          onClick={() => {
            onGroupAction('all_stop');
            if (onClose) onClose();
          }}
          className="h-20 bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-600/60 active:scale-[0.97] rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all touch-manipulation"
        >
          <OctagonAlert className="w-6 h-6 text-rose-400 mb-1" />
          <span className="text-xs font-bold text-white tracking-tight">STOP GÉNÉRAL</span>
          <span className="text-[10px] text-rose-300/80 font-mono">Arrêt immédiat</span>
        </button>
      </div>

      <div className="text-[10px] text-slate-500 text-center font-mono py-0.5">
        Applique la commande instantanément à tous les modules Loratap
      </div>
    </div>
  );
};
