#!/usr/bin/env python3
"""Stadtseiten (gartenbau-<ort>.html) und die Übersicht einsatzgebiet.html erzeugen.

Daten: tools/orte.py, Leistungen: js/main.js (SERVICES).
Aufruf im Ordner kaiser-galabau:  python3 tools/ortsseiten.py && python3 tools/seo.py
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
os.chdir(ROOT)
from orte import ORTE, REGION, ORT_BY_NAME, slug  # noqa: E402

e = lambda s: html.escape(s, quote=False)
js = open('js/main.js', encoding='utf-8').read()
SERVICES = re.findall(r"\{ slug: '([^']+)',\s*title: '([^']+)',\s*short: '([^']+)',\s*icon: '([^']+)'", js)

IMG = {'stadt': ('abend-nachher', 'weg-nachher'), 'bergisch': ('mauer-nachher', 'weg-nachher'),
       'rhein': ('terrasse-nachher', 'beet-nachher'), 'vorgebirge': ('beet-nachher', 'hecke-buchs'),
       'erft': ('einfahrt-nachher', 'sichtschutz-nachher'), 'sieg': ('hecke-breit', 'zaun-nachher')}
ICONS = {'stadt': ['grid', 'fence', 'tool'], 'bergisch': ['shield', 'stairs', 'drop'], 'rhein': ['grid', 'drop', 'home'],
         'vorgebirge': ['sprout', 'scissors', 'drop'], 'erft': ['home', 'grid', 'fence'], 'sieg': ['leaf', 'scissors', 'grid']}

HEAD = '''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#1d4318">
  <link rel="icon" href="img/favicon.png">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Diese Seite wird von tools/ortsseiten.py erzeugt. Änderungen bitte in tools/orte.py vornehmen. -->
  <div id="site-header"></div>

  <main>
'''
FOOT = '''
    <section class="cta">
      <div class="bg" data-img="img/projekte/abend-nachher.jpg"></div>
      <div class="container reveal">
        <p class="eyebrow">Jetzt starten</p>
        <h2>{h}</h2>
        <p>Kostenlose Beratung vor Ort und ein schriftliches Angebot – rufen Sie uns einfach an.</p>
        <div class="cta__actions">
          <a href="#" data-tel class="btn btn--light"><i data-icon="phone"></i> <span data-site="phone"></span></a>
          <a href="kontakt.html" class="btn btn--ghost">Angebot anfragen</a>
        </div>
      </div>
    </section>
  </main>

  <div id="site-footer"></div>
  <script src="js/main.js"></script>
</body>
</html>
'''

def liste(items):
    return ', '.join(items[:-1]) + ' und ' + items[-1] if len(items) > 1 else items[0]

def ortsseite(o):
    name, kreis, region, teile, intro, nachbarn = o
    rtitel, punkte = REGION[region]
    img1, img2 = IMG[region]
    in_ort = f'in {name}'
    leistungen = '\n'.join(f'''          <a href="{s}.html" class="feature reveal" style="color:inherit"><i data-icon="{ic}"></i><div><h3>{e(t)} {e(in_ort)}</h3><p>{e(short)}</p><span class="link-arrow" style="margin-top:8px">Mehr erfahren <i data-icon="arrow"></i></span></div></a>'''
                           for s, t, short, ic in SERVICES)
    leistungen += f'''
          <a href="kontakt.html" class="feature feature--cta reveal"><i data-icon="phone"></i><div><h3>Kostenlose Beratung {e(in_ort)}</h3><p>Wir kommen zu Ihnen und sehen uns Ihren Garten an – unverbindlich.</p><span class="link-arrow" style="margin-top:8px">Termin anfragen <i data-icon="arrow"></i></span></div></a>'''
    details = '\n'.join(f'''            <div class="detail reveal"><div class="detail__icon"><i data-icon="{ic}"></i></div><div><h3>{e(t)}</h3><p>{e(tx)}</p></div></div>'''
                        for ic, (t, tx) in zip(ICONS[region], punkte))
    chips = ''.join(f'<li><i data-icon="pin"></i> {e(t)}</li>' for t in teile)
    nb = ''.join(f'<li><a href="{slug(n)}">{e(n)}</a></li>' for n in nachbarn if n in ORT_BY_NAME)
    faq = [
        (f'Kommen Sie auch nach {liste(teile[:2])}?', f'Ja. Wir arbeiten in ganz {name} – unter anderem in {liste(teile)}.'),
        (f'Wie schnell bekomme ich einen Termin in {name}?', 'Wir melden uns in der Regel innerhalb von 24 Stunden und vereinbaren mit Ihnen einen Termin für die kostenlose Beratung vor Ort.'),
        (f'Welche Arbeiten übernehmen Sie in {name}?', 'Gartenplanung und Neuanlage, Gartenpflege und Heckenschnitt, Terrassen, Wege und Einfahrten, Gartenbeleuchtung, Treppen und Mauern, Zäune und Sichtschutz sowie Rasen und Bepflanzung.'),
        (f'Brauche ich in {name} eine Genehmigung, um einen Baum zu fällen?', 'Das hängt von Baumart, Stammumfang und der örtlichen Baumschutzsatzung ab. Außerdem sind Fällungen und starke Rückschnitte nur vom 1. Oktober bis 28. Februar erlaubt. Wir klären das vor Beginn mit Ihnen.'),
    ]
    faqs = '\n'.join(f'          <details><summary>{e(q)}</summary><div><p>{e(a)}</p></div></details>' for q, a in faq)
    body = f'''    <section class="page-hero">
      <div class="bg" data-img="img/projekte/{img1}.jpg"></div>
      <div class="container">
        <p class="breadcrumb anim-up"><a href="index.html">Startseite</a> / <a href="einsatzgebiet.html">Einsatzgebiet</a> / {e(name)}</p>
        <h1 class="anim-up d1">Garten- &amp; Landschaftsbau in {e(name)}</h1>
        <p class="lead anim-up d2">Gartenplanung, Gartenpflege, Terrassen, Zäune und Mauern – Ihr Fachbetrieb für {e(name)} und Umgebung.</p>
        <div class="hero__actions anim-up d3">
          <a href="#" data-tel class="btn btn--light"><i data-icon="phone"></i> Jetzt anrufen</a>
          <a href="kontakt.html" class="btn btn--ghost">Kostenlos beraten lassen</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container split">
        <div class="reveal reveal--left">
          <p class="eyebrow">{e(kreis)}</p>
          <h2>Ihr Gartenbauer für {e(name)}</h2>
          <p>{e(intro)}</p>
          <p>Wir planen neue Gärten, gestalten bestehende um und übernehmen die regelmäßige Pflege. Sie haben einen festen Ansprechpartner, erhalten ein schriftliches Angebot und wissen jederzeit, was als Nächstes passiert.</p>
          <p><b>Wir sind in allen Stadtteilen für Sie da, zum Beispiel:</b></p>
          <ul class="area-list">{chips}</ul>
        </div>
        <div class="split__media reveal reveal--right"><div class="media" data-img="img/projekte/{img2}.jpg"></div></div>
      </div>
    </section>

    <section class="section section--pale slant-top">
      <div class="container">
        <div class="section__head reveal">
          <p class="eyebrow">Leistungen</p>
          <h2>Unsere Leistungen {e(in_ort)}</h2>
          <p>Alles aus einer Hand – von der ersten Idee bis zur Pflege.</p>
        </div>
        <div class="feature-grid feature-grid--3 stagger" style="margin:0">
{leistungen}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container container--narrow">
        <div class="section__head reveal">
          <p class="eyebrow">Typisch {e(in_ort)}</p>
          <h2>{e(rtitel)}</h2>
        </div>
        <div class="detail-list" style="margin-bottom:0">
{details}
        </div>
      </div>
    </section>

    <section class="section section--cream">
      <div class="container">
        <div class="section__head reveal">
          <p class="eyebrow">So arbeiten wir</p>
          <h2>In 4 Schritten zu Ihrem neuen Garten</h2>
        </div>
        <div class="steps stagger">
          <div class="step reveal"><div class="step__num">1</div><h3>Anfrage</h3><p>Anruf, WhatsApp oder E-Mail – wir melden uns in der Regel innerhalb von 24 Stunden.</p></div>
          <div class="step reveal"><div class="step__num">2</div><h3>Beratung {e(in_ort)}</h3><p>Wir kommen zu Ihnen, sehen uns alles an und nehmen Ihre Wünsche auf – kostenlos.</p></div>
          <div class="step reveal"><div class="step__num">3</div><h3>Angebot</h3><p>Sie erhalten einen klaren Plan und ein schriftliches Angebot.</p></div>
          <div class="step reveal"><div class="step__num">4</div><h3>Umsetzung</h3><p>Unser Team baut sauber und termingerecht – bis zur gemeinsamen Abnahme.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container container--narrow">
        <div class="section__head reveal">
          <p class="eyebrow">FAQ</p>
          <h2>Häufige Fragen aus {e(name)}</h2>
        </div>
        <div class="faq reveal">
{faqs}
        </div>
        <div class="reveal" style="margin-top:50px;text-align:center">
          <h3>Auch in der Nähe für Sie da</h3>
          <ul class="area-list area-list--links" style="justify-content:center;margin-top:16px">{nb}<li><a href="einsatzgebiet.html">Alle Orte</a></li></ul>
        </div>
      </div>
    </section>
'''
    return HEAD + body + FOOT.format(h=f'Ihr Garten {in_ort} – wir freuen uns auf Ihr Projekt')

def uebersicht():
    cards = '\n'.join(
        f'''          <a href="{slug(o[0])}" class="feature reveal" style="color:inherit"><i data-icon="pin"></i><div><h3>Gartenbau in {e(o[0])}</h3><p>{e(o[1] if o[0] != 'Köln' else 'Unser Standort')} · {e(liste(o[3][:3]))}</p></div></a>'''
        for o in ORTE)
    cards += '''
          <a href="kontakt.html" class="feature feature--cta reveal"><i data-icon="phone"></i><div><h3>Ihr Ort fehlt?</h3><p>Fragen Sie trotzdem an – bei größeren Projekten kommen wir gern auch weiter raus.</p></div></a>'''
    body = f'''    <section class="page-hero">
      <div class="bg" data-img="img/projekte/hecke-breit.jpg"></div>
      <div class="container">
        <p class="breadcrumb anim-up"><a href="index.html">Startseite</a> / Einsatzgebiet</p>
        <h1 class="anim-up d1">Unser Einsatzgebiet: Köln und Umgebung</h1>
        <p class="lead anim-up d2">Von unserem Standort in Köln sind wir in {len(ORTE)} Städten und Gemeinden rund um Köln für Sie da – vom Bergischen Land bis zum Vorgebirge.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section__head reveal">
          <p class="eyebrow">Einsatzgebiet</p>
          <h2>Hier gestalten und pflegen wir Gärten</h2>
          <p>Wählen Sie Ihren Ort – dort finden Sie unsere Leistungen und Antworten auf häufige Fragen.</p>
        </div>
        <div class="feature-grid feature-grid--3 stagger" style="margin:0">
{cards}
        </div>
      </div>
    </section>
'''
    return HEAD + body + FOOT.format(h='Ihr Garten in Köln und Umgebung')

for o in ORTE:
    open(slug(o[0]), 'w', encoding='utf-8').write(ortsseite(o))
open('einsatzgebiet.html', 'w', encoding='utf-8').write(uebersicht())
# veraltete Stadtseiten (Ort aus der Liste entfernt) löschen
for f in os.listdir('.'):
    if f.startswith('gartenbau-') and f.endswith('.html') and f not in {slug(o[0]) for o in ORTE}:
        os.remove(f)
print(f'{len(ORTE)} Stadtseiten + einsatzgebiet.html erzeugt')
