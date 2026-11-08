#!/bin/bash
# ==============================================================================
# PiShutter Freebox - Script de mise à jour simple via Git
# ==============================================================================

set -e

echo "=== Mise à jour de PiShutter Freebox ==="

# 1. Récupération des dernières modifications depuis GitHub
echo "[1/3] Récupération des modifications Git..."
git pull

# 2. Installation de nouvelles dépendances légères de production
echo "[2/3] Vérification des modules de production..."
npm install --omit=dev --legacy-peer-deps || true

# 3. Redémarrage propre du service d'arrière-plan
echo "[3/3] Redémarrage du service PiShutter..."
sudo systemctl restart pishutter

echo "=== Mise à jour terminée ! L'interface est à jour. ==="
