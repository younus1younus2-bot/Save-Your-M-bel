#!/usr/bin/env bash
# Richtet das Portal auf einem frischen Linux-Server (Ubuntu 22.04/24.04 oder Debian 12) ein.
# Aufruf als root:  bash einrichten.sh
# Ohne Rückfrage (z. B. per Cloud-Config):  PORTAL_ADRESSE=portal.saveyourmöbel.de bash einrichten.sh
set -euo pipefail

REPO="https://github.com/younus1younus2-bot/Save-Your-M-bel.git"
BRANCH="${BRANCH:-claude/keen-pascal-xl1emt}"
ZIEL="/opt/save-your-moebel"
APP="$ZIEL/rechnung-programm"

[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen (oder mit sudo)."; exit 1; }

echo "==> 1/6 System aktualisieren"
export DEBIAN_FRONTEND=noninteractive
APT="apt-get -o DPkg::Lock::Timeout=600"
$APT update -y
$APT install -y ca-certificates curl git ufw python3 openssl

echo "==> 2/6 Docker installieren"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> 3/6 Firewall: nur SSH, HTTP und HTTPS"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

echo "==> 4/6 Portal herunterladen"
if [ -d "$ZIEL/.git" ]; then
  git -C "$ZIEL" fetch origin "$BRANCH" && git -C "$ZIEL" checkout -B "$BRANCH" "origin/$BRANCH"
else
  if ! git clone --branch "$BRANCH" --depth 1 "$REPO" "$ZIEL" 2>/dev/null; then
    echo "Das Repository ist privat. Bitte einen GitHub-Token (nur Lesezugriff) eingeben:"
    read -rs TOKEN
    git clone --branch "$BRANCH" --depth 1 "https://x-access-token:${TOKEN}@github.com/younus1younus2-bot/Save-Your-M-bel.git" "$ZIEL"
    git -C "$ZIEL" remote set-url origin "https://x-access-token:${TOKEN}@github.com/younus1younus2-bot/Save-Your-M-bel.git"
  fi
fi

echo "==> 5/6 Einstellungen"
cd "$APP"
if [ ! -f .env ]; then
  EINGABE="${PORTAL_ADRESSE:-}"
  [ -n "$EINGABE" ] || read -rp "Adresse des Portals (z. B. portal.saveyourmöbel.de): " EINGABE
  DOMAIN=$(python3 -c "import sys; print(sys.argv[1].strip().lower().encode('idna').decode())" "$EINGABE")
  cp .env.example .env
  {
    echo ""
    echo "# Server-Einrichtung"
    echo "DOMAIN=$DOMAIN"
    echo "TRUST_PROXY=1"
    echo "PORTAL_SCHLUESSEL=$(openssl rand -hex 32)"
  } >> .env
  chmod 600 .env
  echo "Domain: $DOMAIN"
fi
mkdir -p data
chown -R 1000:1000 data

echo "==> 6/6 Portal bauen und starten (dauert beim ersten Mal 3–5 Minuten)"
cd hosting
docker compose up -d --build

DOMAIN=$(grep '^DOMAIN=' ../.env | cut -d= -f2)
echo ""
echo "Fertig! In 1–2 Minuten erreichbar unter:  https://$DOMAIN"
echo "Beim ersten Aufruf den Chef-Zugang anlegen."
echo "Wichtig: Die Datei $APP/.env enthält den Schlüssel – sicher aufbewahren (z. B. im Passwort-Manager)."
