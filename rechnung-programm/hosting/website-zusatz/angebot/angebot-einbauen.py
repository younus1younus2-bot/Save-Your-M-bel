#!/usr/bin/env python3
"""Baut Team-Fotos als Hintergrund (Startseite + Anfrage-Seite) und einen Aktions-Hinweis („20 % auf alles“) in eine Website-Version ein.
Aufruf: python3 angebot-einbauen.py <Versions-Ordner> [--prozent 20] [--bis 30.11.2026] [--ohne-aktion]
Kann beliebig oft ausgeführt werden – vorhandene Einbauten werden ersetzt, nicht verdoppelt."""
import argparse, html, pathlib, re, shutil, sys

a = argparse.ArgumentParser()
a.add_argument('ziel')
a.add_argument('--prozent', type=int, default=20)
a.add_argument('--bis', default='', help='z. B. 30.11.2026 – leer: ohne Enddatum')
a.add_argument('--ohne-aktion', action='store_true', help='nur die Fotos, kein Rabatt-Hinweis')
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
for bild in (hier / 'bilder').glob('*.jpg'):
    shutil.copy(bild, ziel / 'img' / 'team' / bild.name)
(ziel / 'css').mkdir(exist_ok=True)
shutil.copy(hier / 'angebot.css', ziel / 'css' / 'angebot.css')
k = re.sub(r'\n?\s*<link rel="stylesheet" href="/css/angebot\.css[^>]*>', '', kopf.read_text(encoding='utf-8'))
kopf.write_text(k.rstrip('\n') + '\n    <link rel="stylesheet" href="/css/angebot.css?v=1">\n', encoding='utf-8')
bericht.append('Fotos + Stil')

# 2) Aktion: Leiste ganz oben (wo <body> steht), Siegel im Kopfbereich, Hinweis am Formular
leiste = (f'{ANF}<div class="sym-aktion" role="note">🎉 <b>Aktion: {P} % Rabatt auf alle Leistungen</b>'
          f'<span>für jede Anfrage über unsere Website{bis_text}</span>'
          f'<a href="/anfrage.php">Jetzt Angebot sichern →</a></div>{END}')
siegel = (f'{ANF}<div class="sym-aktion-siegel"><strong>−{P} %</strong>'
          f'<span>auf alle Leistungen<small>Umzug, Entrümpelung, Montage &amp; mehr{bis_text}</small></span></div>{END}')
hinweis = (f'{ANF}<div class="sym-aktion-hinweis"><strong>−{P} %</strong>'
           f'<span>Aktionsrabatt: Wir ziehen {P} % direkt von Ihrem Festpreis-Angebot ab{bis_text}.</span></div>{END}')

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
    if neu != t:
        datei.write_text(neu, encoding='utf-8')

print('Eingebaut: ' + ', '.join(bericht))
if not arg.ohne_aktion and not any(b.startswith('Leiste') for b in bericht):
    print('Hinweis: <body> nicht gefunden – die Aktions-Leiste fehlt.')
