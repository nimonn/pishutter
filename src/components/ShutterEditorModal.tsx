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
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 text-slate-100 select-none overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white tracking-tight">
              Configuration Interrupteurs Loratap Double
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
          >
            Fermer
          </button>
        </div>

        {/* Device Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {editedShutters.map((dev, idx) => (
            <button
              key={dev.id}
              onClick={() => setSelectedDeviceIndex(idx)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                selectedDeviceIndex === idx
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dev.room || dev.name}
            </button>
          ))}
          <button
            onClick={addDevice}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 flex items-center gap-1 shrink-0"
            title="Ajouter un module Loratap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </button>
        </div>

        {/* Editor Content for Current Double Switch */}
        {currentDevice && (
          <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Nom Pièce / Zone :</label>
                <input
                  type="text"
                  value={currentDevice.room}
                  onChange={(e) => {
                    const updated = [...editedShutters];
                    updated[selectedDeviceIndex].room = e.target.value;
                    setEditedShutters(updated);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Modèle Module :</label>
                <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1.5 rounded-lg block border border-slate-800">
                  Loratap Double Shutter (2 canaux)
                </span>
              </div>
            </div>

            {/* 2 Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentDevice.channels.map((chan, cIdx) => (
                <div key={chan.id} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Canal {cIdx + 1} {cIdx === 0 ? '(Gauche)' : '(Droit)'}</span>
                    <span className="text-[11px] font-mono text-emerald-400">{chan.position}%</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Nom du volet :</label>
                    <input
                      type="text"
                      value={chan.name}
                      onChange={(e) => updateChannel(cIdx, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400">Loratap Wi-Fi (Tuya Local)</span>
                      {cIdx === 1 && currentDevice.channels[0]?.tuyaDeviceId && (
                        <button
                          type="button"
                          onClick={() => {
                            const ch0 = currentDevice.channels[0];
                            const updated = [...editedShutters];
                            const ch1 = updated[selectedDeviceIndex].channels[1];
                            ch1.tuyaDeviceId = ch0.tuyaDeviceId;
                            ch1.tuyaLocalKey = ch0.tuyaLocalKey;
                            ch1.tuyaIp = ch0.tuyaIp;
                            ch1.tuyaVersion = ch0.tuyaVersion;
                            ch1.tuyaControlDps = ch1.tuyaControlDps ?? 101;
                            ch1.tuyaPositionDps = ch1.tuyaPositionDps ?? 102;
                            setEditedShutters(updated);
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold"
                        >
                          Copier ID/Clé du Canal 1
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Device ID :</label>
                        <input
                          type="text"
                          value={chan.tuyaDeviceId ?? ''}
                          placeholder="bf..."
                          onChange={(e) => updateChannel(cIdx, 'tuyaDeviceId', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Local Key (16 car.) :</label>
                        <input
                          type="text"
                          value={chan.tuyaLocalKey ?? ''}
                          placeholder="clé Tuya"
                          onChange={(e) => updateChannel(cIdx, 'tuyaLocalKey', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="col-span-2">
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">IP Locale :</label>
                        <input
                          type="text"
                          value={chan.tuyaIp ?? ''}
                          placeholder="192.168.0.xx"
                          onChange={(e) => updateChannel(cIdx, 'tuyaIp', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">DPS Cmd :</label>
                        <input
                          type="number"
                          value={chan.tuyaControlDps ?? (cIdx === 0 ? 1 : 101)}
                          onChange={(e) => updateChannel(cIdx, 'tuyaControlDps', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">DPS Pos :</label>
                        <input
                          type="number"
                          value={chan.tuyaPositionDps ?? (cIdx === 0 ? 2 : 102)}
                          onChange={(e) => updateChannel(cIdx, 'tuyaPositionDps', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                      Temps de course : {chan.travelTimeSeconds}s
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      value={chan.travelTimeSeconds}
                      onChange={(e) => updateChannel(cIdx, 'travelTimeSeconds', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              if (editedShutters.length > 1) {
                const updated = editedShutters.filter((_, idx) => idx !== selectedDeviceIndex);
                setEditedShutters(updated);
                setSelectedDeviceIndex(0);
              }
            }}
            disabled={editedShutters.length <= 1}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-bold disabled:opacity-30 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer les volets</span>
          </button>
        </div>
      </div>
    </div>
  );
};
