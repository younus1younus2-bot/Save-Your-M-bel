#!/usr/bin/env bash
# Holt die neueste Version und startet das Portal neu. Daten bleiben erhalten.
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/aktualisieren.sh
set -euo pipefail
ZIEL="/opt/save-your-moebel"
BRANCH="$(git -C "$ZIEL" rev-parse --abbrev-ref HEAD)"

cd "$ZIEL/rechnung-programm"
cp -a data "/root/portal-sicherung-$(date +%F-%H%M)"
git -C "$ZIEL" fetch origin "$BRANCH"
git -C "$ZIEL" reset --hard "origin/$BRANCH"
cd hosting
docker compose up -d --build
docker image prune -f >/dev/null
echo "Aktualisiert. Sicherung der Daten liegt in /root/portal-sicherung-*"
