# Save Your Möbel – Website

Statische Website (HTML/CSS/JS, ohne Abhängigkeiten) im Design von saveyourmobel.de
(Rot `#E53935`, Montserrat) mit **einem einheitlichen Anfrageformular** für alle Leistungen.

## Seiten
| Datei | Inhalt |
|---|---|
| `index.html` | Startseite: Hero, Vorteile, 8 Leistungen + Kennzahlen, Ablauf, Bewertungen |
| `anfrage.html` | **Das eine Anfrageformular** (3 Schritte) |
| `privatumzug.html`, `firmenumzug.html`, `entruempelung.html` | Leistungsseiten |
| `ueber-uns.html`, `faq.html` | Über uns, häufige Fragen |
| `impressum.html`, `datenschutz.html` | Pflichtseiten (Text noch einfügen) |

## Einheitliches Anfrageformular
Alle „Anfragen“-Buttons führen zu `anfrage.html`. Über den Link wird die Leistung vorausgewählt,
z. B. `anfrage.html?leistung=Privatumzug`, dann startet der Kunde direkt bei Schritt 2.

1. **Leistung** – Privatumzug, Firmenumzug, Entrümpelung, Fernumzug, Seniorenumzug, Studentenumzug, Last Minute, Montage
2. **Details** – passen sich automatisch an:
   - Umzug: Auszug/Einzug (PLZ, Etage, Aufzug), Größe, Zusatzleistungen
   - Entrümpelung: Ort, Objekt, Fläche, Etage, besenrein
   - Montage: Ort, Art der Montage
   - immer: Wunschtermin, flexibel, weitere Infos
3. **Kontakt** – Name, Telefon, E-Mail (optional), Antwort per WhatsApp/Anruf/E-Mail, Datenschutz

Jede Anfrage kommt im gleichen, übersichtlichen Format an. Danach kann der Kunde Fotos per WhatsApp nachschicken.

## Vor dem Livegang anpassen
1. **`js/layout.js` → `SITE`**: Telefon, WhatsApp, E-Mail, Adresse. Gilt automatisch für alle Seiten.
2. **Anfragen empfangen**: kostenloses Konto bei einem Formular-Dienst (z. B. Formspree) anlegen und die
   Adresse bei `formEndpoint` eintragen. Ohne Eintrag öffnet sich das E-Mail-Programm des Kunden.
3. **Bilder**: `img/logo.png` (Logo) und `img/hero.jpg` (Hintergrundfoto oben) hochladen.
4. **Texte prüfen**: Unterseiten, „Über uns“ (Platzhalter in eckigen Klammern), FAQ „Bezahlung“.
5. **Impressum & Datenschutz** von der alten Seite übernehmen.

Farben ändern: `css/style.css`, ganz oben unter `:root`.
Schrift Montserrat liegt lokal in `fonts/` (kein Google-Fonts-Abruf, DSGVO).
