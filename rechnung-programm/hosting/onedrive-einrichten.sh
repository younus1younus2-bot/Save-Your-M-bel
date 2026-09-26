#!/usr/bin/env bash
# Lädt die tägliche Datensicherung des Portals automatisch in OneDrive hoch.
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/onedrive-einrichten.sh
set -euo pipefail

QUELLE="/opt/save-your-moebel/rechnung-programm/data/backups"
ZIEL="onedrive:Save-Your-Moebel-Portal/Sicherungen"
LOG="/var/log/portal-onedrive.log"

[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }

echo "==> 1/4 rclone installieren"
apt-get -o DPkg::Lock::Timeout=600 install -y unzip cron >/dev/null
command -v rclone >/dev/null 2>&1 || curl -fsSL https://rclone.org/install.sh | bash >/dev/null
systemctl enable --now cron >/dev/null 2>&1 || true

echo "==> 2/4 Mit OneDrive verbinden"
# Vorhandene, aber kaputte Verbindung (z. B. abgelaufenes Token) entfernen
if rclone listremotes | grep -q '^onedrive:$' && ! rclone lsd onedrive: >/dev/null 2>&1; then
  rclone config delete onedrive
fi
if ! rclone listremotes | grep -q '^onedrive:$'; then
  cat <<'HILFE'

Jetzt einmalig die Freigabe für OneDrive holen – auf deinem WINDOWS-PC:
  1. Neues PowerShell-Fenster öffnen (NICHT auf dem Server) und eingeben:
       winget install Rclone.Rclone
  2. PowerShell schließen, neu öffnen und eingeben:
       rclone authorize "onedrive"
  3. Im Browser mit deinem Microsoft-/OneDrive-Konto anmelden und zustimmen.
  4. In PowerShell erscheint ein Text zwischen  --->  und  <---End paste
     Kopiere NUR den Teil in geschweiften Klammern:  {"access_token": ... }
  5. Hier einfügen (Rechtsklick) und Enter drücken.

HILFE
  read -rp "Token: " TOKEN
  ZUGANG=$(printf '%s' "$TOKEN" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])") || { echo "Das war kein gültiger Token-Text. Bitte von { bis } kopieren und das Skript neu starten."; exit 1; }
  LAUFWERK=$(curl -fsS -H "Authorization: Bearer $ZUGANG" https://graph.microsoft.com/v1.0/me/drive) || { echo "OneDrive hat den Token abgelehnt. Bitte mit  rclone authorize \"onedrive\"  einen neuen holen und das Skript neu starten."; exit 1; }
  DRIVE_ID=$(printf '%s' "$LAUFWERK" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
  DRIVE_TYPE=$(printf '%s' "$LAUFWERK" | python3 -c "import sys, json; print(json.load(sys.stdin)['driveType'])")
  KONFIG=$(rclone config file | tail -n 1)
  mkdir -p "$(dirname "$KONFIG")"
  printf '\n[onedrive]\ntype = onedrive\ntoken = %s\ndrive_id = %s\ndrive_type = %s\n' "$(printf '%s' "$TOKEN" | tr -d '\r\n')" "$DRIVE_ID" "$DRIVE_TYPE" >> "$KONFIG"
  chmod 600 "$KONFIG"
fi
rclone mkdir "$ZIEL"
echo "Verbindung zu OneDrive steht."

echo "==> 3/4 Tägliches Hochladen einrichten (jede Nacht um 5:30 Uhr)"
cat > /etc/cron.d/portal-onedrive <<CRON
# Sicherungen des Portals nach OneDrive (Zeit in UTC). Alte Sicherungen in OneDrive nach 90 Tagen löschen.
SHELL=/bin/bash
30 3 * * * root rclone copy $QUELLE $ZIEL --log-file $LOG --log-level NOTICE && rclone delete $ZIEL --min-age 90d --log-file $LOG --log-level NOTICE
CRON
chmod 644 /etc/cron.d/portal-onedrive

echo "==> 4/4 Erste Sicherung jetzt hochladen"
rclone copy "$QUELLE" "$ZIEL" --log-file "$LOG" --log-level NOTICE
echo ""
echo "Fertig! In OneDrive liegt jetzt der Ordner  Save-Your-Moebel-Portal/Sicherungen :"
rclone ls "$ZIEL"
