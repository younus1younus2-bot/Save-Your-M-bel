# Schnellstart – Rechnung-Programm für Save Your Möbel

In 10 Minuten zur ersten Rechnung.

---

## 1. Portal starten (einmalig)

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.13.

```bash
cd rechnung-programm
npm install
npx playwright install chromium
cp .env.example .env
npm start
```

Im Browser **http://localhost:3000** öffnen und den **Chef-Zugang** anlegen (Name, E-Mail, Passwort mit mind. 10 Zeichen).

> Nur ausprobieren? Die Test-Version (`npm run build` → `demo/rechnung-programm-test.html`) läuft ohne Server.

---

## 2. Einrichten (einmalig, ca. 5 Minuten)

Auf der **Übersicht** zeigt eine Checkliste, was noch fehlt:

| Schritt | Wo | Was eintragen |
|---|---|---|
| Firmendaten | Einstellungen → Firma | Adresse, Telefon, E-Mail sind vorausgefüllt – nur prüfen |
| Steuer & Bank | Einstellungen → Firma | **Steuernummer**, **IBAN**, **BIC**, **Bank** |
| Rechnungsnummer | Einstellungen → Nummern & Fristen | Nächste Nummer steht auf **HA04** (deine letzte war HA03) |
| E-Mail | Einstellungen → E-Mail | Zugangsdaten deines Postfachs → „Verbindung testen“ |
| Preise | Einstellungen → Preisliste / Umzugs-Vorlagen | Deine Standardpreise und typischen Umzüge |
| Team | Mitarbeiter → + Mitarbeiter, dann Einstellungen → Zugänge | Mitarbeiter anlegen und jedem einen eigenen Login geben |
| Sicherung | Einstellungen → Datensicherung | Adresse für die tägliche Sicherung per E-Mail |

---

## 3. Der tägliche Ablauf

```
Anfrage → Kostenvoranschlag → senden → Zusage → „→ Rechnung“ → Termin → Umzug
       → Rechnung abschließen & senden → Geld da: „Bezahlt“
```

Alles davon siehst du im **Auftrags-Board** (Menü „Aufträge“): Jeder Umzug ist eine Karte, die automatisch weiterwandert.

### Kostenvoranschlag schreiben
1. **Neu erstellen → Kostenvoranschlag** (oder Taste **N** in der Liste)
2. Kunde eintragen – bei bekannten Kunden erscheint ein Hinweis „gibt es schon“
3. **Vorlage einfügen…** (z. B. „3-Zimmer-Wohnung mit Montage“) oder Positionen aus der **Preisliste**
4. Optional: Auszugs-/Einzugsadresse → **Entfernung berechnen** → Fahrtkosten hinzufügen
5. **✉ Senden** – das PDF hängt automatisch an. Gespeichert wird von selbst.

### Zusage vom Kunden
- Im Kostenvoranschlag **→ Rechnung** klicken – ein Rechnungsentwurf mit allen Positionen entsteht
- **⋯ → Termin im Kalender anlegen**, Mitarbeiter auswählen, **✉ Team informieren**
- Am Vortag: **Kalender → Einsatzzettel** – als PDF, per WhatsApp oder E-Mail ans Team

### Nach dem Umzug
- Rechnung prüfen → **Abschließen** (bekommt jetzt ihre Nummer und ist danach gesperrt) → **✉ Senden**
- Geld da: **Bezahlt** – wird automatisch in der Buchhaltung gebucht
- Mehrere auf einmal: in der Rechnungsliste Kästchen anklicken → „Als bezahlt markieren“
- Fehler in einer abgeschlossenen Rechnung? **⋯ → Stornieren**, danach eine neue Rechnung erstellen

### Ausgaben erfassen
**Neu erstellen → Ausgabe** (Tanken, LKW-Miete, Aushilfen, Material …). Betrag so eingeben, wie er auf dem Beleg steht.
Für den Steuerberater: **Buchhaltung → CSV-Export**.

---

## 4. Praktische Helfer

| Was | Wie |
|---|---|
| Alles finden | **Strg + K** (oder `/`): Kunde, Rechnungsnummer, Telefon, Straße |
| Aus Versehen gelöscht | In der Meldung unten auf **Rückgängig** – oder **Einstellungen → Papierkorb** |
| Was ist heute zu tun? | Übersicht → **Heute zu erledigen** (überfällige Rechnungen, KV nachfassen, Einsatz ohne Team) |
| Alles zu einem Kunden | Kunde öffnen → **Zeitleiste**, Notizen („Anruf: …“) und Fotos |
| Termin verschieben | Im Kalender mit der Maus auf einen anderen Tag ziehen |
| Englische Rechnung | Im Dokument **Sprache: Englisch** – oder beim Kunden als Standard einstellen |
| Tastenkürzel | Taste **?** |
| Auf dem Handy | „Zum Startbildschirm hinzufügen“ → wie eine App; **Einstellungen → Mein Zugang → Benachrichtigungen** |

---

## 5. E-Mail-Versand einrichten

| Anbieter | SMTP-Server | Port |
|---|---|---|
| IONOS | smtp.ionos.de | 587 |
| Strato | smtp.strato.de | 465 |
| Gmail | smtp.gmail.com | 587 (App-Passwort nötig) |
| Outlook / Microsoft 365 | smtp.office365.com | 587 |
| GMX | mail.gmx.net | 587 |

Tipp: Bei „Kopie aller Mails an (BCC)“ die eigene Adresse eintragen.

---

## 6. Wichtig zu wissen

- **Rechnungsnummern** werden erst beim Abschließen vergeben – gelöschte Entwürfe erzeugen keine Lücken.
- **Abgeschlossene Rechnungen** lassen sich nicht mehr ändern oder löschen (Pflicht nach GoBD). Korrektur = Storno + neue Rechnung.
- **Kleinunternehmer:** Der Hinweis zu § 19 UStG steht automatisch auf jeder Rechnung. Wird die Umsatzgrenze erreicht
  (siehe Übersicht), unter **Einstellungen → Steuer** umstellen – vorher mit dem Steuerberater sprechen.
- **Datensicherung:** läuft täglich automatisch. Zusätzlich die Sicherung per E-Mail einschalten. Rechnungen 10 Jahre aufbewahren.
- **Mitarbeiter-Zugänge** sehen nur ihre eigenen Einsätze – keine Preise, keine Rechnungen.

---

## Hilfe

| Problem | Lösung |
|---|---|
| „E-Mail ist noch nicht eingerichtet“ | Einstellungen → E-Mail ausfüllen und „Verbindung testen“ |
| „Die Nummer … ist schon vergeben“ | Feld leer lassen, dann wird die nächste freie Nummer vergeben |
| Passwort vergessen | Ein anderer Chef-Zugang setzt es unter Einstellungen → Zugänge neu |
| „Zu viele Fehlversuche“ | 15 Minuten warten |
| PDF sieht leicht unscharf aus | `npx playwright install chromium` ausführen – dann erzeugt der Server echte PDFs |
| Seite lädt nicht | Läuft `npm start` noch? Im Terminal nach Fehlermeldungen schauen |
