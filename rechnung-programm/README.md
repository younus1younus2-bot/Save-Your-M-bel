# Rechnung-Programm – Portal für Save Your Möbel

Ein eigenes Web-Portal für die Umzugsfirma: **Kostenvoranschläge, Rechnungen, Buchhaltung,
Mitarbeiter-Kalender, Umsatz-/Gewinn-Diagramme und E-Mail-Versand** – alles an einem Ort.

## Funktionen

| Bereich | Was geht |
|---|---|
| **Kostenvoranschläge** | Erstellen, als PDF speichern/drucken, per E-Mail senden, mit einem Klick **in eine Rechnung umwandeln** |
| **Rechnungen** | Fortlaufende Nummern (RE-2026-001 …), Status Entwurf/Offen/Bezahlt/Storniert, Überfällig-Erkennung, Zahlungserinnerung per E-Mail |
| **Positionen** | Preis, Menge und Einheit frei bestimmbar; Preisliste mit Standardleistungen zum schnellen Einfügen; Reihenfolge änderbar |
| **Prozente** | **Rabatt in %**, **Anzahlung in %** (mit Restbetrag), optional **Prozent-Anteil jeder Position** am Gesamtbetrag |
| **Datum** | Rechnungsdatum, Leistungs-/Umzugsdatum, Fälligkeit bzw. „gültig bis“ – alles frei einstellbar (Fälligkeit wird automatisch vorgeschlagen) |
| **Eigene Felder** | Feste Zusatzfelder für alle Dokumente (z. B. Auszugs-/Einzugsadresse, Etage, m³) **und** beliebige Felder direkt im einzelnen Dokument hinzufügen |
| **Steuer** | **Kleinunternehmer (§ 19 UStG)** mit automatischem Hinweis auf der Rechnung **oder** Regelbesteuerung mit 19 % / 7 % USt. – umschaltbar in den Einstellungen, alte Rechnungen bleiben unverändert |
| **Buchhaltung** | Einnahmen & Ausgaben mit Kategorien, bezahlte Rechnungen werden **automatisch gebucht**, Einnahmen-Überschuss-Rechnung (EÜR), USt.-Zahllast, CSV-Export für den Steuerberater |
| **Übersicht** | Umsatz, Kosten, Gewinn, Gewinnmarge, Diagramm pro Monat, Kosten & Umsatz nach Kategorie in Prozent, Vergleich zum Vorjahr, **Kleinunternehmer-Grenze** (25.000 € / 100.000 €) im Blick |
| **Kalender** | Monats- und Listenansicht, Termine mit Kunde, Adressen, Fahrzeug, Hinweisen; **Mitarbeiter zuordnen** (farbig), nach Mitarbeiter filtern, Team per E-Mail informieren, Export als .ics für Handy-Kalender |
| **Kunden & Mitarbeiter** | Kundenliste mit Umsatz und allen Dokumenten; Mitarbeiter mit Farbe, Kontakt, Einsätzen |
| **E-Mail** | Versand direkt aus dem Portal **von deiner eigenen Adresse** (SMTP), PDF automatisch im Anhang, Vorlagen mit Platzhaltern |
| **Design** | Farben, Schrift und Logo einstellbar; Vorlage im Stil von saveyourmobel.de (Rot `#E53935`, Montserrat) |
| **Sicherheit** | Passwortschutz, tägliche automatische Sicherung, Sicherung herunterladen / wiederherstellen |

## Test-Version (ohne Server)

`demo/rechnung-programm-test.html` ist eine Test-Version mit Beispieldaten, die komplett im Browser läuft
(Daten bleiben nur im jeweiligen Browser, kein E-Mail-Versand). Neu bauen nach Änderungen:

```bash
npm run build:demo
```

## Starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 18.

```bash
cd rechnung-programm
npm install
cp .env.example .env      # danach PORTAL_PASSWORT in .env ändern
npm start
```

Dann im Browser öffnen: **http://localhost:3000**

Beim ersten Start:
1. **Einstellungen → Firma**: Adresse, Telefon, Bankverbindung, Steuernummer, Logo eintragen
2. **Einstellungen → Steuer**: Kleinunternehmer oder mit Umsatzsteuer wählen
3. **Einstellungen → E-Mail**: SMTP-Daten deines E-Mail-Anbieters eintragen und „Verbindung testen“
4. **Einstellungen → Preisliste**: eigene Preise anpassen
5. **Mitarbeiter** anlegen

## E-Mail-Versand einrichten

Die Mails werden über dein eigenes Postfach verschickt, der Kunde sieht also deine Adresse als Absender.
Damit du von jeder Mail eine Kopie hast, trage unter **Einstellungen → E-Mail** deine Adresse als BCC ein.
Typische Einstellungen:

| Anbieter | SMTP-Server | Port |
|---|---|---|
| IONOS | smtp.ionos.de | 587 |
| Strato | smtp.strato.de | 465 |
| Gmail | smtp.gmail.com | 587 (App-Passwort nötig) |
| Outlook / Microsoft 365 | smtp.office365.com | 587 |
| GMX | mail.gmx.net | 587 |
| web.de | smtp.web.de | 587 |

## Von Kleinunternehmer zu Umsatzsteuer wechseln

Unter **Einstellungen → Steuer** auf „Regelbesteuerung“ umstellen. Ab dann:
- Preise werden **netto** eingegeben, USt. wird je Position (19 % oder 7 %) aufgeschlagen
- Rechnungen zeigen Netto, USt. und Brutto
- In der Buchhaltung wird Vorsteuer aus Ausgaben erfasst, die Übersicht zeigt die Zahllast

Bereits erstellte Rechnungen behalten ihre alte Besteuerung. Jede einzelne Rechnung kann bei Bedarf
auch manuell umgestellt werden. Den genauen Zeitpunkt bitte mit dem Steuerberater abstimmen.

## Online stellen (damit auch Mitarbeiter vom Handy zugreifen können)

Das Portal kann auf jedem Server mit Node.js laufen, z. B.:
- **Render.com / Railway.app / Fly.io** (einfach, ab ca. 0–7 € im Monat, Speicher für `data/` einrichten)
- eigener **VPS** (z. B. Hetzner, IONOS) mit `npm start` hinter HTTPS
- zu Hause auf einem **Raspberry Pi** oder PC

Wichtig: **Immer ein sicheres `PORTAL_PASSWORT` setzen** und HTTPS verwenden.

## Daten

Alle Daten liegen in `data/db.json`, tägliche Sicherungen in `data/backups/`.
Der Ordner `data/` wird **nicht** ins Git-Repository hochgeladen (Kundendaten!).
Rechnungen müssen 10 Jahre aufbewahrt werden – regelmäßig unter
**Einstellungen → Datensicherung** eine Sicherung herunterladen.

## Vorlage anpassen (z. B. an die Canva-Vorlage)

- Aufbau der Rechnung: `public/js/core.js` → Funktion `renderDokument`
- Aussehen der Rechnung: `public/css/dokument.css`
- Farben, Schrift, Logo: direkt im Portal unter **Einstellungen → Rechnungsdesign**

## Aufbau

```
rechnung-programm/
├── server.js            Server: Datenspeicherung, E-Mail-Versand, Passwortschutz
├── defaults.js          Standard-Einstellungen (Preise, Texte, Nummernkreise …)
├── demo/                Test-Version ohne Server (demo-api.js + gebaute HTML-Datei)
├── scripts/build-demo.js
├── .env.example         Vorlage für Passwort & SMTP
├── public/
│   ├── index.html       Oberfläche
│   ├── css/app.css      Design des Portals
│   ├── css/dokument.css Design der Rechnung (A4)
│   └── js/
│       ├── core.js         Berechnung, Rechnungsvorlage, PDF
│       ├── dokumente.js    Rechnungen & Kostenvoranschläge
│       ├── finanzen.js     Übersicht, Buchhaltung, Kunden
│       ├── kalender.js     Kalender & Mitarbeiter
│       ├── einstellungen.js
│       └── app.js          Navigation
└── data/                (wird automatisch angelegt, nicht im Git)
```
