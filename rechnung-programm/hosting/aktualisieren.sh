#!/usr/bin/env bash
# Holt die neueste Version und startet das Portal neu. Daten bleiben erhalten.
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/aktualisieren.sh
# Alles steckt in main(): Bash liest das Skript so vollständig ein, bevor git es durch die neue Fassung ersetzt.
set -euo pipefail
main() {
  local ZIEL="/opt/save-your-moebel"
  local BRANCH
  BRANCH="$(git -C "$ZIEL" rev-parse --abbrev-ref HEAD)"

  cd "$ZIEL/rechnung-programm"
  cp -a data "/root/portal-sicherung-$(date +%F-%H%M)"
  git -C "$ZIEL" fetch origin "$BRANCH"
  git -C "$ZIEL" reset --hard "origin/$BRANCH"
  # Website noch im alten Ordner? Dann zuerst auf Versionen umstellen, sonst bliebe die Website leer
  if [ -f "$ZIEL/website/index.php" ] && [ ! -f "$ZIEL/website-versionen/v1/index.php" ]; then
    bash "$ZIEL/rechnung-programm/hosting/website-versionen-einrichten.sh"
  fi
  cd hosting
  docker compose up -d --build
  docker image prune -f >/dev/null
  echo "Aktualisiert. Sicherung der Daten liegt in /root/portal-sicherung-*"
}
main "$@"
