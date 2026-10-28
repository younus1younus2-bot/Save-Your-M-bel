#!/usr/bin/env python3
"""Baut Team-Fotos als Hintergrund (Startseite + Anfrage-Seite) und einen Aktions-Hinweis („20 % auf alles“) in eine Website-Version ein.
Aufruf: python3 angebot-einbauen.py <Versions-Ordner> [--prozent 20] [--bis 30.11.2026] [--ohne-aktion] [--mehr-bilder]
  --mehr-bilder: Fotos auch auf Leistungs-/Städteseiten, Rabatt-Band mit Maskottchen und Abschnitt „So schützen wir Ihre Möbel“
Kann beliebig oft ausgeführt werden – vorhandene Einbauten werden ersetzt, nicht verdoppelt."""
import argparse, html, pathlib, re, shutil, sys

a = argparse.ArgumentParser()
a.add_argument('ziel')
a.add_argument('--prozent', type=int, default=20)
a.add_argument('--bis', default='', help='z. B. 30.11.2026 – leer: ohne Enddatum')
a.add_argument('--ohne-aktion', action='store_true', help='nur die Fotos, kein Rabatt-Hinweis')
a.add_argument('--nrw', action='store_true', help='Hinweis oben auf der Startseite: NRW statt Köln')
a.add_argument('--mehr-bilder', action='store_true', help='Fotos auf allen Seiten, Rabatt-Band, Schutz-Fotos')
arg = a.parse_args()
if not 1 <= arg.prozent <= 90:
    sys.exit('--prozent muss zwischen 1 und 90 liegen')

ziel = pathlib.Path(arg.ziel)
hier = pathlib.Path(__file__).parent
kopf = ziel / 'includes' / 'kopf.php'
if not kopf.is_file():
    sys.exit('includes/kopf.php nicht gefunden – ist das ein Website-Ordner?')

P = arg.prozent
bis = html.escape(re.sub(r'[^0-9.]', '', arg.bis))
bis_text = f' – nur bis {bis}' if bis else ''
ANF, END = '<!-- AKTION-ANFANG -->', '<!-- AKTION-ENDE -->'
bericht = []


def ohne_alt(text):
    return re.sub(r'\s*' + re.escape(ANF) + r'.*?' + re.escape(END), '', text, flags=re.S)


def tag_ende(text, start):
    """Position direkt hinter dem '>' des HTML-Tags ab start (überspringt <?php … ?> im Tag)."""
    i = start
    while i < len(text):
        if text.startswith('<?', i):
            j = text.find('?>', i + 2)
            if j == -1:
                return -1
            i = j + 2
        elif text[i] == '>':
            return i + 1
        else:
            i += 1
    return -1


def einzug(text, pos):
    anfang = text.rfind('\n', 0, pos) + 1
    davor = text[anfang:pos]
    return davor if davor.strip() == '' else ''


def vor(text, pos, block):
    """block vor dem Tag an pos einfügen, mit dessen Einrückung (wird von ohne_alt exakt wieder entfernt)."""
    return text[:pos] + block + '\n' + einzug(text, pos) + text[pos:]


def hinter(text, pos, block, wie):
    return text[:pos] + '\n' + einzug(text, wie) + block + text[pos:]


# 1) Fotos und Stil
(ziel / 'img' / 'team').mkdir(parents=True, exist_ok=True)
for bild in [*(hier / 'bilder').glob('*.jpg'), *(hier / 'bilder').glob('*.webp')]:
    shutil.copy(bild, ziel / 'img' / 'team' / bild.name)
(ziel / 'css').mkdir(exist_ok=True)
shutil.copy(hier / 'angebot.css', ziel / 'css' / 'angebot.css')
shutil.copy(hier / 'angebot-mehr.css', ziel / 'css' / 'angebot-mehr.css')
k = re.sub(r'\n?\s*<link rel="stylesheet" href="/css/angebot(-mehr)?\.css[^>]*>', '', kopf.read_text(encoding='utf-8'))
k = k.rstrip('\n') + '\n    <link rel="stylesheet" href="/css/angebot.css?v=3">\n'
if arg.mehr_bilder:
    k += '    <link rel="stylesheet" href="/css/angebot-mehr.css?v=2">\n'
kopf.write_text(k, encoding='utf-8')
bericht.append('Fotos + Stil')

# 2) Aktion: Leiste ganz oben (wo <body> steht), Siegel im Kopfbereich, Hinweis am Formular
leiste = (f'{ANF}<div class="sym-aktion" role="note">🎉 <b>Aktion: {P} % Rabatt auf alle Leistungen</b>'
          f'<span>für jede Anfrage über unsere Website{bis_text}</span>'
          f'<a href="/anfrage.php">Jetzt Angebot sichern →</a></div>{END}')
siegel = (f'{ANF}<div class="sym-aktion-siegel"><strong>−{P} %</strong>'
          f'<span>auf alle Leistungen<small>Umzug, Entrümpelung, Montage &amp; mehr{bis_text}</small></span></div>{END}')
hinweis = (f'{ANF}<div class="sym-aktion-hinweis"><strong>−{P} %</strong>'
           f'<span>Aktionsrabatt: Wir ziehen {P} % direkt von Ihrem Festpreis-Angebot ab{bis_text}.</span></div>{END}')

# 3) Mehr Bilder: Rabatt-Band mit Maskottchen hinter dem Kopfbereich, Schutz-Fotos auf der Startseite
maskottchen = arg.mehr_bilder and not arg.ohne_aktion and P == 20  # das Bild zeigt fest „20 %“
band = (f'{ANF}<section class="sym-band"><div class="sym-band-innen">'
        f'<img src="/img/team/maskottchen.webp" alt="Save Your Möbel – {P} % Rabatt auf alle Leistungen" width="625" height="640" loading="lazy">'
        f'<div><span class="sym-band-klein">Aktion{bis_text}</span><p class="sym-band-titel">{P} % Rabatt auf alle Leistungen</p>'
        f'<p>Umzug, Entrümpelung, Möbelmontage &amp; mehr – wir ziehen {P} % direkt von Ihrem Festpreis-Angebot ab.</p>'
        f'<a class="sym-band-knopf" href="/anfrage.php">Jetzt Angebot sichern →</a></div></div></section>{END}')
SCHUTZ = [('schutz-sofa', 'Sofa in Decken und Stretchfolie'), ('schutz-sideboard', 'Sideboard rundum gepolstert'),
          ('schutz-lkw', 'Sicher verzurrt im LKW'), ('schutz-schrank', 'Schrank komplett eingepackt')]
schutz_da = [(n, t) for n, t in SCHUTZ if (hier / 'bilder' / f'{n}.jpg').is_file()]
schutz = (f'{ANF}<section class="sym-schutz"><div class="sym-schutz-innen">'
          '<span class="sym-band-klein">Echte Fotos aus unseren Aufträgen</span><h2>So schützen wir Ihre Möbel</h2>'
          '<p class="sym-schutz-text">Jedes Möbelstück wird in Umzugsdecken gehüllt und mit Stretchfolie fixiert. Im LKW sichern wir alles mit Gurten – '
          'so kommen Kratzer, Staub und Stöße gar nicht erst an Ihre Möbel.</p><div class="sym-schutz-raster">'
          + ''.join(f'<figure><img src="/img/team/{n}.jpg" alt="{t} – Save Your Möbel" loading="lazy"><figcaption>{t}</figcaption></figure>' for n, t in schutz_da)
          + f'</div></div></section>{END}')

dateien = sorted(set((ziel / 'includes').glob('*.php')) | set(ziel.glob('*.php')))
for datei in dateien:
    t = datei.read_text(encoding='utf-8')
    neu = ohne_alt(t)
    if not arg.ohne_aktion:
        m = re.search(r'<body\b', neu)
        if m and (e := tag_ende(neu, m.start())) > 0:
            neu = neu[:e] + '\n' + leiste + neu[e:]
            bericht.append(f'Leiste in {datei.relative_to(ziel)}')
        if datei.name == 'index.php' and datei.parent == ziel:
            m = re.search(r'class="held held-start', neu)
            h = neu.find('<h1', m.end()) if m else -1
            if h > 0:
                neu = vor(neu, h, siegel)
                bericht.append('Siegel auf der Startseite')
        if datei.name == 'anfrage.php' and datei.parent == ziel:
            m = re.search(r'class="af-kopf-inhalt"', neu)
            h = neu.find('<h1', m.end()) if m else -1
            if h > 0:
                e = neu.find('</h1>', h)
                neu = hinter(neu, e + 5, siegel, h)
                bericht.append('Siegel auf der Anfrage-Seite')
            knoepfe = list(re.finditer(r'<button\b[^>]*type="submit"', neu))
            if knoepfe:
                s = knoepfe[-1].start()
                neu = vor(neu, s, hinweis)
                bericht.append('Hinweis am Absenden-Knopf')
    if arg.nrw and datei.name == 'index.php' and datei.parent == ziel:
        # nur der kleine Hinweis über der Überschrift im Startbereich („● Umzugsunternehmen aus Köln“)
        m = re.search(r'<section class="held held-start', neu)
        h = neu.find('<h1', m.end()) if m else -1
        if h > 0:
            vorn = neu[m.end():h]
            ersetzt = re.sub(r'(aus|in) Köln(?=[^<]*</span>)', 'aus NRW', vorn, count=1)
            ersetzt = re.sub(r'Köln(?=[^<]*</span>)', 'NRW', ersetzt, count=1) if ersetzt == vorn else ersetzt
            if ersetzt != vorn:
                neu = neu[:m.end()] + ersetzt + neu[h:]
                bericht.append('Startbereich: NRW statt Köln')
    if arg.mehr_bilder and (maskottchen or (schutz_da and datei.name == 'index.php' and datei.parent == ziel)):
        m = re.search(r'<section class="held ', neu)
        e = neu.find('</section>', m.end()) if m else -1
        if e > 0:
            block = (band if maskottchen else '') + (schutz if schutz_da and datei.name == 'index.php' and datei.parent == ziel else '')
            block = block.replace(END + ANF, '')
            neu = hinter(neu, e + 10, block, m.start())
            bericht.append(f'Bilder-Abschnitte in {datei.relative_to(ziel)}')
    if neu != t:
        datei.write_text(neu, encoding='utf-8')

print('Eingebaut: ' + ', '.join(bericht))
if arg.mehr_bilder and len(schutz_da) < len(SCHUTZ):
    print(f'Hinweis: {len(schutz_da)} von {len(SCHUTZ)} Schutz-Fotos vorhanden (bilder/schutz-*.jpg).')
if not arg.ohne_aktion and not any(b.startswith('Leiste') for b in bericht):
    print('Hinweis: <body> nicht gefunden – die Aktions-Leiste fehlt.')
