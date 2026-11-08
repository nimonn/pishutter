import React, { useState } from 'react';
import { ShutterDevice, ShutterChannel } from '../types/shutter';
import { Sliders, Plus, Trash2, Check, RotateCcw } from 'lucide-react';

interface ShutterEditorModalProps {
  shutters: ShutterDevice[];
  onSaveShutters: (newShutters: ShutterDevice[]) => void;
  onClose: () => void;
}

export const ShutterEditorModal: React.FC<ShutterEditorModalProps> = ({
  shutters,
  onSaveShutters,
  onClose,
}) => {
  const [editedShutters, setEditedShutters] = useState<ShutterDevice[]>(JSON.parse(JSON.stringify(shutters)));
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);

  const currentDevice = editedShutters[selectedDeviceIndex];

  const updateChannel = (channelIndex: number, field: keyof ShutterChannel, value: any) => {
    const updated = [...editedShutters];
    const dev = updated[selectedDeviceIndex];
    if (dev && dev.channels[channelIndex]) {
      dev.channels[channelIndex] = {
        ...dev.channels[channelIndex],
        [field]: value,
      };
      setEditedShutters(updated);
    }
  };

  const handleSave = () => {
    onSaveShutters(editedShutters);
    onClose();
  };

  const addDevice = () => {
    const newDev: ShutterDevice = {
      id: `loratap-${Date.now()}`,
      name: `Interrupteur Double ${editedShutters.length + 1}`,
      type: 'loratap_double',
      room: 'Nouvelle Pièce',
      channels: [
        {
          id: `channel-${Date.now()}-1`,
          name: 'Volet 1 (Gauche)',
          room: 'Pièce',
          position: 100,
          state: 'idle',
          travelTimeSeconds: 18,
        },
        {
          id: `channel-${Date.now()}-2`,
          name: 'Volet 2 (Droit)',
          room: 'Pièce',
          position: 100,
          state: 'idle',
          travelTimeSeconds: 18,
        },
      ],
    };
    const updated = [...editedShutters, newDev];
    setEditedShutters(updated);
    setSelectedDeviceIndex(updated.length - 1);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 p-2.5 flex flex-col justify-between text-slate-100 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-tight">
            Configuration Interrupteurs Loratap Double
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
        >
          Fermer
        </button>
      </div>

      {/* Device Selector Tabs */}
      <div className="flex items-center gap-1 my-1 overflow-x-auto no-scrollbar">
        {editedShutters.map((dev, idx) => (
          <button
            key={dev.id}
            onClick={() => setSelectedDeviceIndex(idx)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded whitespace-nowrap transition-colors ${
              selectedDeviceIndex === idx
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {dev.room || dev.name}
          </button>
        ))}
        <button
          onClick={addDevice}
          className="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 flex items-center gap-0.5 shrink-0"
          title="Ajouter un module Loratap"
        >
          <Plus className="w-3 h-3" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Editor Content for Current Double Switch */}
      {currentDevice && (
        <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 gap-2 mb-1.5">
            <div>
              <label className="text-[9px] font-mono text-slate-400 block">Nom Pièce / Zone :</label>
              <input
                type="text"
                value={currentDevice.room}
                onChange={(e) => {
                  const updated = [...editedShutters];
                  updated[selectedDeviceIndex].room = e.target.value;
                  setEditedShutters(updated);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-slate-400 block">Modèle Module :</label>
              <span className="text-[10px] font-mono text-emerald-400 bg-slate-950 px-2 py-1 rounded block border border-slate-800">
                Loratap Double Shutter (2 canaux)
              </span>
            </div>
          </div>

          {/* 2 Channels */}
          <div className="grid grid-cols-2 gap-2">
            {currentDevice.channels.map((chan, cIdx) => (
              <div key={chan.id} className="bg-slate-950 border border-slate-850 rounded p-1.5 space-y-1">
                <div className="text-[10px] font-bold text-slate-200 flex items-center justify-between">
                  <span>Canal {cIdx + 1} {cIdx === 0 ? '(Gauche)' : '(Droit)'}</span>
                  <span className="text-[9px] font-mono text-emerald-400">{chan.position}%</span>
                </div>

                <div>
                  <label className="text-[8px] font-mono text-slate-400 block">Nom du volet :</label>
                  <input
                    type="text"
                    value={chan.name}
                    onChange={(e) => updateChannel(cIdx, 'name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[10px] text-white"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-mono text-slate-400 block">
                    Temps de course (calibrage) : {chan.travelTimeSeconds}s
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={chan.travelTimeSeconds}
                    onChange={(e) => updateChannel(cIdx, 'travelTimeSeconds', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-slate-800 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
        <button
          onClick={() => {
            if (editedShutters.length > 1) {
              const updated = editedShutters.filter((_, idx) => idx !== selectedDeviceIndex);
              setEditedShutters(updated);
              setSelectedDeviceIndex(0);
            }
          }}
          disabled={editedShutters.length <= 1}
          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded text-[10px] font-bold disabled:opacity-30 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Supprimer</span>
        </button>

        <button
          onClick={handleSave}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Enregistrer les volets</span>
        </button>
      </div>
    </div>
  );
};
