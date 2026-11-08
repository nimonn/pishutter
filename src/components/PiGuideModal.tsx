import React, { useState } from 'react';
import { Terminal, Copy, Check, Cpu, HelpCircle, FileCode, Monitor } from 'lucide-react';

interface PiGuideModalProps {
  onClose: () => void;
}

export const PiGuideModal: React.FC<PiGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'os' | 'kedei' | 'install' | 'update' | 'touch'>('os');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const snippets: Record<'os' | 'kedei' | 'install' | 'update' | 'touch', string> = {
    os: `# --- ÉTAPE 1 : PREPARATION DE LA CARTE SD (Sur votre PC) ---
1. Téléchargez "Raspberry Pi Imager" sur votre PC / Mac (raspberrypi.com/software).
2. Insérez votre carte MicroSD (16 Go ou 32 Go recommandé).
3. Modèle : Choisissez "Raspberry Pi 3".
4. Système d'exploitation :
   -> Choisissez : "Raspberry Pi OS (other)"
   -> Sélectionnez : "Raspberry Pi OS (Legacy, 32-bit) with desktop"
   (C'est exactement celle que vous voyez ! L'architecture 32-bit est essentielle pour le pilote SPI KeDei v6.3).
   Note : si c'est Bookworm, notre script passera automatiquement l'affichage sur X11 (Openbox) requis par KeDei.
5. Cliquez sur la ROUE CRANTEE (Paramètres avancés) :
   - Cochez "Activer SSH" (avec mot de passe)
   - Définissez l'utilisateur (ex: "pi") et votre mot de passe
   - Configurez votre Wi-Fi (SSID + Clé)
   - Nom d'hôte (Hostname) : "pishutter"
6. Cliquez sur "Écrire". Une fois fini, insérez la carte SD dans le Pi 3 !`,

    kedei: `# --- ÉTAPE 2 : PILOTE MODERNE ET SECURISE KEDEI v6.3 (fbcp-ili9341) ---
# fbcp-ili9341 est le pilote recommandé pour KeDei v6.3 car il s'exécute dans
# l'espace utilisateur SANS écraser le noyau Linux, préservant 100% du réseau Wi-Fi.

# 1. Installer les dépendances de compilation :
sudo apt update && sudo apt install -y cmake git libraspberrypi-dev

# 2. Cloner fbcp-ili9341 et compiler avec le flag KeDei v6.3 MPI3501 :
cd ~
git clone https://github.com/juj/fbcp-ili9341.git
cd fbcp-ili9341
mkdir -p build && cd build
cmake -DKEDEI_V63_MPI3501=ON -DSPI_BUS_CLOCK_DIVISOR=40 ..
make -j$(nproc)

# 3. Tester l'écran immédiatement (l'image HDMI se clone sur le 3.5") :
sudo ./fbcp-ili9341`,

    install: `# --- ÉTAPE 3 : INSTALLATION DE PISHUTTER ---
# Cloner le dépôt ou transférer les fichiers sur le Pi :
cd ~
git clone https://github.com/nimonn/pishutter.git
cd pishutter

# Rendre exécutable et lancer le script d'installation :
chmod +x install.sh update.sh
./install.sh

# Ce script automatique :
# - Installe Node.js et npm optimisés pour Raspberry Pi armhf 32-bit
# - Configure l'affichage sur X11 (Openbox)
# - Compile l'application PiShutter et configure le service systemd
# - Configure le mode Kiosk plein écran et le pilote KeDei v6.3 !`,

    update: `# --- ÉTAPE 4 : METTRE A JOUR EN 1 COMMANDE ---
# Quand vous faites une modification sur GitHub, sur votre Pi lancez juste :
cd ~/pishutter
./update.sh

# Le script update.sh s'occupe de tout :
# 1. git pull (récupération des dernières modifs)
# 2. npm install & npm run build (compilation)
# 3. sudo systemctl restart pishutter (redémarrage instantané du service)`,

    touch: `# --- OPTIONNEL : CALIBRAGE TACTILE XPT2046 ---
# Si le tactile a un léger décalage :
sudo apt install -y xinput-calibrator
DISPLAY=:0 xinput_calibrator

# Touchez les 4 croix avec un stylet sur l'écran KeDei.
# Sauvegardez le résultat dans le fichier de config X11 :
sudo nano /etc/X11/xorg.conf.d/99-calibration.conf`,
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 p-2.5 flex flex-col justify-between text-slate-100 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-tight">
            Installation Raspberry Pi 3 & GitHub
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
        >
          Retour
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-1 my-1">
        {[
          { id: 'os', label: '1. Carte SD' },
          { id: 'kedei', label: '2. Pilote v6.3' },
          { id: 'install', label: '3. Install' },
          { id: 'update', label: '4. MAJ Git' },
          { id: 'touch', label: '5. Tactile' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-1 text-[9px] font-bold rounded transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code / Instructions Viewer */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1 mb-1">
          <span className="truncate pr-2">
            {activeTab === 'os' && '1. Choix de la distribution OS dans Raspberry Pi Imager'}
            {activeTab === 'kedei' && '2. Installation du pilote KeDei 3.5 SPI v6.3'}
            {activeTab === 'install' && '3. Clonage GitHub et lancement ./install.sh'}
            {activeTab === 'update' && '4. Mise à jour simple en 1 ligne avec ./update.sh'}
            {activeTab === 'touch' && '5. Calibrage tactile résistif XPT2046'}
          </span>
          <button
            onClick={() => copyToClipboard(snippets[activeTab], activeTab)}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold shrink-0"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>

        <pre className="flex-1 text-[9px] font-mono text-emerald-300/90 bg-slate-950 p-1.5 rounded overflow-x-auto whitespace-pre leading-relaxed border border-slate-850">
          {snippets[activeTab]}
        </pre>
      </div>

      {/* Footer tips */}
      <div className="pt-1 text-[9px] text-slate-400 flex items-center justify-between font-mono">
        <span>Pi 3 · KeDei v6.3 (480×320)</span>
        <span className="text-emerald-400 font-bold">Scripts install.sh & update.sh inclus</span>
      </div>
    </div>
  );
};
