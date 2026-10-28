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
a.add_argument('--ohne-route', action='store_true', help='Routen-Animation im Startbereich ausblenden')
a.add_argument('--eckig', action='store_true', help='eckiger Stil: keine runden Ecken, harte Schatten')
a.add_argument('--whatsapp', default='', help='WhatsApp-Nummer (z. B. 4915752224524): Knopf neben „Kostenloses Angebot“ und auf der Anfrage-Seite')
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
shutil.copy(hier / 'eckig.css', ziel / 'css' / 'eckig.css')
shutil.copy(hier / 'ohne-route.css', ziel / 'css' / 'ohne-route.css')
k = re.sub(r'\n?\s*<link rel="stylesheet" href="/css/(angebot(-mehr)?|eckig|ohne-route)\.css[^>]*>', '', kopf.read_text(encoding='utf-8'))
k = k.rstrip('\n') + '\n    <link rel="stylesheet" href="/css/angebot.css?v=4">\n'
if arg.mehr_bilder:
    k += '    <link rel="stylesheet" href="/css/angebot-mehr.css?v=3">\n'
if arg.eckig:
    k += '    <link rel="stylesheet" href="/css/eckig.css?v=2">\n'
if arg.ohne_route:
    k += '    <link rel="stylesheet" href="/css/ohne-route.css?v=1">\n'
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

# WhatsApp-Knopf (mit vorbereiteter Nachricht)
wa_nr = re.sub(r'\D', '', arg.whatsapp)
WA_ICON = ('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2'
           'a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1'
           'a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7'
           ' 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>')
wa_text = 'Hallo%2C%20ich%20m%C3%B6chte%20ein%20Angebot%20' + (f'mit%20{P}%20%25%20Rabatt' if not arg.ohne_aktion else '') + '.'
wa_knopf = f'<a class="sym-wa" href="https://wa.me/{wa_nr}?text={wa_text}" target="_blank" rel="noopener">{WA_ICON}WhatsApp</a>' if wa_nr else ''

# 3) Mehr Bilder: Rabatt-Band mit Maskottchen hinter dem Kopfbereich, Schutz-Fotos auf der Startseite
maskottchen = arg.mehr_bilder and not arg.ohne_aktion and P == 20  # das Bild zeigt fest „20 %“
band = (f'{ANF}<section class="sym-band"><div class="sym-band-innen">'
        f'<img src="/img/team/maskottchen.webp" alt="Save Your Möbel – {P} % Rabatt auf alle Leistungen" width="625" height="640" loading="lazy">'
        f'<div><span class="sym-band-klein">Aktion{bis_text}</span><p class="sym-band-titel">{P} % Rabatt auf alle Leistungen</p>'
        f'<p>Umzug, Entrümpelung, Möbelmontage &amp; mehr – wir ziehen {P} % direkt von Ihrem Festpreis-Angebot ab.</p>'
        f'<a class="sym-band-knopf" href="/anfrage.php">Jetzt Angebot sichern →</a>{wa_knopf}</div></div></section>{END}')
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
            # Hinweis oben ins Formular (nicht neben die Knöpfe – dort stehen bei mehreren Schritten „Zurück“/„Weiter“ nebeneinander)
            f = re.search(r'<form\b', neu)
            fe = tag_ende(neu, f.start()) if f else -1
            if fe > 0:
                neu = hinter(neu, fe, hinweis, f.start())
                bericht.append('Hinweis oben im Formular')
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
    if wa_knopf and datei.name == 'index.php' and datei.parent == ziel:
        # Startseite: WhatsApp direkt neben „Kostenloses Angebot“ (auf dem Handy nebeneinander, gleich groß)
        m = re.search(r'<section class="held held-start', neu)
        ende = neu.find('</section>', m.end()) if m else -1
        a = re.search(r'<a\b[^>]*href="/anfrage\.php', neu[m.end():ende]) if ende > 0 else None
        if a:
            a0 = m.end() + a.start()
            a1 = neu.find('</a>', a0) + 4
            neu = neu[:a1] + f'{ANF}{wa_knopf}</div>{END}' + neu[a1:]
            neu = neu[:a0] + f'{ANF}<div class="sym-cta-paar">{END}' + neu[a0:]
            bericht.append('WhatsApp neben „Kostenloses Angebot“')
    if wa_knopf and datei.name == 'anfrage.php' and datei.parent == ziel:
        m = re.search(r'class="af-kopf-inhalt"', neu)
        p_ende = neu.find('</p>', m.end()) if m else -1
        if p_ende > 0:
            neu = hinter(neu, p_ende + 4, f'{ANF}<div class="sym-wa-zeile"><span>Lieber direkt schreiben?</span>{wa_knopf}</div>{END}', p_ende)
            bericht.append('WhatsApp auf der Anfrage-Seite')
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
