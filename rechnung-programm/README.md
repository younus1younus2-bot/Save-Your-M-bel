# Rechnung-Programm – Portal für Save Your Möbel

> **Neu hier? → [SCHNELLSTART.md](SCHNELLSTART.md)** – in 10 Minuten zur ersten Rechnung.

Web-Portal für die Umzugsfirma: **Aufträge, Kostenvoranschläge, Rechnungen, Buchhaltung, Kalender,
Kunden und Mitarbeiter** – mit E-Mail-Versand, echten PDFs und eigenen Zugängen für das Team.

## Funktionen

| Bereich | Was geht |
|---|---|
| **Auftrags-Board** | Jeder Umzug als Karte: Anfrage → KV verschickt → Zusage → Termin → Erledigt → Rechnung offen → Bezahlt. Wandert automatisch weiter, lässt sich per Maus verschieben |
| **Kostenvoranschläge & Rechnungen** | Vorlage wie die Canva-Rechnung, Umzugs-Vorlagen und Preisliste, Textbausteine, Rabatt/Anzahlung in %, eigene Felder, Deutsch oder Englisch, automatisches Speichern |
| **Rechtssicher (GoBD)** | Rechnungsnummer erst beim Abschließen (keine Lücken), danach gesperrt, Korrektur nur über Stornorechnung, Papierkorb statt Löschen, Änderungsprotokoll |
| **Kleinunternehmer / USt.** | § 19 UStG mit eigenem Hinweistext oder Regelbesteuerung mit 19 %/7 %, Grenzen-Anzeige auf der Übersicht |
| **Buchhaltung** | Bezahlte Rechnungen werden automatisch gebucht (in einem Schritt), Ausgaben mit Kategorien, EÜR, USt.-Zahllast, CSV-Export. **Excel** (Umsatz je Monat, Rechnungen, KVs, Einnahmen/Ausgaben) und **Word**-Übersicht zum Herunterladen, immer aktuell in `data/berichte/` (und auf Wunsch in OneDrive) |
| **Kalender** | Monat, Woche, Tag (Spalten je Mitarbeiter) und Liste, Termine per Drag & Drop verschieben, Warnung bei Doppelbelegung, Einsatzzettel als PDF / WhatsApp / E-Mail, Export für Handy-Kalender |
| **Kunden** | Detailseite mit Zeitleiste (alles zu einem Kunden), Notizen, Fotos vom Handy, Warnung vor Doppelten, Adressvorschläge |
| **Aufgaben & Erinnerungen** | Eigene Aufgaben plus automatische Hinweise: überfällige Rechnungen, KV ohne Antwort, Einsatz ohne Team, Termine morgen |
| **Team** | Zugänge mit Rollen: Chef sieht alles, Mitarbeiter nur ihre Einsätze (mit Navigation und „erledigt“-Meldung) |
| **Fotos** | Fotos an Aufträgen, Terminen und Kunden (direkt vom Handy, mit Beschreibung). Mitarbeiter sehen die Fotos ihrer Einsätze und können eigene hinzufügen (z. B. vorher/nachher) |
| **Bedienung** | Suche mit Strg+K, Menü „Neu erstellen“, Mehrfachauswahl (z. B. mehrere Rechnungen bezahlt), Rückgängig nach dem Löschen, Tastenkürzel (`?`), gemerkte Filter, Hilfetipps, Hell/Dunkel |
| **Handy** | Als App installierbar (PWA), Leiste unten, offline lesbar, Push-Benachrichtigungen |
| **E-Mail & PDF** | Versand über das eigene Postfach mit PDF im Anhang, Vorlagen mit Platzhaltern, Sammel-PDF, Zahlungserinnerungen |
| **Sicherheit & Daten** | Eigene Logins (verschlüsselte Passwörter, Sperre nach Fehlversuchen), verschlüsseltes SMTP-Passwort, tägliche Sicherung lokal und per E-Mail |

## Starten

Voraussetzung: [Node.js](https://nodejs.org) **ab Version 22.13**.

```bash
cd rechnung-programm
npm install
npx playwright install chromium   # für echte PDFs auf dem Server (optional, sonst erzeugt der Browser sie)
cp .env.example .env
npm start
```

Dann **http://localhost:3000** öffnen. Beim ersten Aufruf legst du den **Chef-Zugang** an.
Zugänge für Mitarbeiter: **Einstellungen → Zugänge**.

### Mit Docker

```bash
cp .env.example .env
docker compose up -d
```

Daten liegen im Ordner `data/` (Datenbank, Sicherungen, Schlüssel). Der Container startet bei Problemen automatisch neu
und enthält Chromium für die PDFs.

## Online stellen (für Mitarbeiter unterwegs)

**Schritt-für-Schritt für einen eigenen vServer (z. B. MC-HOST): [hosting/ANLEITUNG.md](hosting/ANLEITUNG.md)**.
Ein Befehl installiert Docker, Firewall, Portal und HTTPS (Caddy).

- **Render.com / Railway.app / Fly.io**: Dockerfile verwenden, dauerhaften Speicher für `/app/data` einrichten, `TRUST_PROXY=1` setzen
- **eigener Server (z. B. Hetzner, IONOS)**: `docker compose up -d` hinter HTTPS (z. B. Caddy oder Nginx)
- Status für Überwachung: `GET /health`

Wichtig: nur über **HTTPS** betreiben. Den Schlüssel `data/.schluessel` (oder `PORTAL_SCHLUESSEL`) bei einem Umzug mitnehmen,
sonst muss das SMTP-Passwort neu eingegeben werden.

## Daten und Sicherung

- Datenbank: `data/portal.sqlite` (SQLite, in Node eingebaut)
- Täglich eine Kopie in `data/backups/` (30 Tage)
- Täglich per E-Mail an eine externe Adresse: **Einstellungen → Datensicherung**
- Daten aus der ersten Version (`data/db.json`) werden beim ersten Start automatisch übernommen

Rechnungen 10 Jahre aufbewahren.

## Test-Version

`npm run build` erzeugt zusätzlich `demo/rechnung-programm-test.html`: dieselbe Oberfläche und Logik mit Beispieldaten,
komplett im Browser (ohne E-Mail). Auf GitHub wird sie bei jedem Push als Artefakt gebaut.

## Entwicklung

```bash
npm test          # 38 Tests: Berechnung, Logik, Server (inkl. E-Mail an Test-Mailserver), Browser
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # Oberfläche + Test-Version bauen
```

GitHub Actions führt bei jedem Push Lint, Formatprüfung, Tests, `npm audit` und den Build aus.

### Aufbau

```
rechnung-programm/
├── server/                 Server (Express)
│   ├── index.js            Routen, Sicherheits-Header, Anmeldung, PDF, E-Mail, Push
│   ├── speicher-sqlite.js  Datenbank (SQLite) mit Transaktionen
│   ├── auth.js             Benutzer, Rollen, Sitzungen, Sperre nach Fehlversuchen
│   ├── geheim.js           Verschlüsselung gespeicherter Passwörter
│   ├── pdf.js              echte PDFs mit Playwright
│   └── mail.js, sicherung.js, push.js, geo.js
├── src/shared/             gemeinsam für Server und Browser
│   ├── logik.js            Geschäftsregeln (Nummern, Sperre, Storno, Buchung, Aufträge)
│   ├── schema.js           Eingabeprüfung
│   ├── rechnen.js          Berechnung in Cent, Formatierung
│   ├── vorlagen.js         Rechnungsvorlagen (DE/EN), Einsatzzettel
│   └── routen.js, erinnerungen.js, defaults.js, speicher-memory.js
├── src/client/             Oberfläche (ES-Module, mit esbuild gebündelt)
│   ├── main.js, state.js, ui.js, helfer.js, pwa.js
│   ├── backend-server.js   Anbindung an den Server
│   ├── backend-demo.js     Test-Version (Speicher im Browser)
│   └── views/              Übersicht, Aufträge, Dokumente, Kalender, Kunden, …
├── public/                 index.html, CSS, Schrift, Logo, Service Worker
├── test/                   automatische Tests
└── scripts/build.js
```

### Vorlage anpassen

- Aufbau: `src/shared/vorlagen.js` (`renderSaveYourMoebel`, `renderModern`)
- Aussehen: `public/css/dokument.css`
- Farben, Schrift, Logo: im Portal unter **Einstellungen → Rechnungsdesign**
