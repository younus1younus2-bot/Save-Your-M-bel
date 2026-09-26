#!/usr/bin/env bash
# Website (PHP) auf diesem Server einrichten – im eigenen, abgeschotteten Container neben dem Portal.
# Vorher die Website-ZIP auf den Server kopieren (auf dem PC):  scp Save-Your-Moebel-Website-neu.zip root@SERVER:/root/
# Aufruf als root:  bash /opt/save-your-moebel/rechnung-programm/hosting/website-einrichten.sh [ZIP-Datei]
set -euo pipefail

ZIP="${1:-/root/Save-Your-Moebel-Website-neu.zip}"
ZIEL="/opt/save-your-moebel/website"
APP="/opt/save-your-moebel/rechnung-programm"
HOSTING="$APP/hosting"

[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
[ -f "$ZIP" ] || { echo "ZIP nicht gefunden: $ZIP"; echo "Auf dem PC hochladen mit:  scp Save-Your-Moebel-Website-neu.zip root@$(hostname -I | awk '{print $1}'):/root/"; exit 1; }
command -v unzip >/dev/null || apt-get -o DPkg::Lock::Timeout=600 install -y unzip >/dev/null

echo "==> 1/4 Adresse der Website"
EINGABE="${WEBSITE_ADRESSE:-}"
while [ -z "$EINGABE" ]; do read -rp "Adresse der Website (z. B. saveyourmobel.de): " EINGABE; done
DOMAIN=$(python3 -c "import sys; d=sys.argv[1].strip().lower().removeprefix('https://').removeprefix('http://').removeprefix('www.').strip('/. '); print(d.encode('idna').decode())" "$EINGABE")
[ -n "$DOMAIN" ] || { echo "Ungültige Adresse"; exit 1; }
PORTAL=$(grep '^DOMAIN=' "$APP/.env" | cut -d= -f2 | cut -d, -f1 | tr -d ' ')

echo "==> 2/4 Website-Dateien entpacken"
TMP=$(mktemp -d)
unzip -q "$ZIP" -d "$TMP"
QUELLE="$TMP"; [ -f "$TMP/index.php" ] || QUELLE=$(dirname "$(find "$TMP" -name index.php -maxdepth 3 | head -1)")
# Schlüssel aus einer vorhandenen Einrichtung übernehmen
ALT_SCHLUESSEL=$(grep -oP "define\('PORTAL_SCHLUESSEL', '\K[^']*" "$ZIEL/includes/portal.php" 2>/dev/null || true)
[ -d "$ZIEL" ] && cp -a "$ZIEL" "/root/website-sicherung-$(date +%F-%H%M)"
# Ordner nur leeren, nicht löschen – der laufende Container hängt an genau diesem Ordner
mkdir -p "$ZIEL" && find "$ZIEL" -mindepth 1 -delete && cp -a "$QUELLE"/. "$ZIEL"/ && rm -rf "$TMP"
# Alles, was auf eine Kunden-Website nicht gehört
rm -rf "$ZIEL/admin" "$ZIEL/includes/config.php" "$ZIEL/reset-users.php" "$ZIEL/setup.php" "$ZIEL/database.sql" "$ZIEL/privatumzug_backup.php" "$ZIEL/.same"

echo "==> 3/4 Verbindung zum Portal"
SCHLUESSEL="${PORTAL_SCHLUESSEL:-$ALT_SCHLUESSEL}"
[ "$SCHLUESSEL" = "DEIN_SCHLUESSEL" ] && SCHLUESSEL=""
# Schlüssel direkt aus dem Portal lesen (vorhanden, sobald im Portal einmal „Schlüssel anzeigen“ geklickt wurde)
if [ -z "$SCHLUESSEL" ]; then
  SCHLUESSEL=$(cd "$HOSTING" && docker compose exec -T portal node -e "const {DatabaseSync}=require('node:sqlite');const r=new DatabaseSync('/app/data/portal.sqlite').prepare(\"SELECT wert FROM einstellungen WHERE schluessel='settings'\").get();process.stdout.write((r&&JSON.parse(r.wert).geheim?.websiteSchluessel)||'')" 2>/dev/null || true)
  [ -n "$SCHLUESSEL" ] && echo "Website-Schlüssel aus dem Portal übernommen."
fi
if [ -z "$SCHLUESSEL" ]; then
  echo "Website-Schlüssel aus dem Portal einfügen (Portal → Website → „Schlüssel kopieren“), Enter zum Überspringen:"
  read -rs SCHLUESSEL; echo
fi
sed -i "s#define('PORTAL_URL', '[^']*')#define('PORTAL_URL', 'https://$PORTAL')#" "$ZIEL/includes/portal.php"
[ -n "$SCHLUESSEL" ] && sed -i "s#define('PORTAL_SCHLUESSEL', '[^']*')#define('PORTAL_SCHLUESSEL', '$SCHLUESSEL')#" "$ZIEL/includes/portal.php"
chown -R root:root "$ZIEL" && chmod -R a+rX,go-w "$ZIEL"

echo "==> 4/4 Container starten"
cat > "$HOSTING/caddy-extra/website.caddy" <<CADDY
$DOMAIN, www.$DOMAIN {
	encode zstd gzip
	@www host www.$DOMAIN
	redir @www https://$DOMAIN{uri} permanent
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
	}
	reverse_proxy website:80
}
CADDY
grep -q '^COMPOSE_PROFILES=' "$HOSTING/.env" 2>/dev/null || echo 'COMPOSE_PROFILES=website' >> "$HOSTING/.env"
cd "$HOSTING"
docker compose up -d caddy
docker compose up -d --force-recreate website
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || docker compose restart caddy

echo ""
echo "Fertig! Die Website läuft unter  https://$DOMAIN  (HTTPS kommt in 1–2 Minuten)."
echo "DNS bei MC-HOST: Subdomain (leer) und www → Typ A → $(hostname -I | awk '{print $1}')"
[ -z "$SCHLUESSEL" ] && echo "Hinweis: Ohne Website-Schlüssel kommen Anfragen noch nicht im Portal an – Skript später erneut ausführen."
true
