#!/bin/bash
# ==============================================================================
# PiShutter Freebox - Script de mise à jour simple via Git
# ==============================================================================

set -e

echo "=== Mise à jour de PiShutter Freebox ==="

# 1. Récupération des dernières modifications depuis GitHub
echo "[1/3] Récupération des modifications Git..."
git pull

# 2. Installation d'éventuelles nouvelles dépendances et build
echo "[2/3] Compilation de l'interface..."
npm install
npm run build

# 3. Redémarrage propre du service d'arrière-plan
echo "[3/3] Redémarrage du service PiShutter..."
sudo systemctl restart pishutter

echo "=== Mise à jour terminée ! L'interface est à jour. ==="
