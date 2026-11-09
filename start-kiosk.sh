#!/bin/bash
# ==============================================================================
# PiShutter Freebox - Kiosk Launcher pour Raspberry Pi 3 & Écran KeDei
# ==============================================================================

# Attendre que le serveur Node.js réponde sur le port 3000
echo "[PiShutter Kiosk] En attente du serveur http://localhost:3000..."
for i in {1..30}; do
  if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
    echo "[PiShutter Kiosk] Serveur web prêt !"
    break
  fi
  sleep 1
done

# Détection du binaire Chromium disponible
CHROMIUM_BIN="/usr/bin/chromium-browser"
if [ ! -f "$CHROMIUM_BIN" ]; then
  CHROMIUM_BIN=$(command -v chromium-browser || command -v chromium || echo "/usr/bin/chromium")
fi

echo "[PiShutter Kiosk] Utilisation de Chromium : $CHROMIUM_BIN"

# Masquer le curseur de la souris après 0.5s d'inactivité
unclutter -idle 0.5 -root &

# Désactiver la mise en veille et économiseur d'écran X11
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Nettoyer d'éventuels verrous de session précédente
rm -rf ~/.config/chromium/Singleton* 2>/dev/null || true

# Lancement de Chromium en mode Kiosk plein écran optimisé Raspberry Pi 3
exec "$CHROMIUM_BIN" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-dev-shm-usage \
  --window-size=480,320 \
  --window-position=0,0 \
  http://localhost:3000
