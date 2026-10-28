#!/usr/bin/env bash
# Stellt die Website einmalig auf Versionen um: Die bisherige Website wird „Version 1“, weitere Versionen kommen daneben.
# Welche Version live ist, wird danach im Portal unter „Website → Website-Versionen“ mit einem Klick umgeschaltet.
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/website-versionen-einrichten.sh
set -euo pipefail
main() {
  local BASIS=/opt/save-your-moebel
  local HOSTING="$BASIS/rechnung-programm/hosting"
  local ALT="$BASIS/website" VER="$BASIS/website-versionen" STEUER="$BASIS/website-steuerung"
  [ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }

  mkdir -p "$VER" "$STEUER"
  if [ ! -f "$VER/v1/index.php" ]; then
    [ -f "$ALT/index.php" ] || { echo "Keine Website in $ALT gefunden – bitte zuerst website-einrichten.sh ausführen."; exit 1; }
    echo "==> Bisherige Website wird Version 1"
    mkdir -p "$VER/v1" && cp -a "$ALT/." "$VER/v1/"
    printf '{"titel":"Version 1","beschreibung":"Bisherige Website","erstellt":"%s"}\n' "$(date +%F)" > "$VER/v1/_version.json"
  fi
  [ -s "$STEUER/aktiv.txt" ] || echo "version v1" > "$STEUER/aktiv.txt"
  # Das Portal (Benutzer node = 1000) schreibt die Steuerdatei, der Webserver liest sie nur
  chown -R 1000:1000 "$STEUER" && chmod 755 "$STEUER" && chmod 644 "$STEUER/aktiv.txt"
  chown -R root:root "$VER" && chmod -R a+rX,go-w "$VER"

  echo "==> Container neu bauen und starten"
  cd "$HOSTING"
  grep -q '^COMPOSE_PROFILES=' .env 2>/dev/null || echo 'COMPOSE_PROFILES=website' >> .env
  docker compose up -d --build portal website
  docker compose up -d --force-recreate website
  echo ""
  echo "Fertig. Live ist: $(sed -n 's/^version //p' "$STEUER/aktiv.txt")"
  echo "Versionen liegen in $VER – umschalten im Portal unter „Website“."
  echo "Der alte Ordner $ALT bleibt als Sicherung liegen und wird nicht mehr benutzt."
}
main "$@"
