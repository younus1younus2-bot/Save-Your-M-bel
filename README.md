# Save Your Möbel – Website-Muster

Statische Website (HTML/CSS/JS, keine Abhängigkeiten) mit **einem einheitlichen Anfrageformular** für alle Leistungen.

## Aufbau
- `index.html` – Startseite: Hero, Leistungen, Ablauf, Anfrageformular, FAQ, Footer
- `css/style.css` – Design; Farben oben in `:root` zentral änderbar
- `js/form.js` – Formular-Logik; Einstellungen oben in `CONFIG`
- `impressum.html`, `datenschutz.html` – Platzhalter (Pflichtseiten in DE)

## Das Anfrageformular
3 Schritte statt vieler Einzelformulare:
1. **Leistung** wählen (Klick springt automatisch weiter)
2. **Details**: Beschreibung, PLZ/Ort, Wunschtermin, Etage (Zieladresse nur bei Umzug)
3. **Kontakt**: Name, Telefon, E-Mail (optional), bevorzugter Antwortweg

Klick auf eine Leistungskarte wählt die Leistung im Formular vor. Nach dem Absenden kann der Kunde Fotos direkt per WhatsApp nachschicken.

## Anpassen (vor dem Livegang)
1. In `js/form.js` → `CONFIG`: WhatsApp-Nummer, E-Mail, optional `endpoint` (z. B. Formspree), damit Anfragen ohne E-Mail-Programm des Kunden ankommen.
2. In `index.html`: Telefonnummer (`tel:`), Adresse, Einsatzgebiet (FAQ), Leistungstexte.
3. Impressum und Datenschutz ausfüllen.
