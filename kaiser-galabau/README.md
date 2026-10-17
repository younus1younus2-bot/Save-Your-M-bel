# Kaiser – Garten- & Landschaftsbau (Website)

Statische Website (HTML/CSS/JS, keine Abhängigkeiten, kein Build-Schritt). Grün-weiß, eckig und klassisch.
Die Überschriften sind in Cinzel gesetzt, passend zum Logo, der Fließtext in Montserrat. Beide Schriften liegen lokal in `fonts/`, deshalb gibt es keinen Google-Fonts-Abruf (DSGVO).

Lokal ansehen: Im Ordner `kaiser-galabau/` den Befehl `python3 -m http.server` ausführen und dann `http://localhost:8000` öffnen.
Hochladen: Den kompletten Ordner `kaiser-galabau/` zum Webhoster kopieren.

## Seiten
| Datei | Inhalt |
|---|---|
| `index.html` | Startseite: Bild-Slider, Intro, Werte, 8 Leistungs-Kacheln, Kennzahlen, Ablauf, Referenz-Slider, Vorher/Nachher, Bewertungen, „Interesse geweckt?“, Einsatzgebiet, Kontaktbereich |
| `leistungen.html` | Übersicht aller Leistungen |
| `gartenplanung.html`, `gartenpflege.html`, `terrassen-auffahrten.html`, `lichtplanung.html`, `treppen-mauern.html`, `holzarbeiten.html`, `rasen-bepflanzung.html` | Je eine Unterseite mit Beschreibung, Vorteilen, Bildergalerie, Leistungsliste, Ablauf, FAQ, Bewertungen, Seitenleiste mit Anruf-Button und weiteren Leistungen |
| `referenzen.html` | Galerie mit Filter nach Leistung und Großansicht, Vorher/Nachher, Bewertungen |
| `ueber-uns.html` | Über uns, Werte, Team im Einsatz, Ansprechpartner, Kennzahlen, Karriere |
| `kontakt.html` | Anfrageformular (Leistung vorauswählbar über `kontakt.html?leistung=lichtplanung`), Kontaktdaten, FAQ |
| `impressum.html`, `datenschutz.html` | Pflichtseiten, Text muss noch eingefügt werden |

## Funktionen
- Das Logo erscheint immer: in der Kopfzeile, beim Laden der Seite und in der Fußzeile als weiße Version. Das Favicon ist das NG-Monogramm.
- Anruf-Button in der Kopfzeile, eine schwebende Kontaktleiste rechts (Anruf, WhatsApp, E-Mail, Anfrage) und auf dem Handy eine feste Leiste unten (Anrufen, WhatsApp, Anfrage).
- Animationen:
  - Bild-Slider mit langsamem Zoom
  - Text, der beim Laden einblendet
  - Elemente, die beim Scrollen einfliegen
  - hochzählende Zahlen
  - Hover-Effekte auf Kacheln und Buttons
  - Kopfzeile, die beim Scrollen schrumpft
  - Bei „Animationen reduzieren“ im System werden alle Animationen abgeschaltet.
- Vorher/Nachher-Regler, Bild-Großansicht (auch mit den Pfeiltasten bedienbar), Referenz-Karussell, Bewertungs-Slider, FAQ-Aufklapper, „Nach oben“-Button.

## Vor dem Livegang
1. **Firmendaten** in `js/main.js` ganz oben unter `SITE` eintragen: Telefon, WhatsApp, E-Mail, Adresse, Stadt, Öffnungszeiten, Orte im Einsatzgebiet und Instagram. Das gilt automatisch für alle Seiten.
2. **Bewertungen** in `js/main.js` unter `REVIEWS` durch **echte** Kundenbewertungen ersetzen, zum Beispiel aus Google. Die jetzigen sind nur Beispiele. Erfundene Bewertungen sind in Deutschland unzulässig.
3. **Kennzahlen** (250+ Projekte usw.) in `index.html` und `ueber-uns.html` über `data-count="…"` an echte Werte anpassen.
4. **Team**: Namen in `ueber-uns.html` eintragen (dort stehen jetzt Platzhalter wie „Name Nachname“) und den Platzhaltertext zu eurer Geschichte ersetzen.
5. **Anfragen empfangen**: Ein kostenloses Formspree-Konto anlegen und die Adresse bei `formEndpoint` eintragen. Bleibt das Feld leer, öffnet sich das E-Mail-Programm des Kunden mit einer fertig ausgefüllten Nachricht.
6. **Impressum & Datenschutz** ausfüllen.

## Bilder
Alle Fotos liegen in `img/projekte/`. Jedes Foto gibt es nur einmal, die Seiten verweisen per `data-img="…"` darauf.
Vorher/Nachher-Paare heißen `<projekt>-vorher.jpg` und `<projekt>-nachher.jpg`. Ein neues Paar auf der Referenzen-Seite ist ein weiterer Button in der Projekt-Auswahl (`.ba-switch`).
Die Kachelbilder der Leistungen stehen in `js/main.js` unter `SERVICES` (Feld `img`).
Wo noch kein Foto vorhanden ist, steht ein grüner Platzhalter mit dem gesuchten Dateinamen:
- Team-Porträts: `img/team/team-1.jpg` bis `team-4.jpg`

Logo: `img/logo.png` ist die freigestellte Farbversion, `img/logo-weiss.png` die Version für dunkle Flächen und `img/logo-original.jpg` die Originaldatei. Die hochgeladenen Original-Collagen liegen in `img/originale/`.
Die Farben lassen sich in `css/style.css` ganz oben unter `:root` ändern.

## Stadtseiten (Einsatzgebiet)
Für jeden Ort gibt es eine eigene Seite `gartenbau-<ort>.html` (z. B. `gartenbau-bergisch-gladbach.html`) plus die Übersicht `einsatzgebiet.html`.
Orte, Kreise, Ortsteile und Texte stehen in `tools/orte.py`. Ort hinzufügen oder entfernen:
1. In `tools/orte.py` den Eintrag ergänzen/löschen **und** in `js/main.js` bei `areas` denselben Namen.
2. `python3 tools/ortsseiten.py && python3 tools/seo.py` ausführen.

## Datenschutz & Cookies
Die Website setzt keine Cookies und lädt nichts von fremden Servern. Der Cookie-Hinweis speichert nur die Auswahl selbst.
Soll später Google Analytics laufen: ID bei `analytics` in `js/main.js` eintragen – es lädt dann nur nach „Akzeptieren“.
**Dann muss die Datenschutzerklärung um Google Analytics ergänzt werden.**

## SEO (Google)
Titel, Beschreibungen, strukturierte Daten (Firma, Leistungen, Fragen & Antworten), Vorschau für WhatsApp/Facebook, `robots.txt` und – mit Domain – `sitemap.xml` werden **automatisch** aus den Firmendaten in `js/main.js` erzeugt:

```bash
python3 tools/seo.py
```

Nach jeder Änderung an Stadt, Adresse, Telefon, Orten oder Domain einmal ausführen. Titel und Beschreibungen der einzelnen Seiten stehen in `tools/seo.py` unter `PAGES`.

Nach dem Livegang:
1. In `js/main.js` bei `domain` die Internetadresse eintragen (z. B. `https://www.kaiser-galabau.de`) und `tools/seo.py` ausführen.
2. In `.htaccess` die https-Weiterleitung einschalten (Anleitung steht in der Datei).
3. Die Website in der [Google Search Console](https://search.google.com/search-console) anmelden und `sitemap.xml` einreichen.
4. Ein kostenloses [Google-Unternehmensprofil](https://www.google.com/business/) anlegen – mit gleicher Adresse und Telefonnummer wie auf der Website.
