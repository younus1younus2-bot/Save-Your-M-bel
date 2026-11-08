#!/usr/bin/env bash
# Baut die AGB-Seite (/agb.php) in alle Website-Versionen ein und verlinkt sie in der Fußzeile. Ändert sonst nichts.
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/website-agb-einbauen.sh
set -euo pipefail
main() {
  local BASIS=/opt/save-your-moebel
  local SKRIPT="$BASIS/rechnung-programm/hosting/website-zusatz/agb/agb-einbauen.py"
  [ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
  local ORDNER=()
  if [ -d "$BASIS/website-versionen" ]; then
    for v in "$BASIS"/website-versionen/*/; do [ -f "$v/includes/seite-oben.php" ] && ORDNER+=("${v%/}"); done
  elif [ -f "$BASIS/website/includes/seite-oben.php" ]; then
    ORDNER+=("$BASIS/website")
  fi
  [ ${#ORDNER[@]} -gt 0 ] || { echo "Keine Website gefunden."; exit 1; }
  for o in "${ORDNER[@]}"; do
    echo "==> $(basename "$o")"
    python3 -B "$SKRIPT" "$o"
    chmod a+r "$o/agb.php"
  done
  local DOMAIN; DOMAIN=$(awk 'NR==1{print $1}' "$BASIS/rechnung-programm/hosting/caddy-extra/website.caddy" 2>/dev/null | tr -d ','); DOMAIN="${DOMAIN:-saveyourmobel.de}"
  echo ""
  echo "Fertig. Die AGB stehen jetzt unter  https://$DOMAIN/agb.php  (Link „AGB“ unten in der Fußzeile)."
}
main "$@"
