#!/usr/bin/env python3
"""Baut die AGB-Seite (agb.php) aus agb.txt in einen Website-Ordner ein und verlinkt sie in der Fußzeile und in der Sitemap.
Aufruf: python3 agb-einbauen.py <Website- oder Versions-Ordner>
Kann beliebig oft ausgeführt werden – die Seite wird neu erzeugt, Links werden nicht verdoppelt."""
import html, pathlib, re, sys

ziel = pathlib.Path(sys.argv[1])
if not (ziel / 'includes' / 'seite-oben.php').is_file():
    sys.exit('includes/seite-oben.php nicht gefunden – ist das ein Website-Ordner?')
zeilen = pathlib.Path(__file__).with_name('agb.txt').read_text(encoding='utf-8').splitlines()
titel, stand = zeilen[0], zeilen[1]

# ---------- agb.txt -> HTML ----------
teile, inhalt, absatz_offen = [], [], False
for z in zeilen[2:]:
    z = z.strip()
    if not z:
        continue
    e = html.escape(z)
    if z.startswith('## '):
        teile.append((z[3:], 'teil-' + str(len(teile) + 1)))
        inhalt.append(f'<h2 id="{teile[-1][1]}" class="agb-teil">{html.escape(z[3:])}</h2>')
    elif z.startswith('### '):
        inhalt.append(f'<h3>{html.escape(z[4:])}</h3>')
    elif m := re.match(r'^(\d+(?:\.\d+)+)\s+(.*)$', z):
        tief = m.group(1).count('.') > 1
        inhalt.append(f'<p class="agb-punkt{" agb-unter" if tief else ""}"><b>{m.group(1)}</b> {html.escape(m.group(2))}</p>')
    else:
        inhalt.append(f'<p>{e}</p>')

verzeichnis = ''.join(f'<a href="#{i}">{html.escape(t)}</a>' for t, i in teile)
seite = f"""<?php
$seitenTitel = 'AGB';
$seitenBeschreibung = 'Allgemeine Geschäftsbedingungen von Save Your Möbel für Umzüge und Einlagerungen.';
include __DIR__ . '/includes/seite-oben.php';
?>
    <section class="sym-kopf"><h1>{html.escape(titel)}</h1></section>
    <main class="sym-seite agb" style="max-width:820px;line-height:1.75;color:#334155">
        <style>
            .agb {{ margin-left: auto; margin-right: auto; padding-left: 16px; padding-right: 16px; box-sizing: border-box; }}
            .agb .agb-stand {{ color: #64748b; margin-top: 0; }}
            .agb .agb-verzeichnis {{ display: flex; flex-wrap: wrap; gap: 8px 12px; margin: 18px 0 8px; }}
            .agb .agb-verzeichnis a {{ padding: 8px 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-weight: 700; text-decoration: none; color: #0f172a; }}
            .agb .agb-teil {{ margin-top: 40px; padding-top: 12px; border-top: 3px solid #e53935; }}
            .agb h3 {{ margin: 26px 0 6px; font-size: 1.08rem; }}
            .agb .agb-punkt {{ margin: 6px 0; }}
            .agb .agb-punkt b {{ color: #0f172a; margin-right: 4px; }}
            .agb .agb-unter {{ padding-left: 22px; }}
            @media print {{ .agb .agb-verzeichnis {{ display: none; }} }}
        </style>
        <p class="agb-stand">{html.escape(stand)}</p>
        <nav class="agb-verzeichnis" aria-label="Inhalt">{verzeichnis}</nav>
        {chr(10).join('        ' + x for x in inhalt).lstrip()}
    </main>
<?php include __DIR__ . '/includes/seite-unten.php'; ?>
"""
(ziel / 'agb.php').write_text(seite, encoding='utf-8')
bericht = ['agb.php erstellt']

# ---------- Link in der Fußzeile (neben Datenschutz) ----------
for datei in [ziel / 'includes' / 'seite-unten.php', *sorted((ziel / 'includes').glob('*.php'))]:
    if not datei.is_file():
        continue
    s = datei.read_text(encoding='utf-8')
    if 'agb.php' in s:
        bericht.append(f'Link schon vorhanden ({datei.name})')
        break
    m = re.search(r'<a\b[^>]*href="/?datenschutz\.php"[^>]*>.*?</a>', s, re.S)
    if not m:
        continue
    a = m.group(0)
    neu = re.sub(r'href="/?datenschutz\.php"', 'href="/agb.php"', a)
    neu = re.sub(r'>(.*?)</a>$', '>AGB</a>', neu, flags=re.S)
    # steht der Link in einem Listenpunkt, den ganzen Listenpunkt verdoppeln
    li_start = s.rfind('<li', 0, m.start())
    li_ende = s.find('</li>', m.end())
    if li_start != -1 and s.find('</li>', li_start, m.start()) == -1 and li_ende != -1 and s.find('<li', m.end(), li_ende) == -1:
        li = s[li_start:li_ende + 5]
        s = s[:li_ende + 5] + li.replace(a, neu) + s[li_ende + 5:]
    else:
        s = s[:m.end()] + ' ' + neu + s[m.end():]
    datei.write_text(s, encoding='utf-8')
    bericht.append(f'Link „AGB“ in {datei.name}')
    break
else:
    bericht.append('Hinweis: kein Datenschutz-Link in der Fußzeile gefunden – AGB-Link bitte von Hand ergänzen')

# ---------- Sitemap ----------
sitemap = ziel / 'sitemap.xml'
if sitemap.is_file():
    s = sitemap.read_text(encoding='utf-8')
    if 'agb.php' not in s:
        basis = re.search(r'<loc>(https?://[^/<]+)', s)
        if basis:
            eintrag = f'  <url><loc>{basis.group(1)}/agb.php</loc><priority>0.2</priority></url>\n'
            s = s.replace('</urlset>', eintrag + '</urlset>')
            sitemap.write_text(s, encoding='utf-8')
            bericht.append('Sitemap ergänzt')

print('AGB: ' + ', '.join(bericht))
