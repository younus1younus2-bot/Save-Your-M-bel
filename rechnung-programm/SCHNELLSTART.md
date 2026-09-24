# Schnellstart – Rechnung-Programm für Save Your Möbel

In 10 Minuten zur ersten Rechnung.

---

## 1. Portal starten (einmalig)

Voraussetzung: [Node.js](https://nodejs.org) (Version 18 oder neuer) ist installiert.

```bash
cd rechnung-programm
npm install
cp .env.example .env
npm start
```

In der Datei `.env` bei `PORTAL_PASSWORT=` ein eigenes Passwort eintragen.
Dann im Browser öffnen: **http://localhost:3000**. Beim Öffnen fragt der Browser nach dem Passwort
(Benutzername ist egal).

> Nur ausprobieren? Die Test-Version `demo/rechnung-programm-test.html` läuft ohne Installation.

---

## 2. Einrichten (einmalig, ca. 5 Minuten)

Auf der **Übersicht** zeigt eine Checkliste, was noch fehlt. Einfach von oben nach unten durchklicken:

| Schritt | Wo | Was eintragen |
|---|---|---|
| Firmendaten | Einstellungen → Firma | Adresse, Telefon und E-Mail sind schon vorausgefüllt – nur prüfen |
| Steuer & Bank | Einstellungen → Firma | **Steuernummer**, **IBAN**, **BIC**, **Bank** (stehen unten auf jeder Rechnung) |
| Rechnungsnummer | Einstellungen → Nummern & Fristen | Nächste Nummer ist auf **HA04** eingestellt (deine letzte war HA03) – anpassen falls nötig |
| E-Mail | Einstellungen → E-Mail | Zugangsdaten deines Postfachs (siehe unten) → „Verbindung testen“ |
| Preise | Einstellungen → Preisliste | Deine Standardpreise (Anfahrt, Transportpauschale, Beladung …) |
| Mitarbeiter | Mitarbeiter → + Mitarbeiter | Name, Handynummer, E-Mail, Farbe für den Kalender |

Dein Logo und das Design deiner Canva-Vorlage sind bereits eingebaut.

---

## 3. Der tägliche Ablauf

```
Anfrage  →  Kostenvoranschlag  →  per E-Mail senden  →  Kunde sagt zu
         →  „In Rechnung umwandeln“  →  Termin im Kalender  →  Umzug
         →  Rechnung per E-Mail  →  Geld da: „Als bezahlt markieren“
```

### Kostenvoranschlag schreiben
1. **Kostenvoranschläge → + Neuer Kostenvoranschlag**
2. Kunde eintragen (wird automatisch in der Kundenliste gespeichert)
3. Positionen über **„+ aus Preisliste…“** einfügen – Preis kann jederzeit geändert werden
4. Optional: Auszugs-/Einzugsadresse, Rabatt in %, Anzahlung in %, eigene Felder („+ Feld hinzufügen“)
5. Rechts siehst du sofort die fertige Vorlage → **Speichern** → **✉ Per E-Mail senden** (PDF hängt automatisch an)

### Zusage vom Kunden
- Im Kostenvoranschlag **„→ In Rechnung umwandeln“** klicken – alle Positionen werden übernommen
- Über **⋯ → Termin im Kalender anlegen** den Umzugstermin eintragen und Mitarbeiter zuordnen
- Im Termin **„✉ Team informieren“** schickt allen Mitarbeitern die Einsatzdaten per E-Mail

### Nach dem Umzug
- Rechnung öffnen, Datum/Positionen prüfen → **✉ Per E-Mail senden**
- Wenn das Geld da ist: **„Als bezahlt markieren“** → wird automatisch in der Buchhaltung gebucht
- Überfällige Rechnungen erscheinen rot auf der Übersicht → **„Zahlungserinnerung“** senden

### Ausgaben erfassen
**Buchhaltung → + Ausgabe** (Tanken, LKW-Miete, Aushilfen, Material …). Betrag so eingeben, wie er auf dem Beleg steht.
Am Monats- oder Jahresende: **CSV-Export** für den Steuerberater.

---

## 4. E-Mail-Versand einrichten

Einstellungen → E-Mail. Die Daten bekommst du von deinem E-Mail-Anbieter:

| Anbieter | SMTP-Server | Port |
|---|---|---|
| IONOS | smtp.ionos.de | 587 |
| Strato | smtp.strato.de | 465 |
| Gmail | smtp.gmail.com | 587 (App-Passwort nötig) |
| Outlook / Microsoft 365 | smtp.office365.com | 587 |
| GMX | mail.gmx.net | 587 |

Benutzername ist meist die E-Mail-Adresse. Tipp: Bei „Kopie aller Mails an (BCC)“ deine eigene Adresse
eintragen, dann hast du jede verschickte Rechnung auch in deinem Postfach.

---

## 5. Wichtig zu wissen

- **Kleinunternehmer:** Auf jeder Rechnung steht automatisch der Hinweis zu § 19 UStG. Wächst der Umsatz
  (Grenzen siehe Übersicht: 25.000 € Vorjahr / 100.000 € laufendes Jahr), unter
  **Einstellungen → Steuer** auf „mit Umsatzsteuer“ umstellen – vorher mit dem Steuerberater sprechen.
- **Leistungsdatum:** Muss auf jeder Rechnung stehen. Das Portal trägt automatisch das Rechnungsdatum ein – bei
  Bedarf auf den Umzugstag ändern.
- **Datensicherung:** Einstellungen → Datensicherung → regelmäßig herunterladen. Rechnungen 10 Jahre aufbewahren.
- **Handy:** Das Portal funktioniert auch auf dem Handy. Damit Mitarbeiter unterwegs zugreifen können, muss es
  online laufen (z. B. Render.com oder ein eigener Server, siehe README).

---

## Hilfe

| Problem | Lösung |
|---|---|
| „E-Mail ist noch nicht eingerichtet“ | Einstellungen → E-Mail ausfüllen und „Verbindung testen“ |
| „Die Nummer … ist schon vergeben“ | Im Dokument eine andere Nummer eintragen oder Feld leer lassen (wird automatisch vergeben) |
| Seite lädt nicht | Läuft `npm start` noch? Im Terminal nach Fehlermeldungen schauen |
| Falsches Logo auf der Rechnung | Einstellungen → Firma → neues Logo hochladen (PNG) |
