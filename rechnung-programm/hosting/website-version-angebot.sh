#!/usr/bin/env bash
# Legt eine neue Website-Version an: Kopie der Live-Version + Team-Fotos als Hintergrund + Aktions-Hinweis („20 % auf alles“).
# Die neue Version ist danach NICHT live – erst ansehen (Vorschau), dann im Portal unter „Website“ live schalten.
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/website-version-angebot.sh [NAME] [PROZENT] [Optionen]
#   z. B.          bash …/website-version-angebot.sh v2 20                      (Fotos + Aktion)
#                  bash …/website-version-angebot.sh v3 20 --mehr-bilder        (zusätzlich Fotos auf allen Seiten, Maskottchen, Schutz-Fotos)
#                  bash …/website-version-angebot.sh v2 20 --bis 30.11.2026     (Aktion mit Enddatum)
set -euo pipefail
main() {
  local NAME="${1:-v2}" PROZENT="${2:-20}"
  shift $(( $# < 2 ? $# : 2 ))
  local EXTRA=("$@") BIS="" MEHR=""
  for ((i = 0; i < ${#EXTRA[@]}; i++)); do
    case "${EXTRA[$i]}" in
      --bis) BIS="${EXTRA[$((i + 1))]:-}" ;;
      --mehr-bilder) MEHR=" + Maskottchen + Schutz-Fotos" ;;
    esac
  done
  local BASIS=/opt/save-your-moebel
  local HOSTING="$BASIS/rechnung-programm/hosting"
  local VER="$BASIS/website-versionen" STEUER="$BASIS/website-steuerung"
  [ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
  [[ "$NAME" =~ ^[a-z0-9-]{1,40}$ ]] || { echo "Ungültiger Name: $NAME (nur a-z, 0-9, -)"; exit 1; }
  [[ "$PROZENT" =~ ^[0-9]{1,2}$ ]] || { echo "Ungültige Prozentzahl: $PROZENT"; exit 1; }
  [ -d "$VER" ] || { echo "Versionen sind noch nicht eingerichtet – zuerst website-versionen-einrichten.sh ausführen."; exit 1; }
  local AKTIV; AKTIV=$(sed -n 's/^version //p' "$STEUER/aktiv.txt" 2>/dev/null | head -1); AKTIV="${AKTIV:-v1}"
  [ "$NAME" != "$AKTIV" ] || { echo "$NAME ist gerade live – bitte einen anderen Namen wählen."; exit 1; }
  [ -f "$VER/$AKTIV/index.php" ] || { echo "Live-Version $AKTIV nicht gefunden."; exit 1; }

  echo "==> $NAME aus der Live-Version $AKTIV erstellen"
  rm -rf "${VER:?}/$NAME.neu" && cp -a "$VER/$AKTIV" "$VER/$NAME.neu"
  python3 -B "$HOSTING/website-zusatz/angebot/angebot-einbauen.py" "$VER/$NAME.neu" --prozent "$PROZENT" "${EXTRA[@]}"
  local NR="${NAME#v}" TITEL="$NAME"; [[ "$NR" =~ ^[0-9]+$ ]] && TITEL="Version $NR"
  printf '{"titel":"%s","beschreibung":"Team-Fotos im Hintergrund + Aktion %s %% auf alle Leistungen%s%s","erstellt":"%s"}\n' \
    "$TITEL" "$PROZENT" "${BIS:+ bis $BIS}" "$MEHR" "$(date +%F)" > "$VER/$NAME.neu/_version.json"
  chown -R root:root "$VER/$NAME.neu" && chmod -R a+rX,go-w "$VER/$NAME.neu"
  rm -rf "${VER:?}/$NAME" && mv "$VER/$NAME.neu" "$VER/$NAME"

  local DOMAIN; DOMAIN=$(awk 'NR==1{print $1}' "$HOSTING/caddy-extra/website.caddy" 2>/dev/null | tr -d ','); DOMAIN="${DOMAIN:-saveyourmobel.de}"
  echo ""
  echo "Fertig – $TITEL ist angelegt, aber noch NICHT live."
  echo "Vorschau (nur für Sie):  https://$DOMAIN/?vorschau=$NAME"
  echo "Vorschau beenden:        https://$DOMAIN/?vorschau=aus"
  echo "Live schalten:           Portal → Website → Website-Versionen → „Live schalten“"
}
main "$@"
