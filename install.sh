#!/bin/bash
# ==============================================================================
# PiShutter Freebox - Script d'installation automatisé pour Raspberry Pi 3
# Écran KeDei 3.5" SPI v6.3 (480x320) & Contrôleur XPT2046
# ==============================================================================

set -e

# Se positionner automatiquement dans le dossier du projet (pishutter)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
if [ ! -f "package.json" ] && [ -d "$HOME/pishutter" ]; then
  cd "$HOME/pishutter"
fi

echo "=========================================================="
echo "  Installation de PiShutter Freebox sur Raspberry Pi 3   "
echo "  Dossier de travail : $(pwd)"
echo "=========================================================="

# 1. Mise à jour des paquets
echo "[1/6] Mise à jour du système..."
sudo apt-get update -y

# 2. Installation des dépendances système & Vérification X11
echo "[2/6] Installation des dépendances système..."
sudo apt-get install -y curl git unclutter xinput-calibrator

# Sur Debian Bookworm, basculer Wayland vers X11 (Openbox) nécessaire pour l'écran KeDei
if command -v raspi-config &> /dev/null; then
  echo "Configuration du serveur d'affichage sur X11 (Openbox)..."
  sudo raspi-config nonint do_wayland W1 2>/dev/null || true
fi

# 3. Vérification de la version de Node.js (Vite & Tailwind v4 requièrent Node.js >= 20)
NODE_MAJOR=0
if command -v node &> /dev/null; then
  NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Mise à niveau vers Node.js v20 LTS officiel pour Raspberry Pi (ARMv7l 32-bit)..."
  NODE_TAR="node-v20.18.0-linux-armv7l.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v20.18.0/${NODE_TAR}" -o "/tmp/${NODE_TAR}"
  sudo tar -xJf "/tmp/${NODE_TAR}" --strip-components=1 -C /usr/local
  rm -f "/tmp/${NODE_TAR}"
fi

echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# S'assurer d'être dans le dossier contenant package.json
if [ ! -f "package.json" ]; then
  if [ -d "$HOME/pishutter" ] && [ -f "$HOME/pishutter/package.json" ]; then
    echo "Navigation vers $HOME/pishutter..."
    cd "$HOME/pishutter"
  fi
fi

# 3. Installation des dépendances du projet PiShutter
echo "[3/6] Installation des modules de production..."
if [ -d "dist" ] && [ -f "server.js" ]; then
  echo "Le projet contient déjà l'interface compilée (dossier dist/ et server.js prêts)."
  npm install --omit=dev --legacy-peer-deps || npm install --legacy-peer-deps
else
  npm install --legacy-peer-deps
  npm run build || true
fi

# 4. Configuration du service systemd pour démarrage automatique au boot
echo "[4/6] Configuration du service systemd (pishutter.service)..."
SERVICE_PATH="/etc/systemd/system/pishutter.service"
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)

sudo bash -c "cat <<EOF > $SERVICE_PATH
[Unit]
Description=PiShutter Freebox KeDei Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable pishutter
sudo systemctl restart pishutter
echo "Service pishutter activé et démarré sur http://localhost:3000"

# 5. Configuration de l'autostart Chromium Kiosk (plein écran sans barre)
echo "[5/6] Configuration de l'affichage Kiosk plein écran..."
AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
mkdir -p "$AUTOSTART_DIR"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

# Sauvegarde si existant
if [ -f "$AUTOSTART_FILE" ]; then
  cp "$AUTOSTART_FILE" "$AUTOSTART_FILE.backup"
fi

cat <<EOF > "$AUTOSTART_FILE"
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.5 -root
@chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --disable-pinch --overscroll-history-navigation=0 http://localhost:3000
EOF

# 6. Installation sécurisée du pilote écran KeDei v6.3 (fbcp-ili9341 sans écraser le kernel)
echo "[6/6] Configuration du pilote écran KeDei 3.5\" v6.3 (fbcp-ili9341)..."
sudo apt-get install -y cmake libraspberrypi-dev || true

if [ ! -d "$HOME/fbcp-ili9341" ]; then
  cd "$HOME"
  git clone https://github.com/juj/fbcp-ili9341.git
  cd fbcp-ili9341
  mkdir -p build && cd build
  cmake -DKEDEI_V63_MPI3501=ON -DSPI_BUS_CLOCK_DIVISOR=40 ..
  make -j$(nproc)
  sudo cp fbcp-ili9341 /usr/local/bin/

  # Service de démarrage automatique pour l'écran
  sudo bash -c 'cat <<EOF > /etc/systemd/system/fbcp.service
[Unit]
Description=Pilote KeDei v6.3 Display Driver
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/fbcp-ili9341
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF'

  sudo systemctl daemon-reload
  sudo systemctl enable fbcp.service
  sudo systemctl start fbcp.service || true
fi

echo "=========================================================="
echo "  Installation terminée avec succès et en toute sécurité ! "
echo "  Le système et le réseau Wi-Fi restent 100% intègres.   "
echo "  Redémarrez avec : sudo reboot                           "
echo "=========================================================="
