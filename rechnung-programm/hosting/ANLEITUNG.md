# Portal online stellen – Schritt für Schritt (Hetzner, MC-HOST oder anderer vServer)

Am Ende läuft das Portal unter **https://portal.saveyourmöbel.de**: mit HTTPS, Datenbank, täglicher Sicherung und
automatischem Neustart. Dauer: ca. 30 Minuten.

---

## Die Datenbank

Eine **eigene Datenbank musst du nicht einrichten.** Das Portal bringt sie mit (SQLite). Sie wird beim ersten Start
automatisch angelegt:

| Datei auf dem Server | Inhalt |
|---|---|
| `/opt/save-your-moebel/rechnung-programm/data/portal.sqlite` | alle Daten (Kunden, Rechnungen, Termine, Fotos …) |
| `…/data/backups/` | tägliche Sicherung, 30 Tage lang |
| `…/.env` | Einstellungen und der Schlüssel für gespeicherte Passwörter |

Eine MySQL-Datenbank aus dem MC-HOST-Kundenbereich wird **nicht** gebraucht.

---

## Schritt 1: Den richtigen Server bestellen

Bei MC-HOST (Hetzner siehe unten) brauchst du einen **vServer / KVM-Server / Root-Server** mit:

- **Betriebssystem:** Ubuntu 24.04 (oder Ubuntu 22.04 / Debian 12)
- **mindestens 2 GB RAM** (besser 4 GB), 2 CPU-Kerne, 20 GB Speicher
- ohne Plesk oder anderes Control Panel (sie belegen die Ports 80/443)

Ungeeignet sind **Gameserver** (Minecraft usw.), **Webspace** und reines **Webhosting**, weil sich dort keine eigenen
Programme starten lassen.

Nach der Bestellung bekommst du von MC-HOST per E-Mail oder im Kundenbereich:
**IP-Adresse** (z. B. `85.123.45.67`) und das **root-Passwort**.

### Alternativ: Hetzner Cloud (ca. 4–6 € im Monat)

1. Auf **console.hetzner.cloud** registrieren. Neue Kunden müssen sich oft einmal ausweisen (z. B. mit dem Personalausweis).
2. **Neues Projekt** anlegen (z. B. „Save Your Möbel“) und darin **Server hinzufügen** wählen.
3. Folgende Einstellungen wählen:
   - **Standort:** Nürnberg oder Falkenstein (Deutschland, DSGVO)
   - **Image:** Ubuntu 24.04
   - **Typ:** Shared vCPU, x86, mit **4 GB RAM** (der kleinste passende Typ)
   - **Networking:** öffentliche IPv4 **an** (sonst ist das Portal nicht überall erreichbar)
   - **SSH-Key:** leer lassen; dann schickt Hetzner das root-Passwort per E-Mail
   - **Backups:** einschalten (ca. 20 % Aufpreis, empfohlen, dann wird der ganze Server täglich gesichert)
   - **Cloud config:** den Inhalt von [`cloud-config.yml`](cloud-config.yml) komplett einfügen. Dann richtet sich der Server
     **von selbst** ein (ca. 10 Minuten nach dem Erstellen), und **Schritt 3 und 4 entfallen**.
4. **Kostenpflichtig erstellen** klicken. Nach ca. 1 Minute stehen die IP-Adresse in der Konsole und das Passwort in der E-Mail.
   Beim ersten Login verlangt der Server ein neues Passwort.

**Hinweis zu E-Mails:** Hetzner sperrt bei neuen Konten die ausgehenden Ports 25 und 465. Im Portal unter
**Einstellungen → E-Mail** deshalb **Port 587** verwenden (geht bei IONOS, Strato, Gmail, Outlook und GMX).

---

## Schritt 2: Die Adresse auf den Server zeigen lassen (DNS)

Dort, wo deine Domain `saveyourmöbel.de` verwaltet wird (z. B. IONOS, Strato, MC-HOST), einen neuen DNS-Eintrag anlegen:

| Typ | Name / Subdomain | Wert | TTL |
|---|---|---|---|
| **A** | `portal` | IP-Adresse deines Servers | 3600 (oder Standard) |

Die Website bleibt dabei unverändert; das Portal bekommt nur die eigene Adresse `portal.saveyourmöbel.de`.
Es kann 5–60 Minuten dauern, bis der Eintrag überall bekannt ist.

---

## Schritt 3: Mit dem Server verbinden

**Windows:** Startmenü → **PowerShell** öffnen. **Mac:** Programm **Terminal** öffnen. Dann eingeben:

```bash
ssh root@85.123.45.67
```

(deine IP-Adresse statt `85.123.45.67`). Die Frage „Are you sure…“ mit `yes` beantworten, dann das root-Passwort
eingeben. Beim Tippen erscheinen keine Zeichen; das ist normal.

---

## Schritt 4: Portal installieren (ein Befehl)

Auf dem Server diesen Befehl einfügen (in PowerShell: Rechtsklick = Einfügen) und Enter drücken:

```bash
curl -fsSL https://raw.githubusercontent.com/younus1younus2-bot/Save-Your-M-bel/claude/keen-pascal-xl1emt/rechnung-programm/hosting/einrichten.sh -o einrichten.sh && bash einrichten.sh
```

Das Skript:

1. aktualisiert den Server
2. installiert Docker
3. schaltet die Firewall ein (nur SSH, HTTP, HTTPS offen)
4. lädt das Portal von GitHub
5. fragt nach der Adresse: `portal.saveyourmöbel.de` eingeben (Umlaute sind in Ordnung)
6. baut und startet Portal und HTTPS

**Falls das Repository privat ist:** Das Skript fragt dann nach einem GitHub-Token. So bekommst du einen:

1. Auf GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** öffnen.
2. Unter „Repository access“ nur **Save-Your-M-bel** auswählen.
3. Bei „Permissions“ **Contents: Read-only** setzen.

Den Link von `raw.githubusercontent.com` kannst du dann nicht nutzen. Lade in diesem Fall `einrichten.sh` auf GitHub
herunter und kopiere die Datei mit `scp einrichten.sh root@IP:` auf den Server.

---

## Schritt 5: Einloggen und einrichten

1. **https://portal.saveyourmöbel.de** öffnen.
2. Den **Chef-Zugang** anlegen (Passwort mindestens 10 Zeichen).
3. Die Checkliste auf der Übersicht abarbeiten (Bank, E-Mail, Preise) wie im [Schnellstart](../SCHNELLSTART.md).
4. **Einstellungen → Datensicherung:** eine externe E-Mail-Adresse für die tägliche Sicherung eintragen. Das ist
   wichtig, falls der Server einmal ausfällt.
5. Für jeden Mitarbeiter unter **Einstellungen → Zugänge** einen Login anlegen. Die Mitarbeiter öffnen die Adresse auf
   dem Handy und wählen „Zum Startbildschirm hinzufügen“.

---

## Später: Updates einspielen

Wenn es eine neue Version gibt, per SSH auf dem Server ausführen:

```bash
bash /opt/save-your-moebel/rechnung-programm/hosting/aktualisieren.sh
```

Vorher wird automatisch eine Kopie der Daten nach `/root/portal-sicherung-…` gelegt. Die Daten bleiben erhalten.

## Nützliche Befehle

| Was | Befehl (im Ordner `/opt/save-your-moebel/rechnung-programm/hosting`) |
|---|---|
| Läuft alles? | `docker compose ps` |
| Fehlermeldungen ansehen | `docker compose logs --tail 100 portal` |
| Neu starten | `docker compose restart` |
| Stoppen / Starten | `docker compose down` / `docker compose up -d` |
| Datenbank herunterladen (auf deinem PC ausführen) | `scp -r root@IP:/opt/save-your-moebel/rechnung-programm/data ./portal-daten` |

## Probleme

| Problem | Lösung |
|---|---|
| Seite lädt nicht / Zertifikatsfehler | DNS-Eintrag prüfen (Schritt 2), etwas warten, dann `docker compose restart caddy` |
| `port is already allocated` | Auf dem Server läuft schon ein Webserver oder Plesk. MC-HOST-Support fragen oder Server ohne Panel neu installieren |
| Build bricht ab / sehr langsam | Zu wenig RAM, 2 GB sind das Minimum |
| Umzug auf einen anderen Server | Ordner `data/` **und** die Datei `.env` mitnehmen, dann `einrichten.sh` auf dem neuen Server |

## Sicherungen automatisch in OneDrive

**Nach jeder Änderung** (neue Rechnung, Beleg, Termin …) sichert das Portal innerhalb von 1–2 Minuten: `Sicherungen/aktuell.sqlite`,
Excel, Word und die Ablage werden sofort nach OneDrive hochgeladen. OneDrive bewahrt ältere Fassungen im Versionsverlauf auf.

Jede Nacht wird die Sicherung des Tages (komplette Datenbank inkl. Fotos) nach OneDrive in den Ordner
`Save-Your-Moebel-Portal/Sicherungen` hochgeladen. Sicherungen, die älter als 90 Tage sind, werden dort gelöscht.
Zusätzlich liegen im Ordner `Save-Your-Moebel-Portal/Berichte` immer die aktuelle **Excel-Datei** (alle Umsätze, Rechnungen,
Kostenvoranschläge, Einnahmen und Ausgaben) und die **Word-Übersicht**; sie werden stündlich erneuert. Zum Bearbeiten eine Kopie
speichern, denn die Dateien werden beim nächsten Abgleich überschrieben.

Im Ordner `Save-Your-Moebel-Portal/Ablage` liegen alle angehängten Fotos und PDFs als einzelne Dateien, nach Datum sortiert:

- `Belege/2026/2026-09/2026-09-26 Ausgabe Diesel 85,00 EUR (…).jpg`: Belege von Einnahmen und Ausgaben
- `Fotos & Dateien/Aufträge/2026-09/…`, ebenso für Rechnungen & KVs, Termine, Aufgaben, Mitarbeiter und Kunden

In der Excel-Datei (Blatt „Einnahmen & Ausgaben“) führt die Spalte „Belegdatei“ direkt zur passenden Datei.
Einrichten per SSH auf dem Server:

```bash
bash /opt/save-your-moebel/rechnung-programm/hosting/aktualisieren.sh
bash /opt/save-your-moebel/rechnung-programm/hosting/onedrive-einrichten.sh
```

Das Skript erklärt den einen Schritt am Windows-PC (`winget install Rclone.Rclone`, dann `rclone authorize "onedrive"`).
Protokoll der Uploads: `cat /var/log/portal-onedrive.log`
