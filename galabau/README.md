# Nova Green – Garten- & Landschaftsbau (Website)

Statische Website (HTML/CSS/JS, keine Abhängigkeiten, kein Build-Schritt). Grün-weiß, eckig und klassisch.
Die Überschriften sind in Cinzel gesetzt, passend zum Logo, der Fließtext in Montserrat. Beide Schriften liegen lokal in `fonts/`, deshalb gibt es keinen Google-Fonts-Abruf (DSGVO).

Lokal ansehen: Im Ordner `galabau/` den Befehl `python3 -m http.server` ausführen und dann `http://localhost:8000` öffnen.
Hochladen: Den kompletten Ordner `galabau/` zum Webhoster kopieren.

## Seiten
| Datei | Inhalt |
|---|---|
| `index.html` | Startseite: Bild-Slider, Intro, Werte, 8 Leistungs-Kacheln, Kennzahlen, Ablauf, Referenz-Slider, Vorher/Nachher, Bewertungen, „Interesse geweckt?“, Einsatzgebiet, Kontaktbereich |
| `leistungen.html` | Übersicht aller Leistungen |
| `gartenplanung.html`, `gartenpflege.html`, `terrassen-auffahrten.html`, `lichtplanung.html`, `teich-poolbau.html`, `treppen-mauern.html`, `holzarbeiten.html`, `rasen-bepflanzung.html` | Je eine Unterseite mit Beschreibung, Vorteilen, Bildergalerie, Leistungsliste, Ablauf, FAQ, Bewertungen, Seitenleiste mit Anruf-Button und weiteren Leistungen |
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

## Bilder – einfach mit diesen Namen in `img/` ablegen
Solange ein Foto fehlt, steht dort ein grüner Platzhalter mit dem gesuchten Dateinamen. Querformat-JPGs mit etwa 1600–2000 px Breite sind ideal.

| Datei | Wo |
|---|---|
| `img/hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg` | Großer Bild-Slider auf der Startseite |
| `img/ueber-uns.jpg` | Startseite (Intro) und Über uns (Hochformat ideal) |
| `img/leistungen/<leistung>.jpg` | Kachel und Kopfbild der Leistung, z. B. `img/leistungen/lichtplanung.jpg` |
| `img/leistungen/<leistung>-1.jpg`, `-2.jpg`, `-3.jpg` | Galerie auf der jeweiligen Leistungsseite |
| `img/referenzen/ref-1.jpg` … `ref-12.jpg` | Referenzen (Startseite zeigt 1–8) |
| `img/vorher.jpg`, `img/nachher.jpg` | Vorher/Nachher-Regler (gleicher Blickwinkel) |
| `img/interesse.jpg`, `img/kontakt.jpg`, `img/cta.jpg` | „Interesse geweckt?“, Kontaktbereich, grünes Abschlussband |
| `img/leistungen.jpg`, `img/referenzen.jpg`, `img/ueber-uns-hero.jpg`, `img/kontakt-hero.jpg` | Kopfbilder der Unterseiten |
| `img/team/team-1.jpg` … `team-4.jpg` | Ansprechpartner (Hochformat) |
| `img/team/einsatz-1.jpg` … `einsatz-3.jpg` | „Unser Team im Einsatz“ |

Mögliche Werte für `<leistung>`: `gartenplanung`, `gartenpflege`, `terrassen-auffahrten`, `lichtplanung`, `teich-poolbau`, `treppen-mauern`, `holzarbeiten`, `rasen-bepflanzung`.

Logo: `img/logo.png` ist die freigestellte Farbversion, `img/logo-weiss.png` die Version für dunkle Flächen und `img/logo-original.jpg` die Originaldatei.
Die Farben lassen sich in `css/style.css` ganz oben unter `:root` ändern.
