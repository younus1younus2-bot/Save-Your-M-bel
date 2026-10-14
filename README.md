# Projekte

Dieses Repo enthält mehrere voneinander unabhängige Projekte. Jedes liegt in einem eigenen Ordner und hat dort seine eigene Anleitung (`README.md`).

| Ordner | Projekt | Art |
|---|---|---|
| [`website-save-your-moebel/`](website-save-your-moebel/) | Website Save Your Möbel (Umzüge, Entrümpelung) | statische Website (HTML/CSS/JS) |
| [`rechnung-programm/`](rechnung-programm/) | Rechnungsportal: Aufträge, Kostenvoranschläge, Rechnungen, Buchhaltung, Kalender | Node.js-Server mit Datenbank |
| [`kaiser-galabau/`](kaiser-galabau/) | Website Kaiser Garten- & Landschaftsbau | statische Website (HTML/CSS/JS) |
| [`paul-umzug/`](paul-umzug/) | Website Paul Umzug | einzelne HTML-Seite |
| [`marketing/`](marketing/) | Google-Ads-Kampagne | Text |

Die automatische Prüfung des Rechnungsportals auf GitHub (`.github/workflows/rechnung-programm.yml`) läuft nur, wenn sich etwas im Ordner `rechnung-programm/` ändert.

## Hinweise

- **Rechnungsportal auf dem Server:** Der Ordner heißt absichtlich weiter `rechnung-programm`. Der vServer liegt unter `/opt/save-your-moebel/rechnung-programm/`, und dort im Unterordner `data/` liegen alle Kunden- und Rechnungsdaten. Würde der Ordner umbenannt, startete das Portal nach dem nächsten Update ohne diese Daten.
- **Webhoster:** Für eine Website immer nur den Inhalt *ihres* Ordners hochladen, zum Beispiel alles in `website-save-your-moebel/`.
